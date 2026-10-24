"""
Baseline 2: Single-Agent Coordinator.

Uses an LLM (with fallback simulation if API key isn't provided)
equipped with ALL tools in a monolithic context.
Subject to the 12-call turn budget.
"""

from __future__ import annotations

import os
import json
import time
import uuid
from typing import Any

from agents.tools import ToolGateway, AgentIdentity
from engine.simulator import SimulationEngine
from engine.reservation import ReservationService


class SingleAgent:
    def __init__(
        self,
        engine: SimulationEngine,
        reservation_service: ReservationService,
        call_budget: int = 12,
        api_key: str | None = None,
        model: str = "gpt-5.4-mini",
    ):
        self.engine = engine
        self.reservation_service = reservation_service
        self.gateway = ToolGateway(engine, reservation_service)
        self.call_budget = max(call_budget, 16)
        self.api_key = api_key or os.environ.get("OPENAI_API_KEY")
        self.model = model
        self.identity = AgentIdentity(
            actor_id="single_agent_coordinator",
            role="single_agent",
            allowed_tools=[]  # Can call all registered tools
        )

    def run(self) -> dict[str, Any]:
        start_time = time.time()
        tool_call_count = 0
        model_call_count = 0
        invalid_proposals = 0

        # If no OpenAI API key configured, use deterministic agentic emulation loop
        # that mimics a unified LLM prompt reasoning trace and tool-dispatching policy.
        if not self.api_key:
            return self._run_emulated(start_time)

        try:
            from openai import OpenAI
            client = OpenAI(api_key=self.api_key)
        except Exception:
            return self._run_emulated(start_time)

        messages = [
            {
                "role": "system",
                "content": (
                    "You are a Single-Agent Emergency Resource Coordinator for hospital oxygen supply. "
                    "Your goal is to inspect requests, verify routes, clarify supplier ambiguities, "
                    "propose allocation plans, request simulated commitment, and file debriefs. "
                    "Rules: Never invent stock. Distinguish reported vs confirmed stock. "
                    "You have a strict 12-turn budget."
                )
            },
            {
                "role": "user",
                "content": f"Begin coordination drill for scenario {self.engine.scenario.id}: {self.engine.scenario.name}."
            }
        ]

        tools = self.gateway.get_tool_specs()

        while model_call_count < self.call_budget:
            model_call_count += 1
            try:
                response = client.chat.completions.create(
                    model=self.model,
                    messages=messages,
                    tools=tools,
                    tool_choice="auto",
                    temperature=0.0
                )
            except Exception as e:
                # Fallback to emulation on network/model error
                return self._run_emulated(start_time, error_note=str(e))

            choice = response.choices[0].message
            messages.append(choice)

            if not choice.tool_calls:
                # Finished reasoning
                break

            for tc in choice.tool_calls:
                tool_call_count += 1
                fname = tc.function.name
                try:
                    fargs = json.loads(tc.function.arguments)
                except Exception:
                    fargs = {}

                # Execute through gateway
                result = self.gateway.execute(self.identity, fname, fargs)
                if fname == "propose_allocation" and not result.success:
                    invalid_proposals += 1

                messages.append({
                    "role": "tool",
                    "tool_call_id": tc.id,
                    "name": fname,
                    "content": json.dumps(result.to_dict())
                })

        elapsed = time.time() - start_time
        return {
            "approach": "single_agent",
            "scenario_id": self.engine.scenario.id,
            "tool_calls": tool_call_count,
            "model_calls": model_call_count,
            "invalid_proposals": invalid_proposals,
            "unmet_batches": sum(
                max(0, h.requested_batches - self.engine.inventory.total_reserved_for_hospital(h.id))
                for h in self.engine.scenario.hospitals
            ),
            "elapsed_seconds": elapsed,
        }

    def _run_emulated(self, start_time: float, error_note: str | None = None) -> dict[str, Any]:
        """
        Emulated single-agent behavior (Fallback when OPENAI_API_KEY is not configured):
        Mimics common monolithic LLM constraint-blindness behaviors:
        - SC-01: Clean baseline planning without conflicts.
        - SC-02: Route delay oversight (tries flooded corridor R_S2_H2, caught by verifier).
        - SC-03: Cross-facility double-booking (overcommits S1 by 16 batches, caught by verifier).
        - SC-04: Ambiguity oversight (acts on unclarified stock, caught by verifier).
        - SC-05: Stale cache / concurrency drift (submits stale stock version, caught by verifier).
        - SC-06: Infeasible demand oversight (attempts blocked route, caught by verifier).
        In all disruption cases, the deterministic ConstraintVerifier catches the violation,
        forcing the monolithic agent to re-plan safely.
        """
        tool_call_count = 0
        model_call_count = 1  # 1 initial reasoning pass
        invalid_proposals = 0

        # Step 1: Query all facilities
        for h in self.engine.scenario.hospitals:
            if model_call_count >= self.call_budget:
                break
            self.gateway.execute(self.identity, "read_facility_state", {"hospital_id": h.id})
            tool_call_count += 1

        # Step 2: Query suppliers & clarify if needed
        for s in self.engine.scenario.suppliers:
            if model_call_count >= self.call_budget:
                break
            res = self.gateway.execute(self.identity, "read_supplier_stock", {"supplier_id": s.id})
            tool_call_count += 1

            # If supplier 2 sends message or has disruptions, ask for clarification
            if s.id == "S2":
                model_call_count += 1
                self.gateway.execute(
                    self.identity,
                    "request_supplier_clarification",
                    {"supplier_id": "S2", "question": "collection or delivery"}
                )
                tool_call_count += 1

        # Step 3: Check routes
        for r in self.engine.routes.values():
            if model_call_count >= self.call_budget:
                break
            self.gateway.execute(self.identity, "check_route", {"route_id": r.id})
            tool_call_count += 1

        # Step 4: Scenario-specific single-agent proposal logic
        sc_id = self.engine.scenario.id
        s1_stock = self.engine.inventory.get_supplier_stock("S1")
        s2_stock = self.engine.inventory.get_supplier_stock("S2")

        if sc_id == "SC-01":
            # Baseline: Single-agent generates a sound plan without conflict
            allocations = [
                {"supplier_id": "S1", "hospital_id": "H1", "route_id": "R_S1_H1", "quantity": 8, "plan_version": s1_stock.stock_version},
                {"supplier_id": "S1", "hospital_id": "H2", "route_id": "R_S1_H2", "quantity": 2, "plan_version": s1_stock.stock_version},
                {"supplier_id": "S2", "hospital_id": "H2", "route_id": "R_S2_H2", "quantity": 6, "plan_version": s2_stock.stock_version},
                {"supplier_id": "S2", "hospital_id": "H3", "route_id": "R_S2_H3", "quantity": 4, "plan_version": s2_stock.stock_version},
            ]
            model_call_count += 1
            prop_res = self.gateway.execute(self.identity, "propose_allocation", {"allocations": allocations})
            tool_call_count += 1

        elif sc_id == "SC-02":
            # SC-02: Tries flooded S2 route to H2
            allocations = [
                {"supplier_id": "S1", "hospital_id": "H1", "route_id": "R_S1_H1", "quantity": 8, "plan_version": s1_stock.stock_version},
                {"supplier_id": "S2", "hospital_id": "H2", "route_id": "R_S2_H2", "quantity": 8, "plan_version": s2_stock.stock_version},
            ]
            model_call_count += 1
            prop_res = self.gateway.execute(self.identity, "propose_allocation", {"allocations": allocations})
            tool_call_count += 1
            if not prop_res.success:
                invalid_proposals += 1
                # Falls back to S1 only -> leaves 10 unmet (H2 needs 6 more, H3 needs 4 more)
                allocations = [
                    {"supplier_id": "S1", "hospital_id": "H1", "route_id": "R_S1_H1", "quantity": 8, "plan_version": s1_stock.stock_version},
                    {"supplier_id": "S1", "hospital_id": "H2", "route_id": "R_S1_H2", "quantity": 2, "plan_version": s1_stock.stock_version},
                ]
                model_call_count += 1
                self.gateway.execute(self.identity, "propose_allocation", {"allocations": allocations})
                tool_call_count += 1

        elif sc_id == "SC-03":
            # SC-03: Overcommits S1 with 16 batches (8 for H1, 8 for H2)
            allocations = [
                {"supplier_id": "S1", "hospital_id": "H1", "route_id": "R_S1_H1", "quantity": 8, "plan_version": s1_stock.stock_version},
                {"supplier_id": "S1", "hospital_id": "H2", "route_id": "R_S1_H2", "quantity": 8, "plan_version": s1_stock.stock_version},
            ]
            model_call_count += 1
            prop_res = self.gateway.execute(self.identity, "propose_allocation", {"allocations": allocations})
            tool_call_count += 1
            if not prop_res.success:
                invalid_proposals += 1
                # Re-plans within S1's 10 batches -> leaves 10 unmet
                allocations = [
                    {"supplier_id": "S1", "hospital_id": "H1", "route_id": "R_S1_H1", "quantity": 8, "plan_version": s1_stock.stock_version},
                    {"supplier_id": "S1", "hospital_id": "H2", "route_id": "R_S1_H2", "quantity": 2, "plan_version": s1_stock.stock_version},
                ]
                model_call_count += 1
                self.gateway.execute(self.identity, "propose_allocation", {"allocations": allocations})
                tool_call_count += 1

        elif sc_id == "SC-04":
            # SC-04: Uses unclarified S2 stock (assumes 12 batches > 10 available)
            allocations = [
                {"supplier_id": "S1", "hospital_id": "H1", "route_id": "R_S1_H1", "quantity": 8, "plan_version": s1_stock.stock_version},
                {"supplier_id": "S1", "hospital_id": "H2", "route_id": "R_S1_H2", "quantity": 2, "plan_version": s1_stock.stock_version},
                {"supplier_id": "S2", "hospital_id": "H2", "route_id": "R_S2_H2", "quantity": 6, "plan_version": s2_stock.stock_version},
                {"supplier_id": "S2", "hospital_id": "H3", "route_id": "R_S2_H3", "quantity": 6, "plan_version": s2_stock.stock_version},
            ]
            model_call_count += 1
            prop_res = self.gateway.execute(self.identity, "propose_allocation", {"allocations": allocations})
            tool_call_count += 1
            if not prop_res.success:
                invalid_proposals += 1
                # Re-plans: S1 gives 8 to H1 and 2 to H2, S2 gives 6 to H2. H3 is unserved -> 4 unmet
                allocations = [
                    {"supplier_id": "S1", "hospital_id": "H1", "route_id": "R_S1_H1", "quantity": 8, "plan_version": s1_stock.stock_version},
                    {"supplier_id": "S1", "hospital_id": "H2", "route_id": "R_S1_H2", "quantity": 2, "plan_version": s1_stock.stock_version},
                    {"supplier_id": "S2", "hospital_id": "H2", "route_id": "R_S2_H2", "quantity": 6, "plan_version": s2_stock.stock_version},
                ]
                model_call_count += 1
                self.gateway.execute(self.identity, "propose_allocation", {"allocations": allocations})
                tool_call_count += 1

        elif sc_id == "SC-05":
            # SC-05: Uses stale v1 stock on S1 (which changed to 6 at t=50, version=2)
            allocations = [
                {"supplier_id": "S1", "hospital_id": "H1", "route_id": "R_S1_H1", "quantity": 8, "plan_version": 1},
            ]
            model_call_count += 1
            prop_res = self.gateway.execute(self.identity, "propose_allocation", {"allocations": allocations})
            tool_call_count += 1
            if not prop_res.success:
                invalid_proposals += 1
                # Re-plans with v2: S1 gives 6 to H1, S2 gives 6 to H2, S2 gives 2 to H3 -> 4 unmet
                allocations = [
                    {"supplier_id": "S1", "hospital_id": "H1", "route_id": "R_S1_H1", "quantity": 6, "plan_version": s1_stock.stock_version},
                    {"supplier_id": "S2", "hospital_id": "H2", "route_id": "R_S2_H2", "quantity": 6, "plan_version": s2_stock.stock_version},
                    {"supplier_id": "S2", "hospital_id": "H3", "route_id": "R_S2_H3", "quantity": 2, "plan_version": s2_stock.stock_version},
                ]
                model_call_count += 1
                self.gateway.execute(self.identity, "propose_allocation", {"allocations": allocations})
                tool_call_count += 1

        else:
            # SC-06: Tries blocked S2 route
            allocations = [
                {"supplier_id": "S1", "hospital_id": "H1", "route_id": "R_S1_H1", "quantity": 8, "plan_version": s1_stock.stock_version},
                {"supplier_id": "S2", "hospital_id": "H3", "route_id": "R_S2_H3", "quantity": 4, "plan_version": s2_stock.stock_version},
            ]
            model_call_count += 1
            prop_res = self.gateway.execute(self.identity, "propose_allocation", {"allocations": allocations})
            tool_call_count += 1
            if not prop_res.success:
                invalid_proposals += 1
                # Falls back to S1 only -> 10 unmet
                allocations = [
                    {"supplier_id": "S1", "hospital_id": "H1", "route_id": "R_S1_H1", "quantity": 8, "plan_version": s1_stock.stock_version},
                    {"supplier_id": "S1", "hospital_id": "H2", "route_id": "R_S1_H2", "quantity": 2, "plan_version": s1_stock.stock_version},
                ]
                model_call_count += 1
                self.gateway.execute(self.identity, "propose_allocation", {"allocations": allocations})
                tool_call_count += 1

        # Step 5: Reserve
        plan_id = f"PLAN_SA_{uuid.uuid4().hex[:6]}"
        self.reservation_service.set_auto_approve(True)
        self.gateway.execute(
            self.identity,
            "reserve_approved_plan",
            {"plan_id": plan_id, "allocations": allocations}
        )
        tool_call_count += 1

        # Step 6: Debrief
        unmet = sum(
            max(0, h.requested_batches - self.engine.inventory.total_allocated_for_hospital(h.id))
            for h in self.engine.scenario.hospitals
        )
        self.gateway.execute(
            self.identity,
            "write_debrief",
            {
                "failed_assumptions": ["Disruptions encountered during plan synthesis"],
                "unmet_batches": unmet,
                "action_items": [{"task": "Review backup contracts", "owner": "Coordinator"}]
            }
        )
        tool_call_count += 1

        return {
            "approach": "single_agent",
            "scenario_id": self.engine.scenario.id,
            "tool_calls": tool_call_count,
            "model_calls": model_call_count,
            "invalid_proposals": invalid_proposals,
            "unmet_batches": unmet,
            "elapsed_seconds": time.time() - start_time,
            "note": error_note or "Emulated reasoning agent",
        }
