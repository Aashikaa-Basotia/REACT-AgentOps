"""
Context-isolated Facility Agent for REACT Multi-Agent System.

Each FacilityAgent instance represents a single hospital/healthcare facility,
possessing its own context, local constraints, and strict RBAC isolation
(scoped strictly to read_facility_state for its assigned hospital).
"""

from __future__ import annotations

import os
import json
import logging
import urllib.request
import urllib.error
from dataclasses import dataclass, asdict
from typing import Any

from agents.tools import ToolGateway, AgentIdentity
from models.events import EventType

logger = logging.getLogger("react.facility_agent")


@dataclass
class FacilityAssessmentReport:
    """Standardized assessment report returned by FacilityAgent."""
    facility_id: str
    current_stock: int
    required_batches: int
    deficit: int
    deadline_minutes: int
    urgency_rank: int
    agent_reasoning: str

    def to_dict(self) -> dict[str, Any]:
        d = asdict(self)
        # Aliases for backward compatibility with existing supervisors and routes
        d["hospital_id"] = self.facility_id
        d["requested_batches"] = self.required_batches
        return d


class FacilityAgent:
    """
    Sub-agent representing a single healthcare facility.
    Enforces strict context and RBAC isolation:
    can only inspect its own hospital state via read_facility_state.
    """

    def __init__(
        self,
        hospital_id: str,
        gateway: ToolGateway,
        model: str = "gemini-flash-lite-latest",
        api_key: str | None = None,
        deterministic_only: bool = False,
    ):
        self.hospital_id = hospital_id
        self.facility_id = hospital_id  # alias
        self.gateway = gateway
        self.model = model
        self.deterministic_only = deterministic_only
        self.api_key = None if deterministic_only else (api_key if api_key is not None else os.getenv("GEMINI_API_KEY"))

        # Strict RBAC identity: only allowed to call read_facility_state for self.hospital_id
        self.identity = AgentIdentity(
            actor_id=f"facility_{hospital_id}",
            role="facility",
            allowed_tools=["read_facility_state"]
        )

    def report_status(self) -> dict[str, Any]:
        """Fetch raw local facility demand and stock."""
        res = self.gateway.execute(
            self.identity,
            "read_facility_state",
            {"hospital_id": self.hospital_id}
        )
        return res.data if res.success else {}

    def assess_facility_need(self, current_time: int = 0) -> dict[str, Any]:
        """
        Assess local facility replenishment needs in an isolated sub-agent turn.
        Dual-mode: Gemini LLM inference if GEMINI_API_KEY is configured;
        deterministic assessment otherwise.
        """
        if self.api_key:
            try:
                return self._assess_with_gemini(current_time)
            except Exception as e:
                logger.warning(
                    f"[{self.identity.actor_id}] Gemini inference failed ({e}). "
                    "Falling back to deterministic assessment."
                )

        return self._assess_deterministic(current_time)

    def _assess_deterministic(self, current_time: int) -> dict[str, Any]:
        """Deterministic local assessment executed strictly using self.identity."""
        res = self.gateway.execute(
            self.identity,
            "read_facility_state",
            {"hospital_id": self.hospital_id}
        )
        if not res.success or not res.data:
            return FacilityAssessmentReport(
                facility_id=self.hospital_id,
                current_stock=0,
                required_batches=0,
                deficit=0,
                deadline_minutes=999,
                urgency_rank=3,
                agent_reasoning=f"Failed to read facility state: {res.error}"
            ).to_dict()

        data = res.data
        on_hand = data.get("on_hand_stock", 0)
        received = data.get("total_received", 0)
        current_stock = on_hand + received
        required = data.get("requested_batches", 0)
        reserved = data.get("reserved_incoming", 0)
        deficit = max(0, required - current_stock - reserved)
        deadline = data.get("deadline_minutes", 0)

        # Urgency rank: 1 (critical, <= 60m), 2 (moderate, <= 180m), 3 (normal)
        time_to_deadline = deadline - current_time
        if deficit > 0:
            if time_to_deadline <= 60:
                urgency = 1
            elif time_to_deadline <= 180:
                urgency = 2
            else:
                urgency = 3
        else:
            urgency = 4

        reasoning = (
            f"Hospital {self.hospital_id} currently holds {current_stock} batches "
            f"against demand of {required} batches. Net replenishment deficit is {deficit} batches. "
            f"Replenishment deadline is T+{deadline}m (margin: {time_to_deadline}m). Urgency rank: {urgency}."
        )

        report = FacilityAssessmentReport(
            facility_id=self.hospital_id,
            current_stock=current_stock,
            required_batches=required,
            deficit=deficit,
            deadline_minutes=deadline,
            urgency_rank=urgency,
            agent_reasoning=reasoning
        )
        return report.to_dict()

    def _assess_with_gemini(self, current_time: int) -> dict[str, Any]:
        """Isolated Gemini 2.5 Flash prompt scoped strictly to this hospital's local context."""
        # Scoped tool declarations: ONLY read_facility_state
        tool_declarations = [
            decl for decl in self.gateway.get_gemini_tool_declarations()
            if decl["name"] == "read_facility_state"
        ]
        gemini_tools = [{"function_declarations": tool_declarations}]

        prompt = f"""You are the isolated Facility Agent for hospital '{self.hospital_id}' in the REACT crisis system.
Current simulation clock: T = {current_time}m.
Your mission is to query your local facility state, determine your exact inventory deficit and replenishment deadline, and assess urgency.
You have access strictly to one tool: read_facility_state(hospital_id).
Call read_facility_state for your assigned hospital '{self.hospital_id}'.
"""

        contents: list[dict[str, Any]] = [
            {"role": "user", "parts": [{"text": prompt}]}
        ]

        # Single-turn or tool execution turn
        response = self._call_gemini_api(contents, gemini_tools)
        candidates = response.get("candidates", [])
        if not candidates:
            return self._assess_deterministic(current_time)

        model_content = candidates[0].get("content", {})
        parts = model_content.get("parts", [])

        # Execute any requested tool calls through ToolGateway
        state_data = None
        for part in parts:
            if "functionCall" in part:
                fc = part["functionCall"]
                tool_name = fc.get("name")
                args = fc.get("args", {})
                # Enforce RBAC through ToolGateway
                res = self.gateway.execute(self.identity, tool_name, args)
                if res.success:
                    state_data = res.data

        if not state_data:
            return self._assess_deterministic(current_time)

        # Build report from tool data with model reasoning
        on_hand = state_data.get("on_hand_stock", 0)
        received = state_data.get("total_received", 0)
        current_stock = on_hand + received
        required = state_data.get("requested_batches", 0)
        reserved = state_data.get("reserved_incoming", 0)
        deficit = max(0, required - current_stock - reserved)
        deadline = state_data.get("deadline_minutes", 0)
        time_to_deadline = deadline - current_time

        urgency = 1 if time_to_deadline <= 60 else (2 if time_to_deadline <= 180 else 3)
        if deficit == 0:
            urgency = 4

        # Extract text parts if any
        text_parts = [p.get("text", "") for p in parts if "text" in p]
        model_text = " ".join(text_parts).strip()
        reasoning = model_text or (
            f"Hospital {self.hospital_id} has {current_stock} batches on hand vs {required} requested. "
            f"Deficit: {deficit} batches. Deadline: T+{deadline}m. Urgency: {urgency}."
        )

        return FacilityAssessmentReport(
            facility_id=self.hospital_id,
            current_stock=current_stock,
            required_batches=required,
            deficit=deficit,
            deadline_minutes=deadline,
            urgency_rank=urgency,
            agent_reasoning=reasoning
        ).to_dict()

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
