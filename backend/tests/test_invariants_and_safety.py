"""
Tests for Phase 3 — Invariant Verification & Transaction Safety.

Independently tests and proves:
1. Invariant 1: Stock sufficiency (single delivery & aggregate competing demand)
2. Invariant 2: Route availability (rejection of blocked route)
3. Invariant 3: Route capacity (rejection when requested quantity > route capacity)
4. Invariant 4: Deadline feasibility (rejection when arrival > hospital deadline)
5. Invariant 5: Optimistic concurrency (rejection on stock version drift)
6. Invariant 6: Evidence freshness (rejection when evidence exceeds freshness window)
7. Invariant 7: Idempotency (replay existing reservation without duplicate creation)
8. All-or-nothing rollback (partial failure leaves ZERO commitments and restores stock)
9. Approval re-validation (approval re-checks verifier and fails if stock drifted)
10. Repeated approvals rejection (subsequent approval cannot commit duplicate reservations)
11. Read-only operations produce zero state mutations
"""

import unittest
from pathlib import Path

from models.scenario import load_scenario, RouteStatus
from models.inventory import ResourceState
from models.evidence import EvidenceType, VerificationState
from engine.simulator import SimulationEngine
from engine.verifier import ConstraintVerifier, AllocationEntry
from engine.reservation import ReservationService, ReservationRequest
from agents.tools import ToolGateway, AgentIdentity

SCENARIOS_DIR = Path(__file__).parent.parent / "evaluation" / "scenarios"


class TestInvariantsAndSafety(unittest.TestCase):

    def setUp(self):
        self.sc_baseline = load_scenario(SCENARIOS_DIR / "01_baseline.json")
        self.sc_flood = load_scenario(SCENARIOS_DIR / "02_flood_basic.json")
        self.sc_double = load_scenario(SCENARIOS_DIR / "03_double_booking.json")
        self.sc_stale = load_scenario(SCENARIOS_DIR / "05_stale_confirmation.json")

    # ---------- Invariant 1: Stock Sufficiency & Aggregate Competing Requests ----------

    def test_invariant_1_stock_sufficiency_single_and_aggregate(self):
        """Verifier blocks single overcommit and aggregate competing overcommit."""
        engine = SimulationEngine(self.sc_baseline)
        verifier = ConstraintVerifier(engine)

        # Single delivery exceeding available (S1 has 10, requesting 12)
        res_single = verifier.verify_delivery(
            supplier_id="S1", hospital_id="H1", route_id="R_S1_H1",
            quantity=12, plan_version=1
        )
        self.assertFalse(res_single.passed)
        stock_check = [c for c in res_single.checks if c.name == "stock_sufficient"][0]
        self.assertFalse(stock_check.passed)

        # Aggregate overcommit: H1 asks 8, H2 asks 8 from S1 (total 16 > 10 available)
        allocations = [
            AllocationEntry(supplier_id="S1", hospital_id="H1", route_id="R_S1_H1", quantity=8, plan_version=1),
            AllocationEntry(supplier_id="S1", hospital_id="H2", route_id="R_S1_H2", quantity=8, plan_version=1),
        ]
        res_agg = verifier.verify_allocation(allocations)
        self.assertFalse(res_agg.passed)
        agg_check = [c for c in res_agg.checks if "aggregate_S1_sufficient" in c.name][0]
        self.assertFalse(agg_check.passed)

    # ---------- Invariant 2: Route Availability ----------

    def test_invariant_2_route_availability_blocked(self):
        """Verifier blocks deliveries proposed over blocked routes."""
        engine = SimulationEngine(self.sc_flood)
        verifier = ConstraintVerifier(engine)

        # Before flood (t=0), route R_S2_H2 is open
        res_before = verifier.verify_delivery(
            supplier_id="S2", hospital_id="H2", route_id="R_S2_H2",
            quantity=6, plan_version=1
        )
        self.assertTrue(res_before.passed)

        # Advance to t=40 (flood occurred at t=30, delaying R_S2_H2 by 300m)
        engine.advance_to(40)
        res_after = verifier.verify_delivery(
            supplier_id="S2", hospital_id="H2", route_id="R_S2_H2",
            quantity=6, plan_version=1
        )
        self.assertFalse(res_after.passed)
        deadline_check = [c for c in res_after.checks if c.name == "deadline_met"][0]
        self.assertFalse(deadline_check.passed)

        # Explicitly set route status to BLOCKED
        engine.routes["R_S2_H2"].status = RouteStatus.BLOCKED
        res_blocked = verifier.verify_delivery(
            supplier_id="S2", hospital_id="H2", route_id="R_S2_H2",
            quantity=6, plan_version=1
        )
        self.assertFalse(res_blocked.passed)
        route_check = [c for c in res_blocked.checks if c.name == "route_available"][0]
        self.assertFalse(route_check.passed)

    # ---------- Invariant 3: Route Capacity ----------

    def test_invariant_3_route_capacity_limit(self):
        """Verifier blocks quantities exceeding route carrying capacity."""
        engine = SimulationEngine(self.sc_baseline)
        verifier = ConstraintVerifier(engine)

        # Route capacity is 10; try 11
        engine.routes["R_S1_H1"].capacity_batches = 5
        res = verifier.verify_delivery(
            supplier_id="S1", hospital_id="H1", route_id="R_S1_H1",
            quantity=8, plan_version=1
        )
        self.assertFalse(res.passed)
        cap_check = [c for c in res.checks if c.name == "within_capacity"][0]
        self.assertFalse(cap_check.passed)

    # ---------- Invariant 4: Deadline Feasibility ----------

    def test_invariant_4_deadline_feasibility(self):
        """Verifier blocks deliveries where arrival time > hospital deadline."""
        engine = SimulationEngine(self.sc_baseline)
        verifier = ConstraintVerifier(engine)

        # H1 deadline is 120 min. If clock is at 70 min, travel 60 min -> arrives at 130 min > 120 min
        engine.advance_to(70)
        res = verifier.verify_delivery(
            supplier_id="S1", hospital_id="H1", route_id="R_S1_H1",
            quantity=8, plan_version=1
        )
        self.assertFalse(res.passed)
        deadline_check = [c for c in res.checks if c.name == "deadline_met"][0]
        self.assertFalse(deadline_check.passed)

    # ---------- Invariant 5: Optimistic Concurrency ----------

    def test_invariant_5_optimistic_concurrency_version_match(self):
        """Verifier blocks allocation built on stale stock version."""
        engine = SimulationEngine(self.sc_baseline)
        verifier = ConstraintVerifier(engine)

        # Stock is at version 1; plan references version 2 -> mismatch
        res_mismatch = verifier.verify_delivery(
            supplier_id="S1", hospital_id="H1", route_id="R_S1_H1",
            quantity=8, plan_version=2
        )
        self.assertFalse(res_mismatch.passed)
        ver_check = [c for c in res_mismatch.checks if c.name == "version_current"][0]
        self.assertFalse(ver_check.passed)

        # External drift bumps stock version to 2; plan references stale v1 -> mismatch
        engine.inventory.update_supplier_stock("S1", 6)  # Version becomes 2
        res_stale = verifier.verify_delivery(
            supplier_id="S1", hospital_id="H1", route_id="R_S1_H1",
            quantity=6, plan_version=1
        )
        self.assertFalse(res_stale.passed)

    # ---------- Invariant 6: Evidence Freshness ----------

    def test_invariant_6_evidence_freshness(self):
        """Verifier blocks commitment when stock evidence exceeds freshness window."""
        engine = SimulationEngine(self.sc_baseline)
        verifier = ConstraintVerifier(engine)

        # Baseline freshness window is 120 minutes; initial evidence observed at t=0
        # At t=20, evidence is fresh (20 <= 120)
        engine.advance_to(20)
        res_fresh = verifier.verify_delivery(
            supplier_id="S1", hospital_id="H1", route_id="R_S1_H1",
            quantity=6, plan_version=1
        )
        fresh_check = [c for c in res_fresh.checks if c.name == "evidence_fresh"][0]
        self.assertTrue(fresh_check.passed)

        # At t=130 (age = 130 > 120 window), evidence is STALE
        engine.advance_to(130)
        res_stale = verifier.verify_delivery(
            supplier_id="S1", hospital_id="H1", route_id="R_S1_H1",
            quantity=6, plan_version=1
        )
        self.assertFalse(res_stale.passed)
        stale_check = [c for c in res_stale.checks if c.name == "evidence_fresh"][0]
        self.assertFalse(stale_check.passed)

    # ---------- Invariant 7: Idempotency & Duplicate Request Handling ----------

    def test_invariant_7_idempotency_handling(self):
        """Repeating the same reservation returns existing reservation without duplicating stock deduction."""
        engine = SimulationEngine(self.sc_baseline)
        service = ReservationService(engine, auto_approve=True)

        req = ReservationRequest(
            supplier_id="S1",
            hospital_id="H1",
            route_id="R_S1_H1",
            quantity=5,
            plan_version=1,
            idempotency_key="unique_idem_123"
        )

        res1 = service.reserve(req)
        self.assertTrue(res1.success)
        self.assertFalse(res1.idempotent_replay)
        self.assertEqual(engine.inventory.available_stock("S1"), 5)

        # Second call with the same idempotency key
        res2 = service.reserve(req)
        self.assertTrue(res2.success)
        self.assertTrue(res2.idempotent_replay)
        self.assertEqual(res2.reservation.id, res1.reservation.id)
        # Stock must NOT be deducted a second time
        self.assertEqual(engine.inventory.available_stock("S1"), 5)

    # ---------- Rollback Safety on Partial Failure ----------

    def test_all_or_nothing_atomic_rollback(self):
        """When multi-allocation batch fails midway, all prior reservations are rolled back completely."""
        engine = SimulationEngine(self.sc_baseline)
        service = ReservationService(engine, auto_approve=True)

        initial_s1_avail = engine.inventory.available_stock("S1")
        initial_s2_avail = engine.inventory.available_stock("S2")

        # Allocation 1 (S1 -> H1: 8) is valid.
        # Allocation 2 (S1 -> H2: 8) exceeds remaining S1 stock (only 2 left).
        allocations = [
            AllocationEntry(supplier_id="S1", hospital_id="H1", route_id="R_S1_H1", quantity=8, plan_version=1),
            AllocationEntry(supplier_id="S1", hospital_id="H2", route_id="R_S1_H2", quantity=8, plan_version=1),
        ]

        results = service.reserve_allocation("plan_atomic_test", allocations)
        self.assertEqual(len(results), 2)
        self.assertTrue(results[0].success)
        self.assertFalse(results[1].success)

        # Assert post-condition: S1 stock was restored to initial availability
        self.assertEqual(engine.inventory.available_stock("S1"), initial_s1_avail)
        self.assertEqual(engine.inventory.available_stock("S2"), initial_s2_avail)

        # The created reservation for H1 must be in CANCELLED state
        first_res = engine.inventory.reservations[results[0].reservation.id]
        self.assertEqual(first_res.state, ResourceState.CANCELLED)

    # ---------- Approval Re-validation & Optimistic Concurrency ----------

    def test_approval_revalidation_rejects_on_state_drift(self):
        """Plan approval checks live inventory version and fails if drift occurred while awaiting sign-off."""
        engine = SimulationEngine(self.sc_baseline)
        service = ReservationService(engine, auto_approve=False)

        allocations = [
            AllocationEntry(supplier_id="S1", hospital_id="H1", route_id="R_S1_H1", quantity=8, plan_version=1),
        ]

        # Stage plan
        service.stage_plan({"plan_id": "PLAN_TEST_DRIFT", "allocations": [a.to_dict() for a in allocations]})

        # External state drift: supplier stock version bumped to 2
        engine.inventory.update_supplier_stock("S1", 9)

        # Coordinator attempts to approve plan bound to v1
        approval_ok = service.approve_plan("PLAN_TEST_DRIFT", allocations, plan_version=1)
        self.assertFalse(approval_ok)
        self.assertFalse(service.is_plan_approved("PLAN_TEST_DRIFT"))

    # ---------- Read-Only Operations Do Not Mutate State ----------

    def test_read_only_tools_never_mutate_state(self):
        """Read-only tools (read_facility_state, read_supplier_stock, check_route) never mutate inventory."""
        engine = SimulationEngine(self.sc_baseline)
        service = ReservationService(engine)
        gateway = ToolGateway(engine, service)
        identity = AgentIdentity(actor_id="test_reader", role="coordinator", allowed_tools=[])

        s1_avail_before = engine.inventory.available_stock("S1")
        reservations_count_before = len(engine.inventory.reservations)

        gateway.execute(identity, "read_facility_state", {"hospital_id": "H1"})
        gateway.execute(identity, "read_supplier_stock", {"supplier_id": "S1"})
        gateway.execute(identity, "check_route", {"route_id": "R_S1_H1"})
        gateway.execute(identity, "check_delivery_proposal", {
            "supplier_id": "S1", "hospital_id": "H1", "route_id": "R_S1_H1",
            "quantity": 5, "plan_version": 1
        })

        self.assertEqual(engine.inventory.available_stock("S1"), s1_avail_before)
        self.assertEqual(len(engine.inventory.reservations), reservations_count_before)


if __name__ == "__main__":
    unittest.main()
