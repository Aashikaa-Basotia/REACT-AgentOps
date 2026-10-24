"""
Reservation service — atomic stock commitment with full verification.

This is the only module that can commit stock. It combines the constraint
verifier with the inventory manager's atomic operations to ensure that
no reservation is created without passing all checks.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from typing import Any

from models.inventory import Reservation, ResourceState
from models.events import EventType
from engine.verifier import ConstraintVerifier, AllocationEntry


@dataclass
class ReservationRequest:
    """A request to reserve stock for an approved plan."""
    supplier_id: str
    hospital_id: str
    route_id: str
    quantity: int
    plan_version: int
    idempotency_key: str
    approved: bool = False           # Must be explicitly approved
    approved_plan_id: str = ""

    def to_dict(self) -> dict[str, Any]:
        return {
            "supplier_id": self.supplier_id,
            "hospital_id": self.hospital_id,
            "route_id": self.route_id,
            "quantity": self.quantity,
            "plan_version": self.plan_version,
            "idempotency_key": self.idempotency_key,
            "approved": self.approved,
            "approved_plan_id": self.approved_plan_id,
        }


@dataclass
class ReservationResult:
    """Result of a reservation attempt."""
    success: bool
    reservation: Reservation | None = None
    idempotent_replay: bool = False
    failure_reasons: list[str] = field(default_factory=list)
    verification_details: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "success": self.success,
            "reservation": self.reservation.to_dict() if self.reservation else None,
            "idempotent_replay": self.idempotent_replay,
            "failure_reasons": self.failure_reasons,
            "verification_details": self.verification_details,
        }


class ReservationService:
    """
    Atomic stock commitment with full constraint verification.

    Every reservation must:
    1. Pass all constraint checks (stock, route, deadline, version, evidence)
    2. Be approved by the human coordinator (or auto-approved for baselines)
    3. Use an idempotency key to prevent double-booking on retry

    This service logs every attempt (success or failure) for evaluation.
    """

    def __init__(self, engine, auto_approve: bool = False):
        from engine.simulator import SimulationEngine
        self.engine: SimulationEngine = engine
        self.verifier = ConstraintVerifier(engine)

        # Track approval state
        self._approved_plans: dict[str, dict[str, Any]] = {}  # plan_id -> plan details
        self._auto_approve: bool = auto_approve  # For baselines / unit tests
        self.staged_plan: dict[str, Any] | None = None

    def set_auto_approve(self, enabled: bool) -> None:
        """Enable auto-approval (for fixed-rules baseline testing)."""
        self._auto_approve = enabled

    def stage_plan(self, plan_data: dict[str, Any]) -> None:
        """Stage a verified allocation plan awaiting human coordinator review."""
        self.staged_plan = plan_data

    def clear_staged_plan(self) -> None:
        """Clear currently staged plan."""
        self.staged_plan = None

    def get_staged_plan(self) -> dict[str, Any] | None:
        """Retrieve currently staged plan awaiting human approval."""
        return self.staged_plan

    def approve_plan(self, plan_id: str, allocations: list[AllocationEntry],
                     plan_version: int) -> bool:
        """
        Human coordinator approves a specific plan version.
        Returns True if the plan is still valid at approval time.
        """
        # Re-verify at approval time with ConstraintVerifier
        result = self.verifier.verify_allocation(allocations)

        # Explicit stock version check for optimistic concurrency locking
        version_ok = True
        for a in allocations:
            stock = self.engine.inventory.get_supplier_stock(a.supplier_id)
            if a.plan_version != stock.stock_version:
                version_ok = False
                break

        passed = result.passed and version_ok

        self._approved_plans[plan_id] = {
            "allocations": [a.to_dict() for a in allocations],
            "plan_version": plan_version,
            "approved_at": self.engine.clock,
            "valid_at_approval": passed,
        }

        self.engine.event_log.record(
            timestamp=self.engine.clock,
            event_type=EventType.HUMAN_APPROVAL if passed else EventType.HUMAN_REJECTION,
            actor="human_coordinator",
            description=(f"Plan {plan_id} approved" if passed
                         else f"Plan {plan_id} rejected at approval check: {result.failure_reasons if not result.passed else 'Stock version mismatch'}"),
            details={"plan_id": plan_id, "valid": passed,
                      "allocations": [a.to_dict() for a in allocations]},
        )

        return passed

    def is_plan_approved(self, plan_id: str) -> bool:
        """Check if a plan has been approved."""
        if self._auto_approve:
            return True
        return (plan_id in self._approved_plans
                and self._approved_plans[plan_id]["valid_at_approval"])

    def reserve(self, request: ReservationRequest) -> ReservationResult:
        """
        Attempt to reserve stock atomically.

        This is the ONLY way to commit stock in the system.
        """
        # Check idempotency first
        existing = self.engine.inventory.find_by_idempotency_key(request.idempotency_key)
        if existing is not None:
            self.engine.event_log.record(
                timestamp=self.engine.clock,
                event_type=EventType.RESERVATION_CREATED,
                actor="reservation_service",
                description=f"Idempotent replay: {existing.id}",
                details={"reservation_id": existing.id, "idempotent": True},
            )
            return ReservationResult(
                success=True,
                reservation=existing,
                idempotent_replay=True,
            )

        # Check approval
        if not self._auto_approve and not request.approved:
            self.engine.event_log.record(
                timestamp=self.engine.clock,
                event_type=EventType.RESERVATION_REJECTED,
                actor="reservation_service",
                description="Reservation rejected: not approved",
                details=request.to_dict(),
            )
            return ReservationResult(
                success=False,
                failure_reasons=["Plan not approved by human coordinator"],
            )

        # Full constraint verification
        verification = self.verifier.verify_delivery(
            supplier_id=request.supplier_id,
            hospital_id=request.hospital_id,
            route_id=request.route_id,
            quantity=request.quantity,
            plan_version=request.plan_version,
            idempotency_key=request.idempotency_key,
        )

        self.engine.event_log.record(
            timestamp=self.engine.clock,
            event_type=(EventType.CONSTRAINT_PASSED if verification.passed
                        else EventType.CONSTRAINT_FAILED),
            actor="constraint_verifier",
            description=(f"Verification {'passed' if verification.passed else 'FAILED'}: "
                         f"{verification.proposal_summary}"),
            details=verification.to_dict(),
            related_entities=[request.supplier_id, request.hospital_id],
        )

        if not verification.passed:
            self.engine.event_log.record(
                timestamp=self.engine.clock,
                event_type=EventType.RESERVATION_REJECTED,
                actor="reservation_service",
                description=f"Reservation rejected: {verification.failure_reasons}",
                details={**request.to_dict(), "checks": verification.to_dict()},
                related_entities=[request.supplier_id, request.hospital_id],
            )
            return ReservationResult(
                success=False,
                failure_reasons=verification.failure_reasons,
                verification_details=verification.to_dict(),
            )

        # Attempt atomic reservation
        try:
            expected_arrival = self.engine.compute_arrival(request.route_id)

            reservation = self.engine.inventory.create_reservation(
                supplier_id=request.supplier_id,
                hospital_id=request.hospital_id,
                route_id=request.route_id,
                quantity=request.quantity,
                plan_version=request.plan_version,
                idempotency_key=request.idempotency_key,
                clock=self.engine.clock,
                expected_arrival=expected_arrival,
            )

            self.engine.event_log.record(
                timestamp=self.engine.clock,
                event_type=EventType.RESERVATION_CREATED,
                actor="reservation_service",
                description=f"Reserved {request.quantity} batches "
                            f"{request.supplier_id}→{request.hospital_id} "
                            f"via {request.route_id} (ETA: t={expected_arrival})",
                details=reservation.to_dict(),
                related_entities=[request.supplier_id, request.hospital_id,
                                  request.route_id],
            )

            return ReservationResult(
                success=True,
                reservation=reservation,
                verification_details=verification.to_dict(),
            )

        except ValueError as e:
            # Race condition or concurrent modification
            self.engine.event_log.record(
                timestamp=self.engine.clock,
                event_type=EventType.RESERVATION_REJECTED,
                actor="reservation_service",
                description=f"Reservation failed atomically: {e}",
                details={**request.to_dict(), "error": str(e)},
                related_entities=[request.supplier_id, request.hospital_id],
            )
            return ReservationResult(
                success=False,
                failure_reasons=[str(e)],
            )

    def reserve_allocation(
        self,
        plan_id: str,
        allocations: list[AllocationEntry],
    ) -> list[ReservationResult]:
        """
        Reserve all deliveries in an allocation plan.

        If ANY reservation fails, previously successful ones in this batch
        are cancelled (all-or-nothing for the plan).
        """
        results: list[ReservationResult] = []
        created_reservation_ids: list[str] = []

        for i, alloc in enumerate(allocations):
            request = ReservationRequest(
                supplier_id=alloc.supplier_id,
                hospital_id=alloc.hospital_id,
                route_id=alloc.route_id,
                quantity=alloc.quantity,
                plan_version=alloc.plan_version,
                idempotency_key=f"{plan_id}_alloc_{i}_{alloc.supplier_id}_{alloc.hospital_id}_{alloc.route_id}_{alloc.quantity}",
                approved=self.is_plan_approved(plan_id),
                approved_plan_id=plan_id,
            )

            result = self.reserve(request)
            results.append(result)

            if result.success and result.reservation:
                created_reservation_ids.append(result.reservation.id)
            elif not result.success:
                # Rollback all previous reservations in this batch
                for rid in created_reservation_ids:
                    self.engine.inventory.cancel_reservation(
                        rid, reason=f"Rolled back: later allocation in plan {plan_id} failed"
                    )
                    self.engine.event_log.record(
                        timestamp=self.engine.clock,
                        event_type=EventType.RESERVATION_CANCELLED,
                        actor="reservation_service",
                        description=f"Reservation {rid} rolled back "
                                    f"(plan {plan_id} partial failure)",
                        related_entities=[rid],
                    )
                break  # Stop processing further allocations

        return results
