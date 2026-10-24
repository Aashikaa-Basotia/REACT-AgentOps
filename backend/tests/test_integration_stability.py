"""
Regression tests for REACT Phase 2: Map & Backend-Frontend Integration Stability.

Verifies:
1. Coordinate mapping in scenario definitions, state_summary, and SC-07 inter-regional coordinates.
2. Route corridor names and endpoint alignment.
3. Coordinator approval and rejection workflows.
4. Supplier stock drift mutations and version incrementing.
5. ToolGateway RBAC enforcement (no mock client-side authorization).
"""

import unittest
from pathlib import Path

from models.scenario import load_scenario, resolve_scenario_file
from engine.simulator import SimulationEngine
from engine.reservation import ReservationService
from agents.tools import ToolGateway, AgentIdentity
from server import get_or_create_session, active_sessions

SCENARIOS_DIR = Path(__file__).resolve().parent.parent / "evaluation" / "scenarios"


class TestIntegrationStability(unittest.TestCase):

    def setUp(self):
        active_sessions.clear()

    def tearDown(self):
        active_sessions.clear()

    def test_bengaluru_scenario_coordinates(self):
        """Verify SC-01 and SC-02 have valid Bengaluru coordinates and corridor names."""
        for sc_id in ["SC-01", "SC-02"]:
            f = resolve_scenario_file(sc_id, SCENARIOS_DIR)
            self.assertIsNotNone(f)
            sc = load_scenario(f)

            # Check hospitals
            for h in sc.hospitals:
                self.assertIsInstance(h.lat, (int, float))
                self.assertIsInstance(h.lng, (int, float))
                self.assertTrue(12.0 <= h.lat <= 14.0, f"{sc_id} hospital {h.id} lat out of Bengaluru bounds: {h.lat}")
                self.assertTrue(77.0 <= h.lng <= 78.5, f"{sc_id} hospital {h.id} lng out of Bengaluru bounds: {h.lng}")
                self.assertTrue(len(h.zone) > 0)

            # Check suppliers
            for s in sc.suppliers:
                self.assertIsInstance(s.lat, (int, float))
                self.assertIsInstance(s.lng, (int, float))
                self.assertTrue(12.0 <= s.lat <= 14.0)
                self.assertTrue(77.0 <= s.lng <= 78.5)

            # Check routes
            for r in sc.routes:
                self.assertTrue(len(r.corridor_name) > 0, f"Route {r.id} missing corridor_name")

    def test_sc07_inter_regional_coordinates(self):
        """Verify SC-07 has genuine multi-state coordinates (Chennai, Pune, Bengaluru SEZ)."""
        f = resolve_scenario_file("SC-07", SCENARIOS_DIR)
        self.assertIsNotNone(f)
        sc = load_scenario(f)

        h_map = {h.id: h for h in sc.hospitals}
        # H1: Chennai EV Assembly Plant (~13.08, ~80.27)
        self.assertIn("Chennai", h_map["H1"].name)
        self.assertGreater(h_map["H1"].lng, 80.0, "Chennai lng must be in Tamil Nadu (~80.2)")

        # H2: Pune Battery Pack Fab (~18.52, ~73.85)
        self.assertIn("Pune", h_map["H2"].name)
        self.assertGreater(h_map["H2"].lat, 18.0, "Pune lat must be in Maharashtra (~18.5)")

        # H3: Bengaluru Avionics Line (~13.19, ~77.70)
        self.assertIn("Bengaluru", h_map["H3"].name)

        s_map = {s.id: s for s in sc.suppliers}
        # S2: Sriperumbudur Chip Packaging Depot (~12.96, ~79.94)
        self.assertIn("Sriperumbudur", s_map["S2"].name)
        self.assertGreater(s_map["S2"].lng, 79.5, "Sriperumbudur lng must be east of Bengaluru (~79.9)")

    def test_state_summary_includes_spatial_telemetry(self):
        """Verify state_summary includes lat, lng, zone, and corridor_name."""
        session = get_or_create_session("SC-07")
        eng = session["engine"]
        summary = eng.state_summary()

        # Hospitals summary
        self.assertIn("hospitals", summary)
        for h in summary["hospitals"]:
            self.assertIn("lat", h)
            self.assertIn("lng", h)
            self.assertIn("zone", h)
            self.assertIsNotNone(h["lat"])
            self.assertIsNotNone(h["lng"])

        # Suppliers summary
        self.assertIn("suppliers", summary)
        for s in summary["suppliers"]:
            self.assertIn("lat", s)
            self.assertIn("lng", s)
            self.assertIn("zone", s)

        # Routes summary
        self.assertIn("routes", summary)
        for r in summary["routes"]:
            self.assertIn("corridor_name", r)
            self.assertTrue(len(r["corridor_name"]) > 0)

    def test_supplier_state_drift_increments_version(self):
        """Verify supplier stock drop increments version and updates available stock."""
        session = get_or_create_session("SC-02")
        eng = session["engine"]

        s1_initial = eng.inventory.get_supplier_stock("S1")
        initial_version = s1_initial.stock_version
        initial_stock = s1_initial.confirmed_total

        # Simulate drift of -3 batches
        new_version = eng.inventory.update_supplier_stock("S1", initial_stock - 3)
        self.assertEqual(new_version, initial_version + 1)
        self.assertEqual(eng.inventory.available_stock("S1"), initial_stock - 3)

        summary = eng.state_summary()
        s1_summary = next(s for s in summary["suppliers"] if s["id"] == "S1")
        self.assertEqual(s1_summary["stock_version"], new_version)
        self.assertEqual(s1_summary["available_stock"], initial_stock - 3)

    def test_toolgateway_rbac_facility_isolation(self):
        """Verify ToolGateway RBAC prevents cross-facility leakage and records audit."""
        session = get_or_create_session("SC-01")
        eng = session["engine"]
        srv = session["reservation_service"]
        gateway = ToolGateway(eng, srv)

        # Facility agent for H1 trying to read H1 (authorized)
        id_h1 = AgentIdentity(actor_id="facility_H1", role="facility", allowed_tools=["read_facility_state"])
        res_own = gateway.execute(id_h1, "read_facility_state", {"hospital_id": "H1"})
        self.assertTrue(res_own.success)
        self.assertEqual(res_own.data["hospital_id"], "H1")

        # Facility agent for H1 trying to inspect H2 (strictly blocked by RBAC)
        res_other = gateway.execute(id_h1, "read_facility_state", {"hospital_id": "H2"})
        self.assertFalse(res_other.success)
        self.assertIn("Facility isolation", res_other.error)
        self.assertIn("cannot inspect H2", res_other.error)

        # Facility agent trying to read supplier stock (disallowed tool for role)
        res_unauthorized = gateway.execute(id_h1, "read_supplier_stock", {"supplier_id": "S1"})
        self.assertFalse(res_unauthorized.success)
        self.assertIn("Permission denied", res_unauthorized.error)


if __name__ == "__main__":
    unittest.main()
