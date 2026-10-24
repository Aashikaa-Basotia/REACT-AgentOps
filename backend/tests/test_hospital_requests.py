"""
Unit and regression tests for Hospital Request submission, validation,
idempotency, session persistence, and lifecycle transitions.
"""

import unittest
from pathlib import Path
from engine.simulator import SimulationEngine
from engine.reservation import ReservationService
from models.scenario import load_scenario, resolve_scenario_file, Hospital
from models.hospital_request import HospitalRequest, RequestStatus, RequestPriority
from models.events import EventType


class TestHospitalRequests(unittest.TestCase):

    def setUp(self):
        sc_path = Path(__file__).resolve().parent.parent / "evaluation" / "scenarios" / "01_baseline.json"
        self.scenario = load_scenario(sc_path)
        self.engine = SimulationEngine(self.scenario)
        self.reservation_service = ReservationService(self.engine, auto_approve=False)

    def test_hospital_request_dataclass_validation(self):
        """Strict validation of positive quantity and positive deadline."""
        with self.assertRaises(ValueError):
            HospitalRequest(
                request_id="REQ-TEST-001",
                scenario_id="SC-01",
                hospital_id="H1",
                hospital_name="Test Hospital",
                resource_type="liquid_oxygen",
                quantity_batches=0,  # Invalid: <= 0
                deadline_minutes=120,
            )

        with self.assertRaises(ValueError):
            HospitalRequest(
                request_id="REQ-TEST-002",
                scenario_id="SC-01",
                hospital_id="H1",
                hospital_name="Test Hospital",
                resource_type="liquid_oxygen",
                quantity_batches=5,
                deadline_minutes=0,  # Invalid: <= 0
            )

        req = HospitalRequest(
            request_id="REQ-H1-001",
            scenario_id="SC-01",
            hospital_id="H1",
            hospital_name="Manipal Hospital Whitefield",
            resource_type="liquid_oxygen",
            quantity_batches=6,
            deadline_minutes=90,
            priority=RequestPriority.CRITICAL,
        )
        self.assertEqual(req.status, RequestStatus.SUBMITTED)
        self.assertEqual(req.priority, RequestPriority.CRITICAL)
        d = req.to_dict()
        self.assertEqual(d["request_id"], "REQ-H1-001")
        self.assertEqual(d["quantity_batches"], 6)
        self.assertEqual(d["status"], "SUBMITTED")

    def test_seeded_demand_separation(self):
        """Ensure original seeded demand is distinct from dynamically submitted demand."""
        h1 = self.engine.scenario.get_hospital("H1")
        original_seeded = h1.seeded_requested_batches
        self.assertEqual(original_seeded, 8)
        self.assertEqual(h1.requested_batches, 8)

        # Simulate user submitting a request for 4 batches
        req = HospitalRequest(
            request_id="REQ-H1-001",
            scenario_id="SC-01",
            hospital_id="H1",
            hospital_name=h1.name,
            resource_type="liquid_oxygen",
            quantity_batches=4,
            deadline_minutes=90,
        )
        self.engine.hospital_requests.append(req)
        h1.requested_batches += 4

        summary = self.engine.state_summary()
        h1_summary = next(h for h in summary["hospitals"] if h["id"] == "H1")
        self.assertEqual(h1_summary["seeded_batches"], 8)
        self.assertEqual(h1_summary["submitted_batches"], 4)
        self.assertEqual(h1_summary["requested_batches"], 12)
        self.assertEqual(len(summary["hospital_requests"]), 1)

    def test_session_lifecycle_and_reset(self):
        """Test session creation, request persistence, and reset behavior."""
        from server import get_or_create_session, active_sessions
        active_sessions.clear()

        session = get_or_create_session("SC-01")
        eng = session["engine"]
        self.assertEqual(len(eng.hospital_requests), 0)

        # Append request
        req = HospitalRequest(
            request_id="REQ-H2-001",
            scenario_id="SC-01",
            hospital_id="H2",
            hospital_name="Apollo Hospital Jayanagar",
            resource_type="liquid_oxygen",
            quantity_batches=5,
            deadline_minutes=110,
        )
        eng.hospital_requests.append(req)
        self.assertEqual(len(session["hospital_requests"]), 1)

        # Reset session
        active_sessions.clear()
        new_session = get_or_create_session("SC-01")
        self.assertEqual(len(new_session["engine"].hospital_requests), 0)
        self.assertEqual(new_session["engine"].scenario.get_hospital("H2").requested_batches, 8)


if __name__ == "__main__":
    unittest.main()
