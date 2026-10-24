"""
Typed Tool Gateway and Tool Registry for REACT agents.

Exposes operations:
- read_facility_state
- read_supplier_stock
- request_supplier_clarification
- check_route
- check_delivery_proposal
- propose_allocation
- reserve_approved_plan
- write_debrief

All approaches (fixed rules, single agent, multi-agent) call these tools
through the ToolGateway.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from typing import Any, Callable, Literal

from models.scenario import RouteStatus
from models.inventory import ResourceState
from models.evidence import EvidenceType, VerificationState
from models.events import EventType
from engine.simulator import SimulationEngine
from engine.verifier import ConstraintVerifier, AllocationEntry
from engine.reservation import ReservationService, ReservationRequest


@dataclass
class AgentIdentity:
    """Identity and role of the calling entity."""
    actor_id: str                    # e.g., "facility_agent_H1", "supply_agent", "supervisor"
    role: str                        # "facility", "supply", "supervisor", "single_agent", "system"
    allowed_tools: list[str] = field(default_factory=list)


@dataclass
class ToolResult:
    """Standardized tool execution output."""
    tool_name: str
    success: bool
    data: Any = None
    error: str | None = None
    details: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "tool_name": self.tool_name,
            "success": self.success,
            "data": self.data,
            "error": self.error,
            "details": self.details,
        }


@dataclass
class ToolSpec:
    name: str
    description: str
    parameters: dict[str, Any]       # JSON schema parameters
    permission: Literal["read", "write"]
    requires_approval: bool = False


class ToolGateway:
    """
    Validates permissions, schemas, records audit events,
    and executes tool requests against SimulationEngine & ReservationService.
    """

    def __init__(self, engine: SimulationEngine, reservation_service: ReservationService):
        self.engine = engine
        self.reservation_service = reservation_service
        self.verifier = ConstraintVerifier(engine)
        self._tool_specs: dict[str, ToolSpec] = {}
        self._handlers: dict[str, Callable[[AgentIdentity, dict[str, Any]], ToolResult]] = {}
        self._register_default_tools()

    def get_tool_specs(self) -> list[dict[str, Any]]:
        """Return tool definitions in OpenAI Function Calling format."""
        specs = []
        for name, spec in self._tool_specs.items():
            specs.append({
                "type": "function",
                "function": {
                    "name": spec.name,
                    "description": spec.description,
                    "parameters": spec.parameters,
                }
            })
        return specs

    def get_gemini_tool_declarations(self) -> list[dict[str, Any]]:
        """Return tool definitions in Google Gemini Function Declaration format."""
        declarations = []
        for name, spec in self._tool_specs.items():
            declarations.append({
                "name": spec.name,
                "description": spec.description,
                "parameters": spec.parameters,
            })
        return declarations

    def _register_tool(self, spec: ToolSpec, handler: Callable[[AgentIdentity, dict[str, Any]], ToolResult]):
        self._tool_specs[spec.name] = spec
        self._handlers[spec.name] = handler

    def _register_default_tools(self):
        # 1. read_facility_state
        self._register_tool(
            ToolSpec(
                name="read_facility_state",
                description="Get current hospital stock, requested batches, and replenishment deadline.",
                parameters={
                    "type": "object",
                    "properties": {
                        "hospital_id": {"type": "string", "description": "ID of hospital, e.g. H1, H2, H3"}
                    },
                    "required": ["hospital_id"]
                },
                permission="read"
            ),
            self._handle_read_facility_state
        )

        # 2. read_supplier_stock
        self._register_tool(
            ToolSpec(
                name="read_supplier_stock",
                description="Get a supplier's total confirmed stock, current available stock, and stock version.",
                parameters={
                    "type": "object",
                    "properties": {
                        "supplier_id": {"type": "string", "description": "ID of supplier, e.g. S1, S2"}
                    },
                    "required": ["supplier_id"]
                },
                permission="read"
            ),
            self._handle_read_supplier_stock
        )

        # 3. request_supplier_clarification
        self._register_tool(
            ToolSpec(
                name="request_supplier_clarification",
                description="Ask the supplier a specific question to clarify ambiguous availability or delivery details.",
                parameters={
                    "type": "object",
                    "properties": {
                        "supplier_id": {"type": "string", "description": "Supplier ID, e.g. S2"},
                        "question": {"type": "string", "description": "Clarifying question to send"}
                    },
                    "required": ["supplier_id", "question"]
                },
                permission="read"
            ),
            self._handle_request_supplier_clarification
        )

        # 4. check_route
        self._register_tool(
            ToolSpec(
                name="check_route",
                description="Check delivery route operational status, travel time, delay, and capacity.",
                parameters={
                    "type": "object",
                    "properties": {
                        "route_id": {"type": "string", "description": "Route ID, e.g. R_S1_H1, R_S2_H2"}
                    },
                    "required": ["route_id"]
                },
                permission="read"
            ),
            self._handle_check_route
        )

        # 5. check_delivery_proposal
        self._register_tool(
            ToolSpec(
                name="check_delivery_proposal",
                description="Validate a candidate single delivery against deterministic constraints before proposing.",
                parameters={
                    "type": "object",
                    "properties": {
                        "supplier_id": {"type": "string"},
                        "hospital_id": {"type": "string"},
                        "route_id": {"type": "string"},
                        "quantity": {"type": "integer"},
                        "plan_version": {"type": "integer"}
                    },
                    "required": ["supplier_id", "hospital_id", "route_id", "quantity", "plan_version"]
                },
                permission="read"
            ),
            self._handle_check_delivery_proposal
        )

        # 6. propose_allocation
        self._register_tool(
            ToolSpec(
                name="propose_allocation",
                description="Submit a multi-facility allocation plan for collective verification.",
                parameters={
                    "type": "object",
                    "properties": {
                        "allocations": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "supplier_id": {"type": "string"},
                                    "hospital_id": {"type": "string"},
                                    "route_id": {"type": "string"},
                                    "quantity": {"type": "integer"},
                                    "plan_version": {"type": "integer"}
                                },
                                "required": ["supplier_id", "hospital_id", "route_id", "quantity", "plan_version"]
                            }
                        }
                    },
                    "required": ["allocations"]
                },
                permission="read"
            ),
            self._handle_propose_allocation
        )

        # 7. reserve_approved_plan
        self._register_tool(
            ToolSpec(
                name="reserve_approved_plan",
                description="Commit atomic reservations for a verified plan that has human coordinator approval.",
                parameters={
                    "type": "object",
                    "properties": {
                        "plan_id": {"type": "string"},
                        "allocations": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "supplier_id": {"type": "string"},
                                    "hospital_id": {"type": "string"},
                                    "route_id": {"type": "string"},
                                    "quantity": {"type": "integer"},
                                    "plan_version": {"type": "integer"}
                                },
                                "required": ["supplier_id", "hospital_id", "route_id", "quantity", "plan_version"]
                            }
                        }
                    },
                    "required": ["plan_id", "allocations"]
                },
                permission="write",
                requires_approval=True
            ),
            self._handle_reserve_approved_plan
        )

        # 8. write_debrief
        self._register_tool(
            ToolSpec(
                name="write_debrief",
                description="Generate exercise debrief linking failed assumptions, unmet demand, and assigned tasks.",
                parameters={
                    "type": "object",
                    "properties": {
                        "failed_assumptions": {"type": "array", "items": {"type": "string"}},
                        "unmet_batches": {"type": "integer"},
                        "action_items": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "task": {"type": "string"},
                                    "owner": {"type": "string"}
                                },
                                "required": ["task", "owner"]
                            }
                        }
                    },
                    "required": ["failed_assumptions", "unmet_batches", "action_items"]
                },
                permission="write"
            ),
            self._handle_write_debrief
        )

    # ---------- Gateway Dispatcher ----------

    def execute(self, identity: AgentIdentity, tool_name: str, params: dict[str, Any]) -> ToolResult:
        """Enforce access control, audit logging, and execute tool handler."""
        # 1. Tool existence
        if tool_name not in self._handlers:
            return ToolResult(tool_name=tool_name, success=False, error=f"Unknown tool: {tool_name}")

        spec = self._tool_specs[tool_name]

        # 2. RBAC Permission Check
        if identity.allowed_tools and tool_name not in identity.allowed_tools:
            self.engine.event_log.record(
                timestamp=self.engine.clock,
                event_type=EventType.AGENT_ERROR,
                actor=identity.actor_id,
                description=f"Permission denied: {identity.actor_id} ({identity.role}) cannot call {tool_name}",
                details={"tool_name": tool_name, "params": params}
            )
            return ToolResult(
                tool_name=tool_name,
                success=False,
                error=f"Permission denied: role '{identity.role}' is not authorized to call '{tool_name}'"
            )

        # 3. Log Call
        self.engine.event_log.record(
            timestamp=self.engine.clock,
            event_type=EventType.TOOL_CALLED,
            actor=identity.actor_id,
            description=f"{identity.actor_id} called {tool_name}",
            details={"tool_name": tool_name, "params": params}
        )

        # 4. Execute
        try:
            result = self._handlers[tool_name](identity, params)
        except Exception as e:
            result = ToolResult(tool_name=tool_name, success=False, error=str(e))

        # 5. Log Result
        self.engine.event_log.record(
            timestamp=self.engine.clock,
            event_type=EventType.TOOL_RESULT,
            actor=identity.actor_id,
            description=f"Result from {tool_name}: {'SUCCESS' if result.success else 'FAILED'}",
            details=result.to_dict()
        )

        return result

    # ---------- Tool Handlers ----------

    def _handle_read_facility_state(self, identity: AgentIdentity, params: dict[str, Any]) -> ToolResult:
        hid = params.get("hospital_id", "")
        # Facility agents can only read their own hospital
        if identity.role == "facility" and identity.actor_id != f"facility_{hid}":
            return ToolResult(
                tool_name="read_facility_state",
                success=False,
                error=f"Facility isolation: {identity.actor_id} cannot inspect {hid}"
            )

        try:
            h = self.engine.scenario.get_hospital(hid)
            h_stock = self.engine.inventory.get_hospital_stock(hid)
            reserved = self.engine.inventory.total_reserved_for_hospital(hid)
            unmet = max(0, h.requested_batches - h_stock.on_hand - h_stock.total_received - reserved)

            data = {
                "hospital_id": h.id,
                "name": h.name,
                "requested_batches": h.requested_batches,
                "deadline_minutes": h.deadline_minutes,
                "on_hand_stock": h_stock.on_hand,
                "total_received": h_stock.total_received,
                "reserved_incoming": reserved,
                "unmet_batches": unmet,
            }
            return ToolResult(tool_name="read_facility_state", success=True, data=data)
        except KeyError:
            return ToolResult(tool_name="read_facility_state", success=False, error=f"Hospital {hid} not found")

    def _handle_read_supplier_stock(self, identity: AgentIdentity, params: dict[str, Any]) -> ToolResult:
        sid = params.get("supplier_id", "")
        try:
            s_stock = self.engine.inventory.get_supplier_stock(sid)
            avail = self.engine.inventory.available_stock(sid)
            active_res = self.engine.inventory.active_reservations_for_supplier(sid)

            # Record fresh observation in evidence store
            self.engine.evidence_store.add(
                entity_id=sid,
                entity_type="supplier",
                evidence_type=EvidenceType.STOCK_AVAILABILITY,
                claim=f"Confirmed: {s_stock.confirmed_total}, Available: {avail}, Version: {s_stock.stock_version}",
                quantity=avail,
                observed_at=self.engine.clock,
                source=identity.actor_id,
                verification=VerificationState.CONFIRMED,
            )

            data = {
                "supplier_id": sid,
                "confirmed_total": s_stock.confirmed_total,
                "available_stock": avail,
                "stock_version": s_stock.stock_version,
                "active_reservations_count": len(active_res),
            }
            return ToolResult(tool_name="read_supplier_stock", success=True, data=data)
        except KeyError:
            return ToolResult(tool_name="read_supplier_stock", success=False, error=f"Supplier {sid} not found")

    def _handle_request_supplier_clarification(self, identity: AgentIdentity, params: dict[str, Any]) -> ToolResult:
        sid = params.get("supplier_id", "")
        question = params.get("question", "")

        resp = self.engine.get_supplier_response(sid, question)

        # Update evidence store
        ev = self.engine.evidence_store.add(
            entity_id=sid,
            entity_type="supplier",
            evidence_type=EvidenceType.STOCK_AVAILABILITY if resp.get("quantity") is not None else EvidenceType.CLARIFICATION,
            claim=resp["text"],
            quantity=resp.get("quantity"),
            observed_at=self.engine.clock,
            source=f"clarification_{identity.actor_id}",
            verification=VerificationState.CONFIRMED if not resp.get("is_ambiguous") else VerificationState.UNVERIFIED,
            raw_message=resp["text"],
            metadata={"question": question, "clarifies": resp.get("clarifies")}
        )

        data = {
            "supplier_id": sid,
            "response_text": resp["text"],
            "clarified_quantity": resp.get("quantity"),
            "arrival_minutes": resp.get("arrival_minutes"),
            "clarification_point": resp.get("clarifies"),
            "is_ambiguous": resp.get("is_ambiguous"),
            "evidence_id": ev.id,
        }
        return ToolResult(tool_name="request_supplier_clarification", success=True, data=data)

    def _handle_check_route(self, identity: AgentIdentity, params: dict[str, Any]) -> ToolResult:
        rid = params.get("route_id", "")
        try:
            route = self.engine.get_route(rid)
            data = {
                "route_id": route.id,
                "supplier_id": route.supplier_id,
                "hospital_id": route.hospital_id,
                "status": route.status.value,
                "base_travel_minutes": route.travel_minutes,
                "delay_minutes": route.delay_minutes,
                "effective_travel_time": route.effective_travel_time,
                "capacity_batches": route.capacity_batches,
                "expected_arrival_if_dispatched_now": self.engine.compute_arrival(rid),
            }
            return ToolResult(tool_name="check_route", success=True, data=data)
        except KeyError:
            return ToolResult(tool_name="check_route", success=False, error=f"Route {rid} not found")

    def _handle_check_delivery_proposal(self, identity: AgentIdentity, params: dict[str, Any]) -> ToolResult:
        res = self.verifier.verify_delivery(
            supplier_id=params["supplier_id"],
            hospital_id=params["hospital_id"],
            route_id=params["route_id"],
            quantity=params["quantity"],
            plan_version=params["plan_version"],
        )
        return ToolResult(
            tool_name="check_delivery_proposal",
            success=res.passed,
            data=res.to_dict(),
            error=None if res.passed else "; ".join(res.failure_reasons)
        )

    def _handle_propose_allocation(self, identity: AgentIdentity, params: dict[str, Any]) -> ToolResult:
        raw_allocs = params.get("allocations", [])
        allocs = [AllocationEntry(**a) for a in raw_allocs]
        res = self.verifier.verify_allocation(allocs)
        return ToolResult(
            tool_name="propose_allocation",
            success=res.passed,
            data=res.to_dict(),
            error=None if res.passed else "; ".join(res.failure_reasons)
        )

    def _handle_reserve_approved_plan(self, identity: AgentIdentity, params: dict[str, Any]) -> ToolResult:
        plan_id = params.get("plan_id", str(uuid.uuid4().hex[:8]))
        raw_allocs = params.get("allocations", [])
        allocs = [AllocationEntry(**a) for a in raw_allocs]

        results = self.reservation_service.reserve_allocation(plan_id, allocs)
        all_ok = all(r.success for r in results)

        return ToolResult(
            tool_name="reserve_approved_plan",
            success=all_ok,
            data={"plan_id": plan_id, "reservation_results": [r.to_dict() for r in results]},
            error=None if all_ok else "One or more reservations failed; batch rolled back."
        )

    def _handle_write_debrief(self, identity: AgentIdentity, params: dict[str, Any]) -> ToolResult:
        data = {
            "timestamp": self.engine.clock,
            "scenario_id": self.engine.scenario.id,
            "failed_assumptions": params.get("failed_assumptions", []),
            "unmet_batches": params.get("unmet_batches", 0),
            "action_items": params.get("action_items", []),
            "reservations_summary": [
                r.to_dict() for r in self.engine.inventory.reservations.values()
            ]
        }
        self.engine.event_log.record(
            timestamp=self.engine.clock,
            event_type=EventType.DEBRIEF_GENERATED,
            actor=identity.actor_id,
            description=f"Debrief filed by {identity.actor_id} (Unmet: {params.get('unmet_batches', 0)} batches)",
            details=data
        )
        return ToolResult(tool_name="write_debrief", success=True, data=data)
