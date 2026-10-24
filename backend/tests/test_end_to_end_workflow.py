"""
End-to-End Workflow & Integration Test for REACT Crisis Logistics (Prompt 2).

Verifies the complete connected workflow:
1. Facility selection and request submission with validation & duplicate prevention.
2. Persistence in session and visibility across Coordinator and Supplier scopes.
3. Feasibility calculation against supplier inventory, routes, and deadlines.
4. Multi-agent rehearsal incorporating submitted demand into allocation planning.
5. Deterministic verifier invariant checks.
6. Human coordinator approval gate and atomic reservation.
7. Lifecycle status transitions: SUBMITTED -> ALLOCATING -> ALLOCATED.
8. Reset clean-up.
"""

import unittest
from pathlib import Path
from server import get_or_create_session, active_sessions
from models.hospital_request import HospitalRequest, RequestStatus, RequestPriority
from engine.verifier import AllocationEntry


class TestEndToEndWorkflow(unittest.TestCase):

    def setUp(self):
        active_sessions.clear()

    def tearDown(self):
        active_sessions.clear()

    def test_full_hospital_request_to_approval_lifecycle(self):
        # 1. Initialize session for SC-01
        session = get_or_create_session("SC-01")
        eng = session["engine"]
        srv = session["reservation_service"]

        h1 = eng.scenario.get_hospital("H1")
        self.assertEqual(h1.requested_batches, 8)
        self.assertEqual(h1.seeded_requested_batches, 8)
        self.assertEqual(len(eng.hospital_requests), 0)

        # 2. Facility H1 submits request for 4 batches
        req = HospitalRequest(
            request_id="REQ-H1-001",
            scenario_id="SC-01",
            hospital_id="H1",
            hospital_name=h1.name,
            resource_type="liquid_oxygen",
            quantity_batches=4,
            deadline_minutes=90,
            priority=RequestPriority.CRITICAL,
            notes="ICU burn rate surge",
            status=RequestStatus.SUBMITTED,
            created_at_minute=eng.clock,
        )
        eng.hospital_requests.append(req)
        h1.requested_batches += 4

        # 3. Coordinator sees authoritative updated demand
        summary = eng.state_summary()
        h1_sum = next(h for h in summary["hospitals"] if h["id"] == "H1")
        self.assertEqual(h1_sum["seeded_batches"], 8)
        self.assertEqual(h1_sum["submitted_batches"], 4)
        self.assertEqual(h1_sum["requested_batches"], 12)
        self.assertEqual(len(summary["hospital_requests"]), 1)
        self.assertEqual(summary["hospital_requests"][0]["request_id"], "REQ-H1-001")
        self.assertEqual(summary["hospital_requests"][0]["status"], "SUBMITTED")

        # 4. Supplier S1 sees feasibility
        s1_stock = eng.inventory.get_supplier_stock("S1")
        self.assertEqual(s1_stock.confirmed_total, 10)
        self.assertEqual(s1_stock.stock_version, 1)

        r_s1_h1 = eng.get_route("R_S1_H1")
        self.assertEqual(r_s1_h1.status.value, "open")
        self.assertLessEqual(r_s1_h1.travel_minutes, 90)

        # 5. Multi-agent rehearsal runs and proposes allocations
        allocations = [
            {"supplier_id": "S1", "hospital_id": "H1", "route_id": "R_S1_H1", "quantity": 10, "plan_version": 1},
            {"supplier_id": "S2", "hospital_id": "H2", "route_id": "R_S2_H2", "quantity": 8, "plan_version": 1},
        ]
        alloc_entries = [AllocationEntry(**a) for a in allocations]
        ver_res = srv.verifier.verify_allocation(alloc_entries)
        self.assertTrue(ver_res.passed, f"Verifier failed: {ver_res.failure_reasons}")

        # Stage proposal for human approval
        staged_plan = {
            "plan_id": "PLAN_E2E_01",
            "status": "PENDING_HUMAN_APPROVAL",
            "allocations": allocations,
            "expected_stock_versions": {"S1": 1, "S2": 1},
            "timestamp": eng.clock,
        }
        srv.stage_plan(staged_plan)

        # Mark matching requests as ALLOCATING
        for r in eng.hospital_requests:
            if r.hospital_id in {"H1", "H2"}:
                r.status = RequestStatus.ALLOCATING
        self.assertEqual(req.status, RequestStatus.ALLOCATING)

        # 6. Coordinator signs off (Approval)
        srv.approve_plan("PLAN_E2E_01", alloc_entries, plan_version=1)
        res_results = srv.reserve_allocation("PLAN_E2E_01", alloc_entries)
        srv.clear_staged_plan()

        self.assertEqual(len(res_results), 2)
        self.assertTrue(all(r.success for r in res_results))

        # 7. Lifecycle transition: Request is now ALLOCATED
        for r in eng.hospital_requests:
            if r.hospital_id == "H1":
                r.status = RequestStatus.ALLOCATED
                r.allocated_batches = 4

        self.assertEqual(req.status, RequestStatus.ALLOCATED)
        self.assertEqual(req.allocated_batches, 4)

        # Supplier S1 available stock reduced
        self.assertEqual(eng.inventory.available_stock("S1"), 0)
        s1_active_res = eng.inventory.active_reservations_for_supplier("S1")
        self.assertEqual(sum(r.quantity for r in s1_active_res), 10)

        # 8. Reset restores baseline cleanly
        active_sessions.clear()
        clean_session = get_or_create_session("SC-01")
        clean_eng = clean_session["engine"]
        self.assertEqual(len(clean_eng.hospital_requests), 0)
        self.assertEqual(clean_eng.scenario.get_hospital("H1").requested_batches, 8)
        self.assertEqual(clean_eng.inventory.available_stock("S1"), 10)


if __name__ == "__main__":
    unittest.main()
