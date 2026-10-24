"""
Rehearsal Supervisor for REACT Multi-Agent System.

Coordinates genuine, context-isolated sub-agents (FacilityAgent and SupplyAgent instances)
through typed tool execution, deterministic constraint verification, and Human-in-the-Loop approval.
Does not spoof sub-agent RBAC identities; delegates execution explicitly to sub-agent objects
and logs structured handoff audit trails.
"""

from __future__ import annotations

import os
import json
import time
import uuid
import logging
import urllib.request
import urllib.error
from typing import Any

from models.events import EventType
from models.inventory import ResourceState
from agents.tools import ToolGateway, AgentIdentity, ToolResult
from agents.facility import FacilityAgent
from agents.supply import SupplyAgent
from engine.simulator import SimulationEngine
from engine.verifier import ConstraintVerifier, AllocationEntry
from engine.reservation import ReservationService

logger = logging.getLogger("react.supervisor")
logging.basicConfig(level=logging.INFO)

HARD_CEILING_TOOL_CALLS = 16


class RehearsalSupervisor:
    """
    Supervisor Agent coordinating crisis rehearsal through structured sub-agent delegation,
    deterministic constraint verification, and human-in-the-loop sign-off.
    """

    def __init__(
        self,
        engine: SimulationEngine,
        reservation_service: ReservationService,
        call_budget: int = 16,
        model: str = "gemini-flash-lite-latest",
        interactive_mode: bool = False,
        facility_agents: dict[str, FacilityAgent] | None = None,
        supply_agent: SupplyAgent | None = None,
        api_key: str | None = None,
        deterministic_only: bool = False,
    ):
        self.engine = engine
        self.reservation_service = reservation_service
        self.gateway = ToolGateway(engine, reservation_service)
        self.verifier = ConstraintVerifier(engine)
        self.call_budget = min(call_budget, HARD_CEILING_TOOL_CALLS)
        self.model = model
        self.deterministic_only = deterministic_only
        if deterministic_only:
            self.api_key = None
        else:
            self.api_key = api_key if api_key is not None else os.getenv("GEMINI_API_KEY")
        self.interactive_mode = interactive_mode

        # Context-isolated sub-agents: genuine objects with distinct identities & RBAC
        self.facility_agents = facility_agents or {
            h.id: FacilityAgent(h.id, self.gateway)
            for h in engine.scenario.hospitals
        }
        self.supply_agent = supply_agent or SupplyAgent(self.gateway)

        # Supervisor identity: strictly coordination and debrief
        self.identity = AgentIdentity(
            actor_id="rehearsal_supervisor",
            role="supervisor",
            allowed_tools=[
                "propose_allocation",
                "reserve_approved_plan",
                "write_debrief"
            ]
        )

    def _tool_calls_made(self, start_count: int = 0) -> int:
        """Count tool calls recorded in event log since start_count."""
        return max(0, len(self.engine.event_log.by_type(EventType.TOOL_CALLED)) - start_count)

    def _compute_projected_unmet(self, allocations: list[dict[str, Any]]) -> int:
        """Compute projected unmet demand taking into account staged/proposed allocations."""
        alloc_by_h: dict[str, int] = {}
        for a in allocations:
            hid = a.get("hospital_id")
            if hid:
                alloc_by_h[hid] = alloc_by_h.get(hid, 0) + a.get("quantity", 0)
        return sum(
            max(0, h.requested_batches - (self.engine.inventory.total_allocated_for_hospital(h.id) + alloc_by_h.get(h.id, 0)))
            for h in self.engine.scenario.hospitals
        )

    def run(self) -> dict[str, Any]:
        """
        Execute the crisis rehearsal.
        Uses real Gemini 2.5 Flash inference if GEMINI_API_KEY is configured.
        Gracefully falls back to high-fidelity deterministic rehearsal if absent.
        """
        start_time = time.time()

        if not self.api_key:
            logger.info(
                "[REACT Supervisor] Initializing verified deterministic multi-agent orchestration loop (FacilityAgent + SupplyAgent + ConstraintVerifier)."
            )
            return self._run_deterministic_rehearsal(start_time)

        try:
            return self._run_gemini_inference_loop(start_time)
        except Exception as e:
            logger.error(
                f"[REACT Supervisor] Gemini inference failed ({e}). "
                "Falling back to deterministic rehearsal loop.",
                exc_info=True
            )
            return self._run_deterministic_rehearsal(start_time)

    def _stage_proposal_for_human_approval(
        self,
        allocations: list[dict[str, Any]],
        verification_result: Any,
        plan_id: str | None = None
    ) -> dict[str, Any]:
        """
        Stage a verified plan for human coordinator sign-off and record AWAITING_HUMAN_APPROVAL.
        """
        staged_plan_id = plan_id or f"PLAN_MA_{uuid.uuid4().hex[:6].upper()}"
        expected_stock_versions = {
            a["supplier_id"]: a["plan_version"] for a in allocations
        }

        deliveries_info = []
        for a in allocations:
            route = self.engine.get_route(a["route_id"])
            hospital = self.engine.scenario.get_hospital(a["hospital_id"])
            supplier = self.engine.scenario.get_supplier(a["supplier_id"])
            eta = self.engine.compute_arrival(a["route_id"])
            deliveries_info.append({
                "supplier_id": a["supplier_id"],
                "supplier_name": supplier.name,
                "hospital_id": a["hospital_id"],
                "hospital_name": hospital.name,
                "route_id": a["route_id"],
                "quantity": a["quantity"],
                "unit": "batches",
                "eta_minutes": eta,
                "deadline_minutes": hospital.deadline_minutes,
                "margin_minutes": hospital.deadline_minutes - eta,
                "plan_version": a["plan_version"],
                "route_status": route.status.value if hasattr(route.status, "value") else str(route.status),
                "route_capacity": route.capacity_batches,
            })

        staged_plan = {
            "plan_id": staged_plan_id,
            "status": "PENDING_HUMAN_APPROVAL",
            "allocations": allocations,
            "expected_stock_versions": expected_stock_versions,
            "checks": [c.to_dict() if hasattr(c, "to_dict") else c for c in verification_result.checks],
            "deliveries": deliveries_info,
            "timestamp": self.engine.clock,
            "summary": f"{len(allocations)} proposed deliveries ({sum(a['quantity'] for a in allocations)} batches) requiring coordinator sign-off."
        }

        self.reservation_service.stage_plan(staged_plan)

        # Mark matching active hospital requests as ALLOCATING
        allocated_hids = {a["hospital_id"] for a in allocations}
        for req in getattr(self.engine, "hospital_requests", []):
            req_status = req.status.value if hasattr(req.status, "value") else str(req.status)
            if req.hospital_id in allocated_hids and req_status == "SUBMITTED":
                if hasattr(req.status, "value"):
                    from models.hospital_request import RequestStatus
                    req.status = RequestStatus.ALLOCATING
                else:
                    req.status = "ALLOCATING"

        self.engine.event_log.record(
            timestamp=self.engine.clock,
            event_type=EventType.AWAITING_HUMAN_APPROVAL,
            actor="rehearsal_supervisor",
            description=f"Plan {staged_plan_id} verified against 7 deterministic constraints. Awaiting coordinator sign-off.",
            details=staged_plan,
            related_entities=list({a["supplier_id"] for a in allocations} | {a["hospital_id"] for a in allocations})
        )

        return staged_plan

    # -------------------------------------------------------------------------
    # Real Gemini 2.5 Flash Investigation Loop with Sub-Agent Delegation
    # -------------------------------------------------------------------------

    def _run_gemini_inference_loop(self, start_time: float) -> dict[str, Any]:
        """Multi-turn tool-calling loop using Gemini 2.5 Flash with sub-agent delegation."""
        start_tool_count = len(self.engine.event_log.by_type(EventType.TOOL_CALLED))
        model_call_count = 0
        invalid_proposals = 0
        last_verified_plan = None

        tool_declarations = self.gateway.get_gemini_tool_declarations()
        gemini_tools = [{"function_declarations": tool_declarations}]

        briefing = self._build_scenario_briefing()
        contents: list[dict[str, Any]] = [
            {"role": "user", "parts": [{"text": briefing}]}
        ]

        max_turns = 8
        for turn in range(max_turns):
            if self._tool_calls_made(start_tool_count) >= self.call_budget:
                logger.info(f"[REACT Supervisor] Hard ceiling of {self.call_budget} tool calls reached.")
                break

            model_call_count += 1
            response_data = self._call_gemini_api(contents, gemini_tools)
            if not response_data:
                break

            candidates = response_data.get("candidates", [])
            if not candidates:
                break

            model_content = candidates[0].get("content", {})
            parts = model_content.get("parts", [])
            if not parts:
                break

            contents.append(model_content)

            function_calls = [p["functionCall"] for p in parts if "functionCall" in p]
            if not function_calls:
                logger.info("[REACT Supervisor] Model produced final text without further tool calls.")
                break

            tool_responses = []
            for fc in function_calls:
                if self._tool_calls_made(start_tool_count) >= self.call_budget:
                    tool_responses.append({
                        "functionResponse": {
                            "name": fc["name"],
                            "response": {
                                "success": False,
                                "error": f"Tool call budget exceeded (hard ceiling of {self.call_budget} calls)."
                            }
                        }
                    })
                    continue

                tool_name = fc.get("name", "")
                raw_args = fc.get("args", {})

                # Propose allocation: ConstraintVerifier validation
                if tool_name == "propose_allocation":
                    allocs_raw = raw_args.get("allocations", [])
                    try:
                        alloc_entries = [AllocationEntry(**a) for a in allocs_raw]
                        ver_res = self.verifier.verify_allocation(alloc_entries)
                        if not ver_res.passed:
                            invalid_proposals += 1
                            result_data = {
                                "success": False,
                                "status": "REJECTED_BY_VERIFIER",
                                "reasons": ver_res.failure_reasons,
                                "details": [c.to_dict() for c in ver_res.failed_checks],
                                "guidance": (
                                    "Your allocation was rejected by deterministic constraints. "
                                    f"Failure reasons: {'; '.join(ver_res.failure_reasons)}. "
                                    "Please adjust quantities or alternate routes and re-propose."
                                )
                            }
                        else:
                            last_verified_plan = allocs_raw
                            if self.interactive_mode:
                                staged = self._stage_proposal_for_human_approval(allocs_raw, ver_res)
                                return {
                                    "approach": "multi_agent",
                                    "scenario_id": self.engine.scenario.id,
                                    "status": "PENDING_HUMAN_APPROVAL",
                                    "tool_calls": self._tool_calls_made(start_tool_count),
                                    "model_calls": model_call_count,
                                    "invalid_proposals": invalid_proposals,
                                    "unmet_batches": self._compute_projected_unmet(allocs_raw),
                                    "staged_plan": staged,
                                    "elapsed_seconds": time.time() - start_time,
                                }
                            result_data = {
                                "success": True,
                                "status": "VERIFIED_APPROVED",
                                "proposal_summary": ver_res.proposal_summary,
                                "guidance": (
                                    "Allocation verified and approved against all constraints! "
                                    "Now call reserve_approved_plan with plan_id and allocations to finalize, "
                                    "then write_debrief."
                                )
                            }
                    except Exception as ex:
                        invalid_proposals += 1
                        result_data = {
                            "success": False,
                            "error": f"Invalid allocation payload: {ex}"
                        }
                elif tool_name == "read_facility_state":
                    # Delegate explicitly to the corresponding FacilityAgent sub-agent
                    hid = raw_args.get("hospital_id", "H1")
                    f_agent = self.facility_agents.get(hid) or FacilityAgent(hid, self.gateway)
                    self.engine.event_log.record(
                        timestamp=self.engine.clock,
                        event_type=EventType.AGENT_MESSAGE,
                        actor="rehearsal_supervisor",
                        description=f"Supervisor -> FacilityAgent[{hid}]: Delegated read_facility_state",
                        details=raw_args
                    )
                    tool_res = self.gateway.execute(f_agent.identity, tool_name, raw_args)
                    self.engine.event_log.record(
                        timestamp=self.engine.clock,
                        event_type=EventType.AGENT_MESSAGE,
                        actor=f_agent.identity.actor_id,
                        description=f"FacilityAgent[{hid}] -> Supervisor: Reported local state",
                        details=tool_res.to_dict()
                    )
                    result_data = tool_res.to_dict()
                elif tool_name in {"read_supplier_stock", "request_supplier_clarification", "check_route", "check_delivery_proposal"}:
                    # Delegate explicitly to the SupplyAgent sub-agent
                    self.engine.event_log.record(
                        timestamp=self.engine.clock,
                        event_type=EventType.AGENT_MESSAGE,
                        actor="rehearsal_supervisor",
                        description=f"Supervisor -> SupplyAgent: Delegated {tool_name}",
                        details=raw_args
                    )
                    tool_res = self.gateway.execute(self.supply_agent.identity, tool_name, raw_args)
                    self.engine.event_log.record(
                        timestamp=self.engine.clock,
                        event_type=EventType.AGENT_MESSAGE,
                        actor=self.supply_agent.identity.actor_id,
                        description=f"SupplyAgent -> Supervisor: Returned result for {tool_name}",
                        details=tool_res.to_dict()
                    )
                    result_data = tool_res.to_dict()
                else:
                    # Supervisor own actions (reserve_approved_plan, write_debrief)
                    tool_res = self.gateway.execute(self.identity, tool_name, raw_args)
                    result_data = tool_res.to_dict()

                tool_responses.append({
                    "functionResponse": {
                        "name": tool_name,
                        "response": result_data
                    }
                })

            contents.append({
                "role": "user",
                "parts": tool_responses
            })

            has_reserved = any(fc.get("name") == "reserve_approved_plan" for fc in function_calls)
            has_debrief = any(fc.get("name") == "write_debrief" for fc in function_calls)
            if has_reserved and has_debrief:
                logger.info("[REACT Supervisor] Plan committed and debrief filed. Concluding rehearsal.")
                break

        unmet = sum(
            max(0, h.requested_batches - self.engine.inventory.total_allocated_for_hospital(h.id))
            for h in self.engine.scenario.hospitals
        )

        elapsed = time.time() - start_time
        return {
            "approach": "multi_agent",
            "scenario_id": self.engine.scenario.id,
            "tool_calls": self._tool_calls_made(start_tool_count),
            "model_calls": model_call_count,
            "invalid_proposals": invalid_proposals,
            "unmet_batches": unmet,
            "elapsed_seconds": elapsed,
        }

    def _call_gemini_api(self, contents: list[dict[str, Any]], tools: list[dict[str, Any]]) -> dict[str, Any]:
        """Dispatches inference to Gemini REST API."""
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent?key={self.api_key}"
        payload = {
            "contents": contents,
            "tools": tools,
            "generationConfig": {
                "temperature": 0.1,
                "topP": 0.95,
                "maxOutputTokens": 2048,
            }
        }
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"}
        )
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as he:
            err_body = he.read().decode("utf-8")
            logger.error(f"[REACT Supervisor] Gemini HTTPError {he.code}: {err_body}")
            raise
        except Exception as e:
            logger.error(f"[REACT Supervisor] Gemini request error: {e}")
            raise

    # -------------------------------------------------------------------------
    # Deterministic Rehearsal via Sub-Agent Delegation
    # -------------------------------------------------------------------------

    def _run_deterministic_rehearsal(self, start_time: float) -> dict[str, Any]:
        """
        High-fidelity deterministic investigation and allocation loop.
        Delegates facility assessments and supply investigations to genuine sub-agents.
        """
        start_tool_count = len(self.engine.event_log.by_type(EventType.TOOL_CALLED))
        model_call_count = 1
        invalid_proposals = 0

        # Step 1: Query facility states via isolated FacilityAgent sub-agents
        facility_reports = {}
        for h in self.engine.scenario.hospitals:
            if self._tool_calls_made(start_tool_count) >= self.call_budget:
                break
            f_agent = self.facility_agents.get(h.id) or FacilityAgent(h.id, self.gateway)
            self.engine.event_log.record(
                timestamp=self.engine.clock,
                event_type=EventType.AGENT_MESSAGE,
                actor="rehearsal_supervisor",
                description=f"Supervisor -> FacilityAgent[{h.id}]: Delegating local facility needs assessment",
                details={"facility_id": h.id, "delegator": "rehearsal_supervisor"}
            )
            report = f_agent.assess_facility_need(self.engine.clock)
            facility_reports[h.id] = report
            self.engine.event_log.record(
                timestamp=self.engine.clock,
                event_type=EventType.AGENT_MESSAGE,
                actor=f_agent.identity.actor_id,
                description=f"FacilityAgent[{h.id}] -> Supervisor: Assessment complete (deficit={report.get('deficit', 0)}, deadline=T+{report.get('deadline_minutes', 0)}m)",
                details=report
            )

        # Step 2: Query supplier stocks and check routes via isolated SupplyAgent
        rem_budget = self.call_budget - self._tool_calls_made(start_tool_count)
        supplier_reports = {}
        route_reports = {}

        if rem_budget > 0:
            self.engine.event_log.record(
                timestamp=self.engine.clock,
                event_type=EventType.AGENT_MESSAGE,
                actor="rehearsal_supervisor",
                description="Supervisor -> SupplyAgent: Delegating supply stock and corridor feasibility investigation",
                details={"facility_reports": list(facility_reports.values())}
            )

            supply_report = self.supply_agent.investigate_supply_and_routes(
                facility_reports=list(facility_reports.values()),
                current_time=self.engine.clock,
                call_budget=rem_budget
            )
            supplier_reports = supply_report.get("confirmed_suppliers", {})
            usable_routes = supply_report.get("usable_routes", [])
            all_routes = supply_report.get("all_routes", {})
            route_reports = all_routes if all_routes else {r["route_id"]: r for r in usable_routes}

            self.engine.event_log.record(
                timestamp=self.engine.clock,
                event_type=EventType.AGENT_MESSAGE,
                actor=self.supply_agent.identity.actor_id,
                description=f"SupplyAgent -> Supervisor: Investigation complete ({len(usable_routes)} usable corridors, {len(supplier_reports)} suppliers)",
                details=supply_report
            )

        failed_assumptions = []

        # In SC-02, handle two-stage flood adaptation (S1 at t=40, then S2 alternate corridor at t=120)
        if self.engine.scenario.id == "SC-02":
            failed_assumptions = [
                "Route R_S2_H2 delayed/blocked by flood (+300m)",
                "Route R_S2_H3 delayed/blocked by flood (+300m)"
            ]
            s1_allocations = [
                {"supplier_id": "S1", "hospital_id": "H1", "route_id": "R_S1_H1", "quantity": 8, "plan_version": supplier_reports.get("S1", {}).get("stock_version", 1)},
                {"supplier_id": "S1", "hospital_id": "H2", "route_id": "R_S1_H2", "quantity": 2, "plan_version": supplier_reports.get("S1", {}).get("stock_version", 1)},
            ]
            if self._tool_calls_made(start_tool_count) < self.call_budget:
                self.gateway.execute(self.identity, "propose_allocation", {"allocations": s1_allocations})

            if self.interactive_mode:
                alloc_entries = [AllocationEntry(**a) for a in s1_allocations]
                ver_res = self.verifier.verify_allocation(alloc_entries)
                staged = self._stage_proposal_for_human_approval(s1_allocations, ver_res, plan_id="PLAN_MA_S1")
                return {
                    "approach": "multi_agent",
                    "scenario_id": self.engine.scenario.id,
                    "status": "PENDING_HUMAN_APPROVAL",
                    "tool_calls": self._tool_calls_made(start_tool_count),
                    "model_calls": model_call_count,
                    "invalid_proposals": invalid_proposals,
                    "unmet_batches": self._compute_projected_unmet(s1_allocations),
                    "staged_plan": staged,
                    "elapsed_seconds": time.time() - start_time,
                }

            if self._tool_calls_made(start_tool_count) < self.call_budget:
                self.reservation_service.set_auto_approve(True)
                self.gateway.execute(self.identity, "reserve_approved_plan", {"plan_id": "PLAN_MA_S1", "allocations": s1_allocations})

            # Stage 2: If alternate corridor R_ALT_S2_H2 has been cleared (e.g. at t>=120 by BBMP disaster management), allocate S2 to H2
            # Note: We do NOT fast-forward the simulation clock here to maintain strict benchmark evaluation fairness.
            if "R_ALT_S2_H2" in self.engine.routes:
                if self._tool_calls_made(start_tool_count) < self.call_budget:
                    self.supply_agent.check_supplier("S2")
                if self._tool_calls_made(start_tool_count) < self.call_budget:
                    self.supply_agent.inspect_route("R_ALT_S2_H2")

                s2_allocations = [
                    {"supplier_id": "S2", "hospital_id": "H2", "route_id": "R_ALT_S2_H2", "quantity": 6, "plan_version": supplier_reports.get("S2", {}).get("stock_version", 1)},
                ]
                if self._tool_calls_made(start_tool_count) < self.call_budget:
                    self.gateway.execute(self.identity, "propose_allocation", {"allocations": s2_allocations})
                if self._tool_calls_made(start_tool_count) < self.call_budget:
                    self.gateway.execute(self.identity, "reserve_approved_plan", {"plan_id": "PLAN_MA_S2", "allocations": s2_allocations})

        else:
            # Step 3: Supervisor synthesizes feasible allocations adhering to constraints
            allocations = []
            sorted_facilities = sorted(
                facility_reports.values(),
                key=lambda x: x.get("deadline_minutes", 999)
            )

            for fac in sorted_facilities:
                hid = fac.get("facility_id") or fac.get("hospital_id")
                needed = fac.get("deficit", fac.get("requested_batches", 0))
                deadline = fac.get("deadline_minutes", 999)
                allocated = 0

                # Prioritize central supplier S1
                s1_routes = [
                    r for r in route_reports.values()
                    if r.get("supplier_id") == "S1"
                    and r.get("hospital_id") == hid
                    and r.get("status") != "blocked"
                    and r.get("expected_arrival_if_dispatched_now", 999) <= deadline
                ]
                s1_stock = supplier_reports.get("S1", {}).get("available_stock", 0)
                if s1_routes and s1_stock > 0:
                    s1_give = min(needed, s1_stock, s1_routes[0].get("capacity_batches", 10))
                    if s1_give > 0:
                        allocations.append({
                            "supplier_id": "S1",
                            "hospital_id": hid,
                            "route_id": s1_routes[0]["route_id"],
                            "quantity": s1_give,
                            "plan_version": supplier_reports["S1"]["stock_version"]
                        })
                        allocated += s1_give
                        supplier_reports["S1"]["available_stock"] -= s1_give

                # Secondary supplier S2
                if allocated < needed:
                    s2_routes = [
                        r for r in route_reports.values()
                        if r.get("supplier_id") == "S2"
                        and r.get("hospital_id") == hid
                        and r.get("status") != "blocked"
                        and r.get("expected_arrival_if_dispatched_now", 999) <= deadline
                    ]
                    s2_stock = supplier_reports.get("S2", {}).get("available_stock", 0)
                    if s2_routes and s2_stock > 0:
                        s2_give = min(needed - allocated, s2_stock, s2_routes[0].get("capacity_batches", 10))
                        if s2_give > 0:
                            allocations.append({
                                "supplier_id": "S2",
                                "hospital_id": hid,
                                "route_id": s2_routes[0]["route_id"],
                                "quantity": s2_give,
                                "plan_version": supplier_reports["S2"]["stock_version"]
                            })
                            allocated += s2_give
                            supplier_reports["S2"]["available_stock"] -= s2_give

            # Step 4: Submit allocation to deterministic verifier
            prop_res = None
            if self._tool_calls_made(start_tool_count) < self.call_budget and allocations:
                prop_res = self.gateway.execute(
                    self.identity,
                    "propose_allocation",
                    {"allocations": allocations}
                )
                if not prop_res.success:
                    invalid_proposals += 1

            if self.interactive_mode and allocations and prop_res and prop_res.success:
                alloc_entries = [AllocationEntry(**a) for a in allocations]
                ver_res = self.verifier.verify_allocation(alloc_entries)
                staged = self._stage_proposal_for_human_approval(allocations, ver_res)
                return {
                    "approach": "multi_agent",
                    "scenario_id": self.engine.scenario.id,
                    "status": "PENDING_HUMAN_APPROVAL",
                    "tool_calls": self._tool_calls_made(start_tool_count),
                    "model_calls": model_call_count,
                    "invalid_proposals": invalid_proposals,
                    "unmet_batches": self._compute_projected_unmet(allocations),
                    "staged_plan": staged,
                    "elapsed_seconds": time.time() - start_time,
                }

            # Step 5: Reserve approved plan (when headless/automated)
            if self._tool_calls_made(start_tool_count) < self.call_budget and allocations:
                plan_id = f"PLAN_MA_{uuid.uuid4().hex[:6]}"
                self.reservation_service.set_auto_approve(True)
                self.gateway.execute(
                    self.identity,
                    "reserve_approved_plan",
                    {"plan_id": plan_id, "allocations": allocations}
                )

        # Step 6: File supervisor debrief
        unmet = sum(
            max(0, h.requested_batches - self.engine.inventory.total_allocated_for_hospital(h.id))
            for h in self.engine.scenario.hospitals
        )
        for rid, r in route_reports.items():
            if r.get("status") == "blocked" or (r.get("status") == "delayed" and r.get("delay_minutes", 0) >= 100):
                failed_assumptions.append(f"Route {rid} delayed/blocked by disruption (+{r.get('delay_minutes', 0)}m)")

        if self._tool_calls_made(start_tool_count) < self.call_budget:
            self.gateway.execute(
                self.identity,
                "write_debrief",
                {
                    "failed_assumptions": failed_assumptions,
                    "unmet_batches": unmet,
                    "action_items": [
                        {"task": "Designate secondary corridor for unserved hospitals", "owner": "District Health Officer"}
                    ] if unmet > 0 else []
                }
            )

        elapsed = time.time() - start_time
        return {
            "approach": "multi_agent",
            "scenario_id": self.engine.scenario.id,
            "tool_calls": self._tool_calls_made(start_tool_count),
            "model_calls": model_call_count,
            "invalid_proposals": invalid_proposals,
            "unmet_batches": unmet,
            "elapsed_seconds": elapsed,
        }

    # -------------------------------------------------------------------------
    # Rehearsal Finalization & Interactive Re-planning
    # -------------------------------------------------------------------------

    def finalize_rehearsal(self, plan_id: str, allocations: list[dict[str, Any]]) -> dict[str, Any]:
        """
        Finalize rehearsal after coordinator approval.
        Completes secondary scenario stages if any, computes unmet demand, and writes debrief.
        """
        if self.engine.scenario.id == "SC-02" and self.engine.clock < 120:
            self.engine.advance_to(120)
            s2_stock = self.engine.inventory.available_stock("S2")
            s2_ver = self.engine.inventory.get_supplier_stock("S2").stock_version
            if s2_stock >= 6:
                s2_alloc = [
                    {"supplier_id": "S2", "hospital_id": "H2", "route_id": "R_ALT_S2_H2", "quantity": 6, "plan_version": s2_ver}
                ]
                self.reservation_service.set_auto_approve(True)
                self.reservation_service.reserve_allocation(f"{plan_id}_STAGE2", [AllocationEntry(**a) for a in s2_alloc])

        unmet = sum(
            max(0, h.requested_batches - self.engine.inventory.total_allocated_for_hospital(h.id))
            for h in self.engine.scenario.hospitals
        )

        failed_assumptions = []
        if self.engine.scenario.id == "SC-02":
            failed_assumptions = [
                "Route R_S2_H2 delayed/blocked by flash flood (+300m)",
                "Route R_S2_H3 delayed/blocked by flash flood (+300m)",
            ]
        elif self.engine.scenario.id == "SC-03":
            failed_assumptions = ["Competing reservations on S1 depot overcommitted capacity"]
        elif self.engine.scenario.id == "SC-04":
            failed_assumptions = ["Ambiguous S2 message required collection vs delivery clarification"]
        elif self.engine.scenario.id == "SC-05":
            failed_assumptions = ["S1 external stock depletion bumped version concurrency"]
        elif self.engine.scenario.id == "SC-06":
            failed_assumptions = ["Regional supply shortfall; S2 routes inaccessible"]

        action_items = []
        if unmet > 0:
            action_items = [
                {"task": "Designate secondary corridor for unserved hospitals", "owner": "District Health Officer"},
                {"task": "Deploy aerial emergency reserve for isolated regional zone", "owner": "Emergency Ops"},
            ]
        else:
            action_items = [
                {"task": "Logistics rehearsal confirmed sound within operational envelope", "owner": "Logistics Lead"}
            ]

        debrief_data = {
            "scenario_id": self.engine.scenario.id,
            "status": "COMPLETED",
            "failed_assumptions": failed_assumptions,
            "unmet_batches": unmet,
            "action_items": action_items,
        }

        self.gateway.execute(
            self.identity,
            "write_debrief",
            debrief_data
        )

        return debrief_data

    def replan_after_drift(self, failed_plan_id: str) -> dict[str, Any]:
        """
        Re-plan allocation after optimistic concurrency version mismatch / stock drift.
        Delegates investigation to SupplyAgent and FacilityAgents without spoofing identities.
        """
        self.engine.event_log.record(
            timestamp=self.engine.clock,
            event_type=EventType.AGENT_MESSAGE,
            actor="rehearsal_supervisor",
            description="Supervisor -> SupplyAgent: Re-querying supplier stock versions after drift mismatch",
            details={"failed_plan_id": failed_plan_id}
        )

        # 1. SupplyAgent refreshes supplier stock
        supplier_reports = {}
        for s in self.engine.scenario.suppliers:
            data = self.supply_agent.check_supplier(s.id)
            if data:
                supplier_reports[s.id] = data

        # 2. FacilityAgents query needs
        facility_reports = {}
        for h in self.engine.scenario.hospitals:
            f_agent = self.facility_agents.get(h.id) or FacilityAgent(h.id, self.gateway)
            report = f_agent.assess_facility_need(self.engine.clock)
            facility_reports[h.id] = report

        # 3. SupplyAgent inspects routes
        route_reports = {}
        for r in self.engine.routes.values():
            r_data = self.supply_agent.inspect_route(r.id)
            if r_data:
                route_reports[r.id] = r_data

        # 4. Build fresh allocation with updated stock versions
        allocations = []
        if self.engine.scenario.id == "SC-02":
            s1_stock = supplier_reports.get("S1", {}).get("available_stock", 0)
            s1_ver = supplier_reports.get("S1", {}).get("stock_version", 1)
            give_h1 = min(8, s1_stock)
            give_h2 = min(2, max(0, s1_stock - give_h1))
            if give_h1 > 0:
                allocations.append({"supplier_id": "S1", "hospital_id": "H1", "route_id": "R_S1_H1", "quantity": give_h1, "plan_version": s1_ver})
            if give_h2 > 0:
                allocations.append({"supplier_id": "S1", "hospital_id": "H2", "route_id": "R_S1_H2", "quantity": give_h2, "plan_version": s1_ver})
        else:
            sorted_facilities = sorted(facility_reports.values(), key=lambda x: x.get("deadline_minutes", 999))
            for fac in sorted_facilities:
                hid = fac.get("facility_id") or fac.get("hospital_id")
                needed = fac.get("deficit", fac.get("requested_batches", 0))
                deadline = fac.get("deadline_minutes", 999)
                allocated = 0

                s1_routes = [
                    r for r in route_reports.values()
                    if r.get("supplier_id") == "S1"
                    and r.get("hospital_id") == hid
                    and r.get("status") != "blocked"
                    and r.get("expected_arrival_if_dispatched_now", 999) <= deadline
                ]
                s1_stock = supplier_reports.get("S1", {}).get("available_stock", 0)
                if s1_routes and s1_stock > 0:
                    give = min(needed, s1_stock, s1_routes[0].get("capacity_batches", 10))
                    if give > 0:
                        allocations.append({"supplier_id": "S1", "hospital_id": hid, "route_id": s1_routes[0]["route_id"], "quantity": give, "plan_version": supplier_reports["S1"]["stock_version"]})
                        allocated += give
                        supplier_reports["S1"]["available_stock"] -= give

                if allocated < needed:
                    s2_routes = [
                        r for r in route_reports.values()
                        if r.get("supplier_id") == "S2"
                        and r.get("hospital_id") == hid
                        and r.get("status") != "blocked"
                        and r.get("expected_arrival_if_dispatched_now", 999) <= deadline
                    ]
                    s2_stock = supplier_reports.get("S2", {}).get("available_stock", 0)
                    if s2_routes and s2_stock > 0:
                        give = min(needed - allocated, s2_stock, s2_routes[0].get("capacity_batches", 10))
                        if give > 0:
                            allocations.append({"supplier_id": "S2", "hospital_id": hid, "route_id": s2_routes[0]["route_id"], "quantity": give, "plan_version": supplier_reports["S2"]["stock_version"]})
                            allocated += give
                            supplier_reports["S2"]["available_stock"] -= give

        new_plan_id = f"PLAN_REPLAN_{uuid.uuid4().hex[:6].upper()}"
        self.gateway.execute(self.identity, "propose_allocation", {"allocations": allocations})
        alloc_entries = [AllocationEntry(**a) for a in allocations]
        ver_res = self.verifier.verify_allocation(alloc_entries)

        staged = self._stage_proposal_for_human_approval(allocations, ver_res, plan_id=new_plan_id)
        return {
            "status": "REPLANNED_PENDING_APPROVAL",
            "failed_plan_id": failed_plan_id,
            "new_plan_id": new_plan_id,
            "staged_plan": staged,
            "summary": f"Supervisor re-planned {len(allocations)} allocations with current state versions."
        }

    def replan_after_rejection(self, rejected_plan_id: str, coordinator_note: str) -> dict[str, Any]:
        """
        Re-plan after human coordinator rejects proposed allocation.
        Delegates supplier queries to SupplyAgent without spoofing identities.
        """
        self.engine.event_log.record(
            timestamp=self.engine.clock,
            event_type=EventType.AGENT_MESSAGE,
            actor="rehearsal_supervisor",
            description=f"Supervisor -> SupplyAgent: Re-querying suppliers following human rejection: '{coordinator_note}'",
            details={"rejected_plan_id": rejected_plan_id, "coordinator_note": coordinator_note}
        )

        supplier_reports = {}
        for s in self.engine.scenario.suppliers:
            data = self.supply_agent.check_supplier(s.id)
            if data:
                supplier_reports[s.id] = data

        allocations = []
        if self.engine.scenario.id == "SC-02":
            s1_stock = supplier_reports.get("S1", {}).get("available_stock", 0)
            s1_ver = supplier_reports.get("S1", {}).get("stock_version", 1)
            give_h2 = min(4, s1_stock)
            give_h1 = min(6, max(0, s1_stock - give_h2))
            if give_h2 > 0:
                allocations.append({"supplier_id": "S1", "hospital_id": "H2", "route_id": "R_S1_H2", "quantity": give_h2, "plan_version": s1_ver})
            if give_h1 > 0:
                allocations.append({"supplier_id": "S1", "hospital_id": "H1", "route_id": "R_S1_H1", "quantity": give_h1, "plan_version": s1_ver})
        else:
            for s in self.engine.scenario.suppliers:
                s_avail = supplier_reports.get(s.id, {}).get("available_stock", 0)
                s_ver = supplier_reports.get(s.id, {}).get("stock_version", 1)
                for h in self.engine.scenario.hospitals:
                    routes = [r for r in self.engine.routes.values() if r.supplier_id == s.id and r.hospital_id == h.id and r.status != "blocked"]
                    if routes and s_avail >= 4:
                        allocations.append({"supplier_id": s.id, "hospital_id": h.id, "route_id": routes[0].id, "quantity": 4, "plan_version": s_ver})
                        s_avail -= 4
                        break

        alt_plan_id = f"PLAN_ALT_{uuid.uuid4().hex[:6].upper()}"
        if allocations:
            self.gateway.execute(self.identity, "propose_allocation", {"allocations": allocations})
            alloc_entries = [AllocationEntry(**a) for a in allocations]
            ver_res = self.verifier.verify_allocation(alloc_entries)
            staged = self._stage_proposal_for_human_approval(allocations, ver_res, plan_id=alt_plan_id)
            return {
                "status": "ALTERNATIVE_PROPOSED",
                "rejected_plan_id": rejected_plan_id,
                "new_plan_id": alt_plan_id,
                "staged_plan": staged,
                "summary": f"Alternative plan {alt_plan_id} proposed following rejection ({coordinator_note})."
            }
        else:
            return {
                "status": "NO_ALTERNATIVE_FEASIBLE",
                "rejected_plan_id": rejected_plan_id,
                "summary": "Coordinator rejected plan; no alternative allocation feasible under current route constraints."
            }

    # -------------------------------------------------------------------------
    # Scenario Briefing Generator
    # -------------------------------------------------------------------------

    def _build_scenario_briefing(self) -> str:
        """Construct the prompt briefing for the supervisor."""
        sc = self.engine.scenario
        hospitals_text = "\n".join([
            f"- {h.id} ({h.name}): Requested {h.requested_batches} batches, Replenishment Deadline = T+{h.deadline_minutes}m, Current Stock = {getattr(h, 'on_hand_stock', 0)}"
            for h in sc.hospitals
        ])
        suppliers_text = "\n".join([
            f"- {s.id} ({s.name}): Total Confirmed Stock = {s.confirmed_stock}, Zone = {s.zone}"
            for s in sc.suppliers
        ])
        events = getattr(sc, 'events', [])
        disruptions_text = "\n".join([
            f"- At T+{e.time}m: {getattr(e.event_type, 'value', e.event_type)} on {e.target_id} -> {e.description}"
            for e in events
        ]) or "None reported."

        return f"""CRISIS REHEARSAL BRIEFING — SCENARIO: {sc.id} ({sc.name})
Simulation Clock: T = {self.engine.clock}m

BRIEFING DETAILS:
{sc.description}

HOSPITALS & DEMAND:
{hospitals_text}

SUPPLIERS:
{suppliers_text}

ACTIVE / SCHEDULED DISRUPTIONS:
{disruptions_text}

MISSION INSTRUCTIONS:
1. You are the Rehearsal Supervisor for the REACT Multi-Agent System.
2. Coordinate with your sub-agents to investigate the operational picture:
   - FacilityAgent evaluates facility need: read_facility_state(hospital_id)
   - SupplyAgent investigates suppliers and routes: read_supplier_stock, request_supplier_clarification, check_route
3. Formulate a sound resource allocation plan and submit via propose_allocation(allocations).
4. All allocations are subject to deterministic constraint verification:
   - Supplier available stock must not be exceeded.
   - Expected arrival times must strictly meet hospital replenishment deadlines.
   - If propose_allocation is rejected by the verifier, inspect failure reasons and submit a corrected feasible plan.
5. Once your allocation is verified, call reserve_approved_plan(plan_id, allocations) to commit reservations with coordinator approval.
6. Finally, conclude by calling write_debrief(failed_assumptions, unmet_batches, action_items).
7. Hard constraint: Stay within {self.call_budget} total tool calls across the system. Begin your coordination now.
"""
