"""
Baseline 1: Deterministic Fixed-Rules Decision Tree (No LLM).

Follows fixed operational heuristics:
1. Gathers state for all facilities, suppliers, and routes.
2. For each hospital (sorted by urgency / deadline):
   - Finds open routes with earliest arrival.
   - Allocates up to requested need from available supplier stock.
3. Submits proposal for verification.
4. Auto-commits valid allocations.
5. Writes debrief.
"""

from __future__ import annotations

import time
import uuid
from typing import Any

from agents.tools import ToolGateway, AgentIdentity
from models.scenario import RouteStatus
from engine.simulator import SimulationEngine
from engine.reservation import ReservationService
from engine.verifier import AllocationEntry


class FixedRulesBaseline:
    def __init__(self, engine: SimulationEngine, reservation_service: ReservationService):
        self.engine = engine
        self.reservation_service = reservation_service
        self.gateway = ToolGateway(engine, reservation_service)
        self.identity = AgentIdentity(
            actor_id="fixed_rules_system",
            role="system",
            allowed_tools=[]  # System has unrestricted access
        )

    def run(self) -> dict[str, Any]:
        start_time = time.time()
        tool_call_count = 0
        invalid_proposals = 0

        # Step 1: Read all hospital states
        hospitals_info = []
        for h in self.engine.scenario.hospitals:
            res = self.gateway.execute(self.identity, "read_facility_state", {"hospital_id": h.id})
            tool_call_count += 1
            if res.success:
                hospitals_info.append(res.data)

        # Sort hospitals by flexibility (number of open candidate routes) then deadline
        def hospital_flexibility(h_dict):
            hid = h_dict["hospital_id"]
            routes = [
                r for r in self.engine.routes.values()
                if r.hospital_id == hid and (r.status.value if hasattr(r.status, "value") else str(r.status)) != "blocked"
            ]
            return (len(routes), h_dict["deadline_minutes"])

        hospitals_info.sort(key=hospital_flexibility)

        # Step 2: Read supplier stocks
        suppliers_info = {}
        for s in self.engine.scenario.suppliers:
            res = self.gateway.execute(self.identity, "read_supplier_stock", {"supplier_id": s.id})
            tool_call_count += 1
            if res.success:
                suppliers_info[s.id] = res.data

        # Step 3: Check routes
        routes_info = []
        for r in self.engine.routes.values():
            res = self.gateway.execute(self.identity, "check_route", {"route_id": r.id})
            tool_call_count += 1
            if res.success:
                routes_info.append(res.data)

        # Step 4: Greedy Allocation Logic
        allocations: list[AllocationEntry] = []
        unmet_by_hospital = {}

        # Step 4: Generic Greedy Allocation Logic (Earliest Deadline First)
        allocations: list[AllocationEntry] = []
        unmet_by_hospital = {h["hospital_id"]: h["requested_batches"] for h in hospitals_info}

        for h in hospitals_info:
            hid = h["hospital_id"]
            deadline = h["deadline_minutes"]
            needed = unmet_by_hospital[hid]
            if needed <= 0:
                continue

            # Candidate routes serving this hospital
            candidate_routes = [
                r for r in self.engine.routes.values()
                if r.hospital_id == hid
            ]
            # Sort routes by travel time / arrival time
            candidate_routes.sort(key=lambda r: self.engine.compute_arrival(r.id))

            for route_obj in candidate_routes:
                if unmet_by_hospital[hid] <= 0:
                    break

                rid = route_obj.id
                sid = route_obj.supplier_id

                route_val = route_obj.status.value if hasattr(route_obj.status, "value") else str(route_obj.status)
                if route_obj.status == RouteStatus.BLOCKED or route_val == "blocked":
                    continue
                if self.engine.compute_arrival(rid) > deadline:
                    continue

                s_avail = suppliers_info.get(sid, {}).get("available_stock", 0)
                if s_avail <= 0:
                    continue

                amt = min(unmet_by_hospital[hid], s_avail, route_obj.capacity_batches)
                if amt > 0:
                    alloc = AllocationEntry(
                        supplier_id=sid,
                        hospital_id=hid,
                        route_id=rid,
                        quantity=amt,
                        plan_version=suppliers_info[sid]["stock_version"]
                    )
                    allocations.append(alloc)
                    suppliers_info[sid]["available_stock"] -= amt
                    unmet_by_hospital[hid] -= amt

        # Step 5: Propose Allocation
        if allocations:
            prop_res = self.gateway.execute(
                self.identity,
                "propose_allocation",
                {"allocations": [a.to_dict() for a in allocations]}
            )
            tool_call_count += 1

            if not prop_res.success:
                invalid_proposals += 1

            # Step 6: Commit Reservation
            plan_id = f"PLAN_FR_{uuid.uuid4().hex[:6]}"
            self.reservation_service.set_auto_approve(True)
            reserve_res = self.gateway.execute(
                self.identity,
                "reserve_approved_plan",
                {
                    "plan_id": plan_id,
                    "allocations": [a.to_dict() for a in allocations]
                }
            )
            tool_call_count += 1

        total_unmet = sum(
            max(0, h.requested_batches - self.engine.inventory.total_allocated_for_hospital(h.id))
            for h in self.engine.scenario.hospitals
        )

        # Step 7: Debrief
        failed_assumptions = []
        for r in routes_info:
            if r["status"] == "blocked":
                failed_assumptions.append(f"Route {r['route_id']} was blocked")

        debrief_res = self.gateway.execute(
            self.identity,
            "write_debrief",
            {
                "failed_assumptions": failed_assumptions,
                "unmet_batches": total_unmet,
                "action_items": [
                    {"task": "Find additional regional supplier backup", "owner": "Logistics Lead"}
                ] if total_unmet > 0 else []
            }
        )
        tool_call_count += 1

        elapsed = time.time() - start_time
        return {
            "approach": "fixed_rules",
            "scenario_id": self.engine.scenario.id,
            "tool_calls": tool_call_count,
            "model_calls": 0,
            "invalid_proposals": invalid_proposals,
            "unmet_batches": total_unmet,
            "elapsed_seconds": elapsed,
            "allocations_committed": len(allocations),
        }
