"""
Multi-Agent Coordinator System (REACT Core Innovation).

Consists of:
1. Facility Agents: Context-isolated guardians of local hospital demand and deadlines.
2. Supply Coordinator Agent: Investigates supplier stock, verifies corridors, resolves ambiguities.
3. Rehearsal Supervisor: Orchestrates parallel sub-agent investigations, unifies evidence,
   and constructs verifiable allocation proposals subject to human review.
"""

from __future__ import annotations

import os
import time
import uuid
from typing import Any

from agents.tools import ToolGateway, AgentIdentity
from agents.facility import FacilityAgent, FacilityAssessmentReport
from agents.supply import SupplyAgent, SupplyFeasibilityReport
from agents.supervisor import RehearsalSupervisor
from engine.simulator import SimulationEngine
from engine.reservation import ReservationService


class MultiAgentSystem:
    """
    Coordinates genuine context-isolated sub-agents (FacilityAgent instances for each hospital,
    SupplyAgent for supplier/route intelligence) orchestrated by RehearsalSupervisor.
    """

    def __init__(
        self,
        engine: SimulationEngine,
        reservation_service: ReservationService,
        call_budget: int = 16,
        interactive_mode: bool = False,
        api_key: str | None = None,
        deterministic_only: bool = False,
    ):
        self.engine = engine
        self.reservation_service = reservation_service
        self.gateway = ToolGateway(engine, reservation_service)
        self.call_budget = call_budget
        self.interactive_mode = interactive_mode
        self.deterministic_only = deterministic_only
        self.api_key = None if deterministic_only else (api_key or os.getenv("GEMINI_API_KEY"))

        # Context-isolated sub-agents instantiated as distinct objects with dedicated RBAC
        self.facility_agents = {
            h.id: FacilityAgent(h.id, self.gateway, api_key=self.api_key, deterministic_only=self.deterministic_only)
            for h in engine.scenario.hospitals
        }
        self.supply_agent = SupplyAgent(self.gateway, api_key=self.api_key, deterministic_only=self.deterministic_only)

        # Supervisor identity: strictly coordination and debrief
        self.supervisor_identity = AgentIdentity(
            actor_id="rehearsal_supervisor",
            role="supervisor",
            allowed_tools=[
                "propose_allocation",
                "reserve_approved_plan",
                "write_debrief"
            ]
        )

    def run(self, interactive_mode: bool | None = None) -> dict[str, Any]:
        im = self.interactive_mode if interactive_mode is None else interactive_mode
        supervisor = RehearsalSupervisor(
            self.engine,
            self.reservation_service,
            call_budget=self.call_budget,
            interactive_mode=im,
            facility_agents=self.facility_agents,
            supply_agent=self.supply_agent,
            api_key=self.api_key,
            deterministic_only=self.deterministic_only,
        )
        return supervisor.run()


__all__ = [
    "MultiAgentSystem",
    "FacilityAgent",
    "SupplyAgent",
    "FacilityAssessmentReport",
    "SupplyFeasibilityReport",
]
