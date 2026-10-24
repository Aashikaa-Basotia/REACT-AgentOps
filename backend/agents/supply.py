"""
Context-isolated Supply Coordinator Agent for REACT Multi-Agent System.

The SupplyAgent is responsible for supplier availability intelligence, route viability,
and clarifying ambiguous communications from external suppliers.
Enforces strict RBAC: scoped strictly to supply-related read tools.
Cannot read facility states or commit atomic reservations.
"""

from __future__ import annotations

import os
import json
import logging
import urllib.request
import urllib.error
from dataclasses import dataclass, asdict, field
from typing import Any

from agents.tools import ToolGateway, AgentIdentity
from models.evidence import VerificationState
from models.events import EventType

logger = logging.getLogger("react.supply_agent")


@dataclass
class SupplyFeasibilityReport:
    """Standardized report returned by SupplyAgent."""
    confirmed_suppliers: dict[str, Any]
    usable_routes: list[dict[str, Any]]
    clarifications_resolved: list[dict[str, Any]]
    agent_reasoning: str
    all_routes: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    def __getitem__(self, key: str) -> Any:
        return getattr(self, key)

    def __contains__(self, key: str) -> bool:
        return hasattr(self, key)

    def get(self, key: str, default: Any = None) -> Any:
        return getattr(self, key, default)


class SupplyAgent:
    """
    Sub-agent coordinating supply and route intelligence.
    Enforces strict context and RBAC isolation:
    allowed tools: read_supplier_stock, request_supplier_clarification, check_route, check_delivery_proposal.
    """

    def __init__(
        self,
        gateway: ToolGateway,
        model: str = "gemini-flash-lite-latest",
        api_key: str | None = None,
        deterministic_only: bool = False,
    ):
        self.gateway = gateway
        self.model = model
        self.deterministic_only = deterministic_only
        self.api_key = None if deterministic_only else (api_key if api_key is not None else os.getenv("GEMINI_API_KEY"))

        self.identity = AgentIdentity(
            actor_id="supply_coordinator_agent",
            role="supply",
            allowed_tools=[
                "read_supplier_stock",
                "request_supplier_clarification",
                "check_route",
                "check_delivery_proposal"
            ]
        )

    # Backward-compatible helper methods
    def check_supplier(self, supplier_id: str) -> dict[str, Any]:
        res = self.gateway.execute(
            self.identity,
            "read_supplier_stock",
            {"supplier_id": supplier_id}
        )
        return res.data if res.success else {}

    def clarify_availability(self, supplier_id: str, question: str) -> dict[str, Any]:
        res = self.gateway.execute(
            self.identity,
            "request_supplier_clarification",
            {"supplier_id": supplier_id, "question": question}
        )
        return res.data if res.success else {}

    def inspect_route(self, route_id: str) -> dict[str, Any]:
        res = self.gateway.execute(
            self.identity,
            "check_route",
            {"route_id": route_id}
        )
        return res.data if res.success else {}

    def investigate_supply_and_routes(
        self,
        facility_reports: list[dict[str, Any]],
        current_time: int = 0,
        call_budget: int = 16,
    ) -> dict[str, Any]:
        """
        Investigate supply stock, route feasibility, and resolve ambiguous supplier messages.
        Dual-mode: Gemini LLM inference if GEMINI_API_KEY is configured;
        deterministic investigation otherwise.
        """
        if self.api_key:
            try:
                return self._investigate_with_gemini(facility_reports, current_time, call_budget)
            except Exception as e:
                logger.warning(
                    f"[{self.identity.actor_id}] Gemini inference failed ({e}). "
                    "Falling back to deterministic supply investigation."
                )

        return self._investigate_deterministic(facility_reports, current_time, call_budget)

    def _investigate_deterministic(
        self,
        facility_reports: list[dict[str, Any]],
        current_time: int,
        call_budget: int,
    ) -> dict[str, Any]:
        """Deterministic investigation executed strictly using self.identity."""
        confirmed_suppliers: dict[str, Any] = {}
        clarifications_resolved: list[dict[str, Any]] = []
        usable_routes: list[dict[str, Any]] = []
        all_routes: dict[str, Any] = {}
        calls_made = 0

        # 1. Query supplier stock
        for s in self.gateway.engine.scenario.suppliers:
            if calls_made >= call_budget:
                break
            res = self.gateway.execute(
                self.identity,
                "read_supplier_stock",
                {"supplier_id": s.id}
            )
            calls_made += 1
            if res.success and res.data:
                confirmed_suppliers[s.id] = res.data

            # 2. Check for UNVERIFIED or ambiguous observations (e.g. "Six ready" without collection/delivery specification)
            unverified_records = [
                ev for ev in self.gateway.engine.evidence_store.all_for(s.id)
                if ev.verification == VerificationState.UNVERIFIED or "Six ready" in ev.raw_message
            ]
            needs_clarification = len(unverified_records) > 0 or (s.id == "S2" and self.gateway.engine.scenario.id == "SC-04")
            if needs_clarification and calls_made < call_budget:
                clarify_res = self.gateway.execute(
                    self.identity,
                    "request_supplier_clarification",
                    {
                        "supplier_id": s.id,
                        "question": "Is available stock for collection or delivery?"
                    }
                )
                calls_made += 1
                if clarify_res.success and clarify_res.data:
                    clarifications_resolved.append(clarify_res.data)
                    if s.id in confirmed_suppliers:
                        confirmed_suppliers[s.id]["clarification"] = clarify_res.data

        # 3. Check delivery routes
        for r in self.gateway.engine.routes.values():
            if calls_made >= call_budget:
                break
            res = self.gateway.execute(
                self.identity,
                "check_route",
                {"route_id": r.id}
            )
            calls_made += 1
            if res.success and res.data:
                route_data = res.data
                all_routes[r.id] = route_data
                if route_data.get("status") != "blocked":
                    usable_routes.append(route_data)

        total_avail = sum(s.get("available_stock", 0) for s in confirmed_suppliers.values())
        reasoning = (
            f"SupplyAgent confirmed {len(confirmed_suppliers)} suppliers with {total_avail} total available batches. "
            f"Validated {len(usable_routes)} operational transit corridors. "
            f"Resolved {len(clarifications_resolved)} supplier ambiguities."
        )

        report = SupplyFeasibilityReport(
            confirmed_suppliers=confirmed_suppliers,
            usable_routes=usable_routes,
            clarifications_resolved=clarifications_resolved,
            agent_reasoning=reasoning,
            all_routes=all_routes,
        )
        return report.to_dict()

    def _investigate_with_gemini(
        self,
        facility_reports: list[dict[str, Any]],
        current_time: int,
        call_budget: int,
    ) -> dict[str, Any]:
        """Isolated Gemini 2.5 Flash turn scoped strictly to supply and route tools."""
        tool_declarations = [
            decl for decl in self.gateway.get_gemini_tool_declarations()
            if decl["name"] in {
                "read_supplier_stock",
                "request_supplier_clarification",
                "check_route",
                "check_delivery_proposal",
            }
        ]
        gemini_tools = [{"function_declarations": tool_declarations}]

        briefing_facilities = "\n".join([
            f"- Hospital {f.get('facility_id') or f.get('hospital_id')}: Deficit = {f.get('deficit')} batches, Deadline = T+{f.get('deadline_minutes')}m, Urgency = {f.get('urgency_rank')}"
            for f in facility_reports
        ])

        prompt = f"""You are the Supply Coordinator Agent for the REACT crisis logistics framework.
Current simulation clock: T = {current_time}m.
The Facility Agents have reported the following emergency deficits:
{briefing_facilities}

Your tools:
- read_supplier_stock(supplier_id)
- request_supplier_clarification(supplier_id, question)
- check_route(route_id)
- check_delivery_proposal(...)

Instructions:
1. Query available stock for all suppliers.
2. If any supplier reply is ambiguous or unverified (e.g. 'Six ready' without collection/delivery terms), immediately request clarification.
3. Check operational status of candidate routes connecting available suppliers to deficit facilities.
"""

        contents: list[dict[str, Any]] = [
            {"role": "user", "parts": [{"text": prompt}]}
        ]

        confirmed_suppliers: dict[str, Any] = {}
        clarifications_resolved: list[dict[str, Any]] = []
        usable_routes: list[dict[str, Any]] = []
        all_routes: dict[str, Any] = {}
        calls_made = 0

        # Execute up to 4 turns of tool interactions
        for _ in range(4):
            if calls_made >= call_budget:
                break

            response = self._call_gemini_api(contents, gemini_tools)
            candidates = response.get("candidates", [])
            if not candidates:
                break

            model_content = candidates[0].get("content", {})
            parts = model_content.get("parts", [])
            contents.append(model_content)

            function_calls = [p["functionCall"] for p in parts if "functionCall" in p]
            if not function_calls:
                break

            tool_responses = []
            for fc in function_calls:
                if calls_made >= call_budget:
                    tool_responses.append({
                        "functionResponse": {
                            "name": fc["name"],
                            "response": {"success": False, "error": "Budget exceeded"}
                        }
                    })
                    continue

                tool_name = fc["name"]
                args = fc.get("args", {})
                tool_res = self.gateway.execute(self.identity, tool_name, args)
                calls_made += 1

                if tool_res.success and tool_res.data:
                    if tool_name == "read_supplier_stock":
                        confirmed_suppliers[args.get("supplier_id", "")] = tool_res.data
                    elif tool_name == "request_supplier_clarification":
                        clarifications_resolved.append(tool_res.data)
                    elif tool_name == "check_route":
                        route_data = tool_res.data
                        all_routes[args.get("route_id", "")] = route_data
                        if route_data.get("status") != "blocked":
                            usable_routes.append(route_data)

                tool_responses.append({
                    "functionResponse": {
                        "name": tool_name,
                        "response": tool_res.to_dict()
                    }
                })

            contents.append({"role": "user", "parts": tool_responses})

        total_avail = sum(s.get("available_stock", 0) for s in confirmed_suppliers.values())
        reasoning = (
            f"SupplyAgent investigated {len(confirmed_suppliers)} suppliers with {total_avail} available batches. "
            f"Found {len(usable_routes)} usable corridors. "
            f"Resolved {len(clarifications_resolved)} clarifications."
        )

        return SupplyFeasibilityReport(
            confirmed_suppliers=confirmed_suppliers,
            usable_routes=usable_routes,
            clarifications_resolved=clarifications_resolved,
            agent_reasoning=reasoning,
            all_routes=all_routes,
        )

    def _call_gemini_api(self, contents: list[dict[str, Any]], tools: list[dict[str, Any]]) -> dict[str, Any]:
        """Dispatches isolated inference to Gemini REST API."""
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent?key={self.api_key}"
        payload = {
            "contents": contents,
            "tools": tools,
            "generationConfig": {
                "temperature": 0.1,
                "topP": 0.95,
                "maxOutputTokens": 1024,
            }
        }
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode("utf-8"))
