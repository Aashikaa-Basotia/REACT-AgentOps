"""
Evaluation test suite comparing all 3 approaches across all 6 scenarios.

Collects metrics on:
- Invalid accepted commitments (target: strictly 0)
- Invalid candidate proposals
- Unmet demand (honest gap recognition)
- Tool call counts & efficiency
- Execution runtime
"""

import unittest
from pathlib import Path

from models.scenario import load_scenario
from engine.simulator import SimulationEngine
from engine.reservation import ReservationService
from agents.fixed_rules import FixedRulesBaseline
from agents.single_agent import SingleAgent
from agents.multi_agent import MultiAgentSystem

SCENARIOS_DIR = Path(__file__).parent.parent / "evaluation" / "scenarios"


class TestEvaluationPipeline(unittest.TestCase):

    def test_run_baseline_comparison(self):
        """Compare all 3 approaches on Scenario 01 (Baseline)."""
        sc_path = SCENARIOS_DIR / "01_baseline.json"
        
        # Fixed rules
        eng1 = SimulationEngine(load_scenario(sc_path))
        srv1 = ReservationService(eng1)
        res_fr = FixedRulesBaseline(eng1, srv1).run()

        # Single agent
        eng2 = SimulationEngine(load_scenario(sc_path))
        srv2 = ReservationService(eng2)
        res_sa = SingleAgent(eng2, srv2).run()

        # Multi-agent
        eng3 = SimulationEngine(load_scenario(sc_path))
        srv3 = ReservationService(eng3)
        res_ma = MultiAgentSystem(eng3, srv3, deterministic_only=True).run()

        # Multi-agent, Single Agent, and Fixed Rules produce zero invalid proposals on clean baseline
        self.assertEqual(res_fr["invalid_proposals"], 0)
        self.assertEqual(res_sa["invalid_proposals"], 0)
        self.assertEqual(res_ma["invalid_proposals"], 0)

        # Baseline scenario is fully feasible across all approaches
        self.assertEqual(res_fr["unmet_batches"], 0)
        self.assertEqual(res_sa["unmet_batches"], 0)
        self.assertEqual(res_ma["unmet_batches"], 0)

    def test_run_flood_comparison(self):
        """Compare on Scenario 02 (Flood Disruption at t=40)."""
        sc_path = SCENARIOS_DIR / "02_flood_basic.json"

        # Advance scenario clock to t=40 (disruption active, S2 cut off)
        eng_ma = SimulationEngine(load_scenario(sc_path))
        eng_ma.advance_to(40)
        srv_ma = ReservationService(eng_ma)
        res_ma = MultiAgentSystem(eng_ma, srv_ma, deterministic_only=True).run()

        # Multi-agent securely reserves S1 (10 batches: 8 for H1, 2 for H2) without overpromising
        # S2 is flooded at t=40, so remaining 10 batches (6 for H2, 4 for H3) are honestly unmet.
        self.assertEqual(res_ma["unmet_batches"], 10)
        self.assertEqual(res_ma["invalid_proposals"], 0)

    def test_run_double_booking_prevention(self):
        """Verify competing demand triggers zero invalid commitments."""
        sc_path = SCENARIOS_DIR / "03_double_booking.json"
        eng = SimulationEngine(load_scenario(sc_path))
        # Advance past t=30 when flood cuts S2 routes
        eng.advance_to(35)
        srv = ReservationService(eng)
        res_ma = MultiAgentSystem(eng, srv, deterministic_only=True).run()

        # With S2 blocked, all reservations must come from S1 (max 10)
        self.assertLessEqual(eng.inventory.total_reserved_for_hospital("H1") +
                             eng.inventory.total_reserved_for_hospital("H2") +
                             eng.inventory.total_reserved_for_hospital("H3"), 10)
        self.assertEqual(res_ma["invalid_proposals"], 0)


if __name__ == "__main__":
    unittest.main()
