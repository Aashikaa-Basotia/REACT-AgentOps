"""
Tests for Phase 1 — Deterministic Foundation (standard library unittest).

Verifies:
1. Scenario loading and graph structure
2. Stock tracking and atomic reservations
3. Double-booking prevention
4. Idempotent replay
5. Constraint verification (stock, deadline, route, version, evidence freshness)
6. Disruption event processing (route blocking, delays, stock modifications)
7. Reservation lifecycle (reserve -> dispatch -> receive, cancel, expire)
8. Rollback behavior on partial allocation failure
"""

import unittest
from pathlib import Path

from models.scenario import load_scenario, RouteStatus
from models.inventory import ResourceState, InventoryManager
from models.evidence import EvidenceType, VerificationState
from engine.simulator import SimulationEngine
from engine.verifier import ConstraintVerifier, AllocationEntry
from engine.reservation import ReservationService, ReservationRequest

SCENARIOS_DIR = Path(__file__).parent.parent / "evaluation" / "scenarios"


class TestFoundation(unittest.TestCase):

    def setUp(self):
        self.baseline_scenario = load_scenario(SCENARIOS_DIR / "01_baseline.json")
        self.flood_scenario = load_scenario(SCENARIOS_DIR / "02_flood_basic.json")
        self.double_booking_scenario = load_scenario(SCENARIOS_DIR / "03_double_booking.json")
        self.stale_scenario = load_scenario(SCENARIOS_DIR / "05_stale_confirmation.json")
        self.infeasible_scenario = load_scenario(SCENARIOS_DIR / "06_infeasible_demand.json")

    def test_scenario_load(self):
        """Verify clean parsing of scenario configuration."""
        scenario = self.baseline_scenario
        self.assertEqual(scenario.id, "SC-01")
        self.assertEqual(len(scenario.hospitals), 3)
        self.assertEqual(len(scenario.suppliers), 2)
        self.assertEqual(len(scenario.routes), 4)
        self.assertEqual(scenario.total_demand, 20)
        self.assertEqual(scenario.total_supply, 20)

    def test_inventory_init_and_available_stock(self):
        """Verify stock tracking and calculation."""
        engine = SimulationEngine(self.baseline_scenario)
        self.assertEqual(engine.inventory.available_stock("S1"), 10)
        self.assertEqual(engine.inventory.available_stock("S2"), 10)
        self.assertEqual(engine.inventory.get_hospital_stock("H1").on_hand, 0)

    def test_atomic_reservation_success(self):
        """Verify valid reservation deducts available stock."""
        engine = SimulationEngine(self.baseline_scenario)
        service = ReservationService(engine)
        service.set_auto_approve(True)

        req = ReservationRequest(
            supplier_id="S1",
            hospital_id="H1",
            route_id="R_S1_H1",
            quantity=8,
            plan_version=1,
            idempotency_key="key_1",
        )
        result = service.reserve(req)
        self.assertTrue(result.success)
        self.assertIsNotNone(result.reservation)
        self.assertEqual(result.reservation.quantity, 8)
        self.assertEqual(result.reservation.state, ResourceState.RESERVED)

        # Check available stock updated
        self.assertEqual(engine.inventory.available_stock("S1"), 2)
        self.assertEqual(engine.inventory.total_reserved_for_hospital("H1"), 8)

    def test_double_booking_rejection(self):
        """Verify competing requests for limited stock: first succeeds, second rejected atomically."""
        engine = SimulationEngine(self.double_booking_scenario)
        service = ReservationService(engine)
        service.set_auto_approve(True)

        # H1 requests 8 batches from S1 (has 10)
        req1 = ReservationRequest(
            supplier_id="S1",
            hospital_id="H1",
            route_id="R_S1_H1",
            quantity=8,
            plan_version=1,
            idempotency_key="req_h1_8",
        )
        res1 = service.reserve(req1)
        self.assertTrue(res1.success)
        self.assertEqual(engine.inventory.available_stock("S1"), 2)

        # H2 requests 8 batches from S1 (only 2 left)
        req2 = ReservationRequest(
            supplier_id="S1",
            hospital_id="H2",
            route_id="R_S1_H2",
            quantity=8,
            plan_version=1,
            idempotency_key="req_h2_8",
        )
        res2 = service.reserve(req2)
        self.assertFalse(res2.success)
        self.assertTrue(any("INSUFFICIENT" in r or "Insufficient" in r for r in res2.failure_reasons))
        # Available stock remains 2, unchanged
        self.assertEqual(engine.inventory.available_stock("S1"), 2)

    def test_idempotent_replay(self):
        """Re-submitting the exact same idempotency key returns the prior reservation without double-deduction."""
        engine = SimulationEngine(self.baseline_scenario)
        service = ReservationService(engine)
        service.set_auto_approve(True)

        req = ReservationRequest(
            supplier_id="S1",
            hospital_id="H1",
            route_id="R_S1_H1",
            quantity=5,
            plan_version=1,
            idempotency_key="idemp_100",
        )
        res1 = service.reserve(req)
        self.assertTrue(res1.success)
        self.assertFalse(res1.idempotent_replay)
        self.assertEqual(engine.inventory.available_stock("S1"), 5)

        # Repeat call
        res2 = service.reserve(req)
        self.assertTrue(res2.success)
        self.assertTrue(res2.idempotent_replay)
        self.assertEqual(res2.reservation.id, res1.reservation.id)
        # Must NOT deduct stock a second time
        self.assertEqual(engine.inventory.available_stock("S1"), 5)

    def test_version_mismatch_rejection(self):
        """Stock changed event increments version, making prior plan version invalid."""
        engine = SimulationEngine(self.stale_scenario)
        service = ReservationService(engine)
        service.set_auto_approve(True)

        # Initial state is v1
        self.assertEqual(engine.inventory.get_supplier_stock("S1").stock_version, 1)

        # Advance clock to t=60, which processes stock_changed at t=50 (drops stock to 6, bumps to v2)
        events = engine.advance_to(60)
        self.assertEqual(len(events), 1)
        self.assertEqual(engine.inventory.get_supplier_stock("S1").stock_version, 2)
        self.assertEqual(engine.inventory.available_stock("S1"), 6)

        # Attempt reservation referencing stale v1
        req = ReservationRequest(
            supplier_id="S1",
            hospital_id="H1",
            route_id="R_S1_H1",
            quantity=6,
            plan_version=1,  # Stale version!
            idempotency_key="stale_v1_req",
        )
        res = service.reserve(req)
        self.assertFalse(res.success)
        self.assertTrue(any("VERSION MISMATCH" in r for r in res.failure_reasons))

    def test_disruption_event_blocks_route_and_verifier_fails(self):
        """When a route gets flooded/delayed, delivery through it fails verification due to missed deadline."""
        engine = SimulationEngine(self.flood_scenario)
        verifier = ConstraintVerifier(engine)

        # At t=0, route R_S2_H2 is open with 80m travel time <= 180m deadline
        self.assertEqual(engine.get_route("R_S2_H2").status, RouteStatus.OPEN)
        v0 = verifier.verify_delivery(
            supplier_id="S2",
            hospital_id="H2",
            route_id="R_S2_H2",
            quantity=6,
            plan_version=1,
        )
        self.assertTrue(v0.passed)

        # Advance past t=30 flood disruption (+300m delay)
        engine.advance_to(35)
        self.assertEqual(engine.get_route("R_S2_H2").status, RouteStatus.DELAYED)
        self.assertEqual(engine.get_route("R_S2_H2").effective_travel_time, 380)

        # Verification must fail now because arrival (35 + 380 = 415m) > deadline (180m)
        v1 = verifier.verify_delivery(
            supplier_id="S2",
            hospital_id="H2",
            route_id="R_S2_H2",
            quantity=6,
            plan_version=1,
        )
        self.assertFalse(v1.passed)
        self.assertTrue(any("LATE" in r or "deadline" in r.lower() for r in v1.failure_reasons))

    def test_reservation_lifecycle_and_delivery(self):
        """Full lifecycle: RESERVED -> IN_TRANSIT -> RECEIVED with hospital stock update."""
        engine = SimulationEngine(self.baseline_scenario)
        service = ReservationService(engine)
        service.set_auto_approve(True)

        req = ReservationRequest(
            supplier_id="S1",
            hospital_id="H1",
            route_id="R_S1_H1",
            quantity=8,
            plan_version=1,
            idempotency_key="life_key_1",
        )
        res = service.reserve(req)
        rid = res.reservation.id

        # Dispatch
        dispatched = engine.inventory.dispatch_reservation(rid, clock=engine.clock)
        self.assertEqual(dispatched.state, ResourceState.IN_TRANSIT)
        self.assertEqual(dispatched.dispatched_at, 0)

        # Advance clock to expected arrival (60 min) - automatically receives delivery
        engine.advance_to(60)

        received = engine.inventory.reservations[rid]
        self.assertEqual(received.state, ResourceState.RECEIVED)
        self.assertEqual(received.received_at, 60)

        # Hospital on-hand stock increases
        self.assertEqual(engine.inventory.get_hospital_stock("H1").on_hand, 8)
        self.assertEqual(engine.inventory.get_hospital_stock("H1").total_received, 8)

    def test_all_or_nothing_allocation_rollback(self):
        """If one delivery in an allocation fails, earlier ones in the batch rollback."""
        engine = SimulationEngine(self.double_booking_scenario)
        service = ReservationService(engine)
        service.set_auto_approve(True)

        allocations = [
            AllocationEntry(supplier_id="S1", hospital_id="H1", route_id="R_S1_H1", quantity=8, plan_version=1),
            AllocationEntry(supplier_id="S1", hospital_id="H2", route_id="R_S1_H2", quantity=8, plan_version=1),
        ]

        results = service.reserve_allocation("plan_batch_1", allocations)
        # The batch should stop and rollback
        self.assertEqual(len(results), 2)
        self.assertTrue(results[0].success)
        self.assertFalse(results[1].success)

        # Check that H1's reservation was cancelled/rolled back, freeing S1 stock back to 10
        self.assertEqual(engine.inventory.available_stock("S1"), 10)
        cancelled_res = engine.inventory.reservations[results[0].reservation.id]
        self.assertEqual(cancelled_res.state, ResourceState.CANCELLED)

    def test_feasibility_assessment(self):
        """Scenario 06 has 20 demand but S2 routes blocked at t=10."""
        engine = SimulationEngine(self.infeasible_scenario)
        verifier = ConstraintVerifier(engine)

        engine.advance_to(15)
        feasibility = verifier.assess_feasibility()
        # H3 can only be reached by S2 which is blocked
        self.assertIn("H3", feasibility["unreachable_hospitals"])
        self.assertTrue(feasibility["any_unreachable"])


if __name__ == "__main__":
    unittest.main()
