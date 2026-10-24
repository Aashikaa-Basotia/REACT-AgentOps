"""
Constraint verifier — deterministic validation independent of any LLM.

This is the shared safety net across all three approaches (fixed rules,
single agent, multi-agent). It checks:
  1. Stock sufficiency (available ≥ requested)
  2. Deadline feasibility (arrival ≤ deadline)
  3. Version match (plan references current stock version)
  4. Idempotency (no duplicate reservations)
  5. Evidence freshness (evidence not expired)
  6. Route availability (route not blocked)
  7. Capacity limits (quantity ≤ route capacity)
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from models.scenario import RouteStatus
from models.evidence import EvidenceType


@dataclass
class Check:
    """Result of a single constraint check."""
    name: str
    passed: bool
    message: str
    details: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "name": self.name,
            "passed": self.passed,
            "message": self.message,
            "details": self.details,
        }


@dataclass
class VerificationResult:
    """Result of verifying a complete proposal or reservation."""
    passed: bool
    checks: list[Check]
    proposal_summary: str = ""

    @property
    def failed_checks(self) -> list[Check]:
        return [c for c in self.checks if not c.passed]

    @property
    def failure_reasons(self) -> list[str]:
        return [c.message for c in self.checks if not c.passed]

    def to_dict(self) -> dict[str, Any]:
        return {
            "passed": self.passed,
            "checks": [c.to_dict() for c in self.checks],
            "proposal_summary": self.proposal_summary,
            "failed_checks": [c.to_dict() for c in self.failed_checks],
        }


@dataclass
class AllocationEntry:
    """A single proposed delivery in an allocation plan."""
    supplier_id: str
    hospital_id: str
    route_id: str
    quantity: int
    plan_version: int                # Stock version this plan was built against

    def to_dict(self) -> dict[str, Any]:
        return {
            "supplier_id": self.supplier_id,
            "hospital_id": self.hospital_id,
            "route_id": self.route_id,
            "quantity": self.quantity,
            "plan_version": self.plan_version,
        }


class ConstraintVerifier:
    """
    Deterministic constraint checker. No LLM. Shared by ALL approaches.

    This verifier operates on the current simulation state and validates
    proposals before any stock is committed.
    """

    def __init__(self, engine):
        from engine.simulator import SimulationEngine
        self.engine: SimulationEngine = engine

    # ---------- Single Delivery Verification ----------

    def verify_delivery(
        self,
        supplier_id: str,
        hospital_id: str,
        route_id: str,
        quantity: int,
        plan_version: int,
        idempotency_key: str | None = None,
    ) -> VerificationResult:
        """
        Verify a single proposed delivery against all constraints.

        This is the core verification used by the reservation service.
        """
        checks: list[Check] = []

        # 1. Stock sufficiency: As = Qs - Σ(active reservations) ≥ requested
        available = self.engine.inventory.available_stock(supplier_id)
        checks.append(Check(
            name="stock_sufficient",
            passed=available >= quantity,
            message=(f"Available: {available}, Requested: {quantity}"
                     if available >= quantity
                     else f"INSUFFICIENT: only {available} available, {quantity} requested"),
            details={"available": available, "requested": quantity},
        ))

        # 2. Route availability: not blocked
        try:
            route = self.engine.get_route(route_id)
            route_val = route.status.value if hasattr(route.status, "value") else str(route.status)
            route_open = (route.status != RouteStatus.BLOCKED and route_val != "blocked")
            checks.append(Check(
                name="route_available",
                passed=route_open,
                message=(f"Route {route_id}: {route_val}"
                         if route_open
                         else f"Route {route_id} is BLOCKED"),
                details={"route_status": route_val},
            ))
        except KeyError:
            checks.append(Check(
                name="route_available",
                passed=False,
                message=f"Route {route_id} not found",
            ))
            # Cannot compute further route-dependent checks
            return VerificationResult(
                passed=False,
                checks=checks,
                proposal_summary=f"{quantity} batches {supplier_id}→{hospital_id} via {route_id}",
            )

        # 3. Capacity: quantity ≤ route capacity
        checks.append(Check(
            name="within_capacity",
            passed=quantity <= route.capacity_batches,
            message=(f"Quantity {quantity} ≤ route capacity {route.capacity_batches}"
                     if quantity <= route.capacity_batches
                     else f"EXCEEDS capacity: {quantity} > {route.capacity_batches}"),
            details={"quantity": quantity, "capacity": route.capacity_batches},
        ))

        # 4. Deadline feasibility: arrival ≤ hospital deadline
        arrival = self.engine.compute_arrival(route_id)
        hospital = self.engine.scenario.get_hospital(hospital_id)
        deadline = hospital.deadline_minutes
        checks.append(Check(
            name="deadline_met",
            passed=arrival <= deadline,
            message=(f"Arrival {arrival} ≤ deadline {deadline}"
                     if arrival <= deadline
                     else f"LATE: arrival {arrival} > deadline {deadline}"),
            details={"arrival": arrival, "deadline": deadline,
                      "margin": deadline - arrival},
        ))

        # 5. Version match: plan version matches current supplier stock version
        stock = self.engine.inventory.get_supplier_stock(supplier_id)
        checks.append(Check(
            name="version_current",
            passed=plan_version == stock.stock_version,
            message=(f"Plan version v{plan_version} matches current v{stock.stock_version}"
                     if plan_version == stock.stock_version
                     else f"VERSION MISMATCH: plan v{plan_version}, current v{stock.stock_version}"),
            details={"plan_version": plan_version,
                      "current_version": stock.stock_version},
        ))

        # 6. Evidence freshness: latest supplier evidence is usable
        evidence = self.engine.evidence_store.latest_for(
            supplier_id, EvidenceType.STOCK_AVAILABILITY
        )
        if evidence is not None:
            fresh = evidence.is_usable(self.engine.clock)
            age = self.engine.clock - evidence.observed_at
            checks.append(Check(
                name="evidence_fresh",
                passed=fresh,
                message=(f"Evidence age: {age} min (within {evidence.freshness_window} min window)"
                         if fresh
                         else f"STALE: evidence is {age} min old "
                              f"(window: {evidence.freshness_window} min)"),
                details={"evidence_id": evidence.id, "age_minutes": age,
                          "freshness_window": evidence.freshness_window},
            ))
        else:
            checks.append(Check(
                name="evidence_fresh",
                passed=False,
                message=f"No evidence found for supplier {supplier_id}",
            ))

        # 7. Idempotency check
        if idempotency_key is not None:
            existing = self.engine.inventory.find_by_idempotency_key(idempotency_key)
            checks.append(Check(
                name="not_duplicate",
                passed=existing is None,
                message=("Unique request"
                         if existing is None
                         else f"DUPLICATE: matches existing reservation {existing.id}"),
                details={"existing_reservation": existing.id if existing else None},
            ))

        all_passed = all(c.passed for c in checks)
        return VerificationResult(
            passed=all_passed,
            checks=checks,
            proposal_summary=f"{quantity} batches {supplier_id}→{hospital_id} via {route_id}",
        )

    # ---------- Full Allocation Verification ----------

    def verify_allocation(self, allocations: list[AllocationEntry]) -> VerificationResult:
        """
        Verify a complete allocation plan (multiple deliveries).

        This checks individual deliveries AND cross-delivery constraints
        like aggregate stock sufficiency per supplier.
        """
        all_checks: list[Check] = []

        # Individual delivery checks
        for i, alloc in enumerate(allocations):
            result = self.verify_delivery(
                supplier_id=alloc.supplier_id,
                hospital_id=alloc.hospital_id,
                route_id=alloc.route_id,
                quantity=alloc.quantity,
                plan_version=alloc.plan_version,
            )
            for check in result.checks:
                check.name = f"alloc_{i}_{alloc.supplier_id}_{alloc.hospital_id}.{check.name}"
                all_checks.append(check)

        # Cross-allocation aggregate check: total per supplier ≤ available
        supplier_totals: dict[str, int] = {}
        for alloc in allocations:
            supplier_totals[alloc.supplier_id] = (
                supplier_totals.get(alloc.supplier_id, 0) + alloc.quantity
            )

        # Aggregate constraint checks (hard invariant: cannot overcommit supplier available stock)
        for sid, total_requested in supplier_totals.items():
            available = self.engine.inventory.available_stock(sid)
            all_checks.append(Check(
                name=f"aggregate_{sid}_sufficient",
                passed=total_requested <= available,
                message=(
                    f"Supplier {sid}: total requested {total_requested} ≤ available {available}"
                    if total_requested <= available
                    else f"AGGREGATE OVERCOMMIT: supplier {sid} requested {total_requested}, "
                         f"available {available}"
                ),
                details={"supplier_id": sid, "total_requested": total_requested,
                          "available": available},
            ))

        # Demand reporting: informational status on unmet needs
        hospital_allocated: dict[str, int] = {}
        for alloc in allocations:
            hospital_allocated[alloc.hospital_id] = (
                hospital_allocated.get(alloc.hospital_id, 0) + alloc.quantity
            )

        for h in self.engine.scenario.hospitals:
            allocated = hospital_allocated.get(h.id, 0)
            already_reserved = self.engine.inventory.total_reserved_for_hospital(h.id)
            total = allocated + already_reserved
            needed = h.requested_batches
            # Informational check: unmet demand does NOT invalidate a partial contingency proposal!
            all_checks.append(Check(
                name=f"demand_{h.id}_summary",
                passed=True,
                message=(
                    f"Hospital {h.id}: allocated {allocated} + reserved {already_reserved} "
                    f"= {total} (needed {needed})"
                ),
                details={"hospital_id": h.id, "allocated": allocated,
                          "already_reserved": already_reserved,
                          "total": total, "needed": needed,
                          "gap": max(0, needed - total)},
            ))

        all_passed = all(c.passed for c in all_checks)
        summary_parts = [f"{a.quantity}×{a.supplier_id}→{a.hospital_id}" for a in allocations]
        return VerificationResult(
            passed=all_passed,
            checks=all_checks,
            proposal_summary=" | ".join(summary_parts),
        )

    # ---------- Feasibility Analysis ----------

    def assess_feasibility(self) -> dict[str, Any]:
        """
        Quick feasibility check: can demand possibly be met with current supply and routes?
        Returns a summary of supply, demand, and gaps.
        """
        total_demand = self.engine.scenario.total_demand
        total_supply = sum(
            self.engine.inventory.available_stock(s.id)
            for s in self.engine.scenario.suppliers
        )

        # Check reachability: which hospitals can receive from which suppliers?
        reachable: dict[str, list[str]] = {}
        for h in self.engine.scenario.hospitals:
            reachable[h.id] = []
            for s in self.engine.scenario.suppliers:
                open_routes = self.engine.get_open_routes_between(s.id, h.id)
                for route in open_routes:
                    arrival = self.engine.compute_arrival(route.id)
                    if arrival <= h.deadline_minutes:
                        reachable[h.id].append(s.id)
                        break

        unreachable = [
            h.id for h in self.engine.scenario.hospitals
            if not reachable[h.id]
        ]

        return {
            "total_demand": total_demand,
            "total_available_supply": total_supply,
            "aggregate_feasible": total_supply >= total_demand,
            "reachable_suppliers": reachable,
            "unreachable_hospitals": unreachable,
            "any_unreachable": len(unreachable) > 0,
        }
