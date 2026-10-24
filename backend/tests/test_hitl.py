"""
Tests for Human-in-the-Loop (HITL) Coordinator Approval and Optimistic Concurrency Locking.
"""

import unittest
from pathlib import Path

from models.scenario import load_scenario
from models.events import EventType
from models.inventory import ResourceState
from engine.simulator import SimulationEngine
from engine.reservation import ReservationService
from engine.verifier import AllocationEntry
from agents.tools import ToolGateway
from agents.supervisor import RehearsalSupervisor
from agents.facility import FacilityAgent
from agents.supply import SupplyAgent

SCENARIOS_DIR = Path(__file__).parent.parent / "evaluation" / "scenarios"


class TestHumanInTheLoop(unittest.TestCase):

    def setUp(self):
        self.sc_path = SCENARIOS_DIR / "01_baseline.json"
        self.scenario = load_scenario(self.sc_path)
        self.engine = SimulationEngine(self.scenario)
        self.service = ReservationService(self.engine, auto_approve=False)

    def test_interactive_mode_pauses_for_human_approval(self):
        """When interactive_mode=True, supervisor pauses with PENDING_HUMAN_APPROVAL and emits event."""
        supervisor = RehearsalSupervisor(self.engine, self.service, interactive_mode=True)
        res = supervisor.run()

        # Check status and staged plan
        self.assertEqual(res["status"], "PENDING_HUMAN_APPROVAL")
        self.assertIsNotNone(res.get("staged_plan"))
        self.assertIsNotNone(self.service.get_staged_plan())

        # Zero reservations should be committed yet
        self.assertEqual(len(self.engine.inventory.reservations), 0)

        # Check that AWAITING_HUMAN_APPROVAL event was recorded
        events = self.engine.event_log.by_type(EventType.AWAITING_HUMAN_APPROVAL)
        self.assertEqual(len(events), 1)
        ev_details = events[0].details
        self.assertIn("checks", ev_details)
        self.assertIn("expected_stock_versions", ev_details)
        self.assertIn("deliveries", ev_details)

    def test_human_approval_commits_and_finalizes(self):
        """When coordinator approves a valid staged plan, reservations commit atomically and debrief is filed."""
        supervisor = RehearsalSupervisor(self.engine, self.service, interactive_mode=True)
        res = supervisor.run()
        staged = res["staged_plan"]
        plan_id = staged["plan_id"]
        alloc_entries = [AllocationEntry(**a) for a in staged["allocations"]]

        # Coordinator approves
        approved = self.service.approve_plan(plan_id, alloc_entries, alloc_entries[0].plan_version)
        self.assertTrue(approved)

        # Commit reservations
        results = self.service.reserve_allocation(plan_id, alloc_entries)
        self.assertTrue(all(r.success for r in results))
        self.assertGreater(len(self.engine.inventory.reservations), 0)

        # Finalize rehearsal & debrief
        debrief = supervisor.finalize_rehearsal(plan_id, staged["allocations"])
        self.assertEqual(debrief["status"], "COMPLETED")
        self.assertIn("failed_assumptions", debrief)

        # Verify HUMAN_APPROVAL event
        approvals = self.engine.event_log.by_type(EventType.HUMAN_APPROVAL)
        self.assertGreaterEqual(len(approvals), 1)

    def test_optimistic_concurrency_drift_detection(self):
        """If supplier stock version changes while awaiting approval, version mismatch is caught."""
        supervisor = RehearsalSupervisor(self.engine, self.service, interactive_mode=True)
        res = supervisor.run()
        staged = res["staged_plan"]
        plan_id = staged["plan_id"]
        alloc_entries = [AllocationEntry(**a) for a in staged["allocations"]]

        # Simulate last-second state drift on S1 (external stock drop from 10 to 8, version 1 -> 2)
        new_version = self.engine.inventory.update_supplier_stock("S1", 8)
        self.assertEqual(new_version, 2)

        # Attempt to approve plan bound to v1
        approval_passed = self.service.approve_plan(plan_id, alloc_entries, alloc_entries[0].plan_version)
        self.assertFalse(approval_passed)

        # Re-plan after drift
        replan_res = supervisor.replan_after_drift(failed_plan_id=plan_id)
        self.assertEqual(replan_res["status"], "REPLANNED_PENDING_APPROVAL")
        new_staged = replan_res["staged_plan"]

        # New plan should now reference v2 for S1
        self.assertEqual(new_staged["expected_stock_versions"]["S1"], 2)

    def test_subagent_context_isolation_and_rbac(self):
        """Verify FacilityAgent and SupplyAgent are distinct objects and ToolGateway enforces RBAC isolation."""
        gateway = ToolGateway(self.engine, self.service)
        f_h1 = FacilityAgent("H1", gateway)
        f_h2 = FacilityAgent("H2", gateway)
        s_agent = SupplyAgent(gateway)

        # 1. Distinct objects and distinct identities
        self.assertIsNot(f_h1, f_h2)
        self.assertIsNot(f_h1, s_agent)
        self.assertEqual(f_h1.identity.actor_id, "facility_H1")
        self.assertEqual(f_h2.identity.actor_id, "facility_H2")
        self.assertEqual(s_agent.identity.actor_id, "supply_coordinator_agent")

        # 2. FacilityAgent("H1") is blocked by ToolGateway RBAC if it tries to read H2
        res_cross = gateway.execute(f_h1.identity, "read_facility_state", {"hospital_id": "H2"})
        self.assertFalse(res_cross.success)
        self.assertIn("Facility isolation", res_cross.error)

        # 3. FacilityAgent("H1") is blocked by ToolGateway RBAC if it tries to read supplier stock
        res_supplier = gateway.execute(f_h1.identity, "read_supplier_stock", {"supplier_id": "S1"})
        self.assertFalse(res_supplier.success)
        self.assertIn("Permission denied", res_supplier.error)

        # 4. FacilityAgent("H1") can read its own state and produce structured assessment report
        report_h1 = f_h1.assess_facility_need(0)
        self.assertEqual(report_h1["facility_id"], "H1")
        self.assertIn("current_stock", report_h1)
        self.assertIn("required_batches", report_h1)
        self.assertIn("deficit", report_h1)
        self.assertIn("deadline_minutes", report_h1)
        self.assertIn("urgency_rank", report_h1)
        self.assertIn("agent_reasoning", report_h1)

        # 5. SupplyAgent cannot call read_facility_state (RBAC check)
        res_fac = gateway.execute(s_agent.identity, "read_facility_state", {"hospital_id": "H1"})
        self.assertFalse(res_fac.success)
        self.assertIn("Permission denied", res_fac.error)

        # 6. SupplyAgent can investigate supply and routes
        supply_rep = s_agent.investigate_supply_and_routes([report_h1], 0)
        self.assertIn("confirmed_suppliers", supply_rep)
        self.assertIn("usable_routes", supply_rep)
        self.assertIn("clarifications_resolved", supply_rep)
        self.assertIn("agent_reasoning", supply_rep)

        # 7. RehearsalSupervisor instantiates genuine sub-agents and logs handoff events
        supervisor = RehearsalSupervisor(self.engine, self.service, interactive_mode=False)
        self.assertIn("H1", supervisor.facility_agents)
        self.assertIsInstance(supervisor.supply_agent, SupplyAgent)
        supervisor.run()

        # Check handoff events in event_log
        handoffs = [
            e for e in self.engine.event_log.events
            if "Supervisor -> FacilityAgent" in e.description or "SupplyAgent -> Supervisor" in e.description
        ]
        self.assertGreater(len(handoffs), 0)


if __name__ == "__main__":
    unittest.main()
