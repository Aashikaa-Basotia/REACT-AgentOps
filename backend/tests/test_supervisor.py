"""
Unit tests for RehearsalSupervisor and Gemini tool bindings.
"""

import os
import unittest
from pathlib import Path

from models.scenario import load_scenario
from engine.simulator import SimulationEngine
from engine.reservation import ReservationService
from agents.tools import ToolGateway
from agents.supervisor import RehearsalSupervisor, HARD_CEILING_TOOL_CALLS

SCENARIOS_DIR = Path(__file__).parent.parent / "evaluation" / "scenarios"


class TestRehearsalSupervisor(unittest.TestCase):

    def setUp(self):
        self.sc_path = SCENARIOS_DIR / "01_baseline.json"
        self.scenario = load_scenario(self.sc_path)
        self.engine = SimulationEngine(self.scenario)
        self.reservation_service = ReservationService(self.engine)

    def test_gemini_tool_declarations_binding(self):
        """Verify all 8 tools are bound to valid Gemini function declarations."""
        gateway = ToolGateway(self.engine, self.reservation_service)
        declarations = gateway.get_gemini_tool_declarations()
        
        self.assertEqual(len(declarations), 8)
        tool_names = {d["name"] for d in declarations}
        expected_names = {
            "read_facility_state",
            "read_supplier_stock",
            "request_supplier_clarification",
            "check_route",
            "check_delivery_proposal",
            "propose_allocation",
            "reserve_approved_plan",
            "write_debrief",
        }
        self.assertEqual(tool_names, expected_names)

        # Check parameter schema structure
        for d in declarations:
            self.assertIn("parameters", d)
            self.assertEqual(d["parameters"]["type"], "object")
            self.assertIn("properties", d["parameters"])

    def test_fallback_when_api_key_missing(self):
        """Verify graceful fallback to mock response loop when GEMINI_API_KEY is unset."""
        orig_key = os.environ.pop("GEMINI_API_KEY", None)
        try:
            supervisor = RehearsalSupervisor(self.engine, self.reservation_service)
            res = supervisor.run()

            self.assertEqual(res["approach"], "multi_agent")
            self.assertLessEqual(res["tool_calls"], HARD_CEILING_TOOL_CALLS)
            self.assertEqual(res["invalid_proposals"], 0)
            self.assertEqual(res["unmet_batches"], 0)
            self.assertGreater(res["tool_calls"], 0)
        finally:
            if orig_key:
                os.environ["GEMINI_API_KEY"] = orig_key

    def test_supervisor_hard_ceiling_enforcement(self):
        """Verify supervisor respects call budget and hard ceiling of 12."""
        supervisor = RehearsalSupervisor(self.engine, self.reservation_service, call_budget=6, deterministic_only=True)
        res = supervisor.run()
        self.assertLessEqual(res["tool_calls"], 6)


if __name__ == "__main__":
    unittest.main()
