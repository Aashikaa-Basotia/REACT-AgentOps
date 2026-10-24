"""
Regression tests for Phase 2: Scenario Selection and Simulation Recovery.

Verifies:
1. SC-01 loads the baseline scenario.
2. SC-02 loads the actual flood scenario with declared ID and disruptions.
3. Non-baseline scenarios (e.g., SC-03, SC-07) resolve and load correctly.
4. Unknown scenario IDs raise KeyError and are rejected (not falling back to baseline).
5. Flood route disruptions are present in the loaded SC-02 state when clock advances.
6. Staged human approval plans are preserved across session retrievals.
"""

import unittest
from pathlib import Path

from models.scenario import resolve_scenario_file, load_scenario, RouteStatus
from server import get_or_create_session, active_sessions
from engine.reservation import ReservationService


class TestScenarioLoading(unittest.TestCase):

    def setUp(self):
        active_sessions.clear()

    def tearDown(self):
        active_sessions.clear()

    def test_resolve_scenario_file_exact_ids(self):
        """Verify scenario resolution by declared scenario id."""
        p1 = resolve_scenario_file("SC-01")
        self.assertIsNotNone(p1)
        self.assertEqual(p1.name, "01_baseline.json")

        p2 = resolve_scenario_file("SC-02")
        self.assertIsNotNone(p2)
        self.assertEqual(p2.name, "02_flood_basic.json")

        p3 = resolve_scenario_file("SC-03")
        self.assertIsNotNone(p3)
        self.assertEqual(p3.name, "03_double_booking.json")

        p7 = resolve_scenario_file("SC-07")
        self.assertIsNotNone(p7)
        self.assertEqual(p7.name, "07_semiconductor_jit_accelerator.json")

    def test_resolve_scenario_file_case_insensitivity(self):
        """Verify resolution works with lower/mixed case."""
        p2_lower = resolve_scenario_file("sc-02")
        self.assertIsNotNone(p2_lower)
        self.assertEqual(p2_lower.name, "02_flood_basic.json")

    def test_resolve_scenario_file_filename_stem(self):
        """Verify fallback resolution by filename stem."""
        p = resolve_scenario_file("02_flood_basic")
        self.assertIsNotNone(p)
        self.assertEqual(p.name, "02_flood_basic.json")

    def test_resolve_scenario_unknown_id(self):
        """Verify unknown scenario id returns None and does not select baseline."""
        self.assertIsNone(resolve_scenario_file("SC-99"))
        self.assertIsNone(resolve_scenario_file("UNKNOWN_SCENARIO"))
        self.assertIsNone(resolve_scenario_file(""))

    def test_get_or_create_session_loads_correct_scenario(self):
        """Verify get_or_create_session loads the requested scenario."""
        session_sc01 = get_or_create_session("SC-01")
        self.assertEqual(session_sc01["engine"].scenario.id, "SC-01")
        self.assertIn("Baseline", session_sc01["engine"].scenario.name)

        session_sc02 = get_or_create_session("SC-02")
        self.assertEqual(session_sc02["engine"].scenario.id, "SC-02")
        self.assertIn("Flood", session_sc02["engine"].scenario.name)

        session_sc07 = get_or_create_session("SC-07")
        self.assertEqual(session_sc07["engine"].scenario.id, "SC-07")

    def test_get_or_create_session_rejects_unknown(self):
        """Verify unknown scenario raises KeyError instead of loading baseline."""
        with self.assertRaises(KeyError):
            get_or_create_session("SC-999")
        with self.assertRaises(KeyError):
            get_or_create_session("NON_EXISTENT")

    def test_sc02_flood_disruptions_present(self):
        """Verify SC-02 actually contains and fires flood route disruptions at t=30."""
        session = get_or_create_session("SC-02")
        eng = session["engine"]

        # Before t=30, routes are open
        self.assertEqual(eng.routes["R_S2_H2"].delay_minutes, 0)
        self.assertEqual(eng.routes["R_S2_H2"].status, RouteStatus.OPEN)

        # Advance to t=30
        eng.advance_to(30)

        # Flood disruption must be active on R_S2_H2
        self.assertEqual(eng.routes["R_S2_H2"].delay_minutes, 300)
        self.assertEqual(eng.routes["R_S2_H2"].status, RouteStatus.DELAYED)

        # Disruption event recorded in engine
        fired_types = [e.event_type for e in eng._processed_events]
        self.assertIn("route_delayed", fired_types)

    def test_staged_plan_preserved_across_session_reads(self):
        """Verify staging a plan persists in session and is not wiped on retrieval."""
        session = get_or_create_session("SC-02")
        res_svc = session["reservation_service"]

        staged_data = {
            "plan_id": "test-plan-1",
            "proposals": [
                {
                    "hospital_id": "H1",
                    "supplier_id": "S1",
                    "quantity": 8,
                    "route_id": "R_S1_H1",
                    "delivery_time": 60,
                }
            ],
            "timestamp": 40,
        }
        res_svc.stage_plan(staged_data)

        # Read session again
        session_read = get_or_create_session("SC-02")
        staged = session_read["reservation_service"].get_staged_plan()
        self.assertIsNotNone(staged)
        self.assertEqual(staged["plan_id"], "test-plan-1")

        # Advancing clock forward should also preserve staged plan
        session_read["engine"].advance_to(50)
        self.assertIsNotNone(session_read["reservation_service"].get_staged_plan())


if __name__ == "__main__":
    unittest.main()
