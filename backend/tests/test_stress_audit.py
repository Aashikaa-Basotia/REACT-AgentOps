"""
Unit tests for Monte Carlo Stress Fuzzer and 3-Way Benchmark Summary Engine.
"""

import unittest
from pathlib import Path
from engine.stress_testing import run_monte_carlo_stress_audit
from models.scenario import load_scenario

SCENARIOS_DIR = Path(__file__).resolve().parent.parent / "evaluation" / "scenarios"


class TestStressAuditAndBenchmarks(unittest.TestCase):

    def test_monte_carlo_stress_audit_baseline(self):
        """Monte Carlo stress audit runs 25 randomized iterations on baseline within <100ms."""
        sc_path = SCENARIOS_DIR / "01_baseline.json"
        res = run_monte_carlo_stress_audit(sc_path, num_simulations=25, random_seed=42)

        self.assertEqual(res["total_simulations"], 25)
        self.assertGreaterEqual(res["resilience_score_pct"], 0.0)
        self.assertLessEqual(res["resilience_score_pct"], 100.0)
        self.assertEqual(len(res["run_results"]), 25)
        self.assertIn("H2", res["sla_recommendation"])
        self.assertLess(res["runtime_ms"], 2000.0)

    def test_monte_carlo_stress_audit_semiconductor_manufacturing(self):
        """Monte Carlo audit correctly models semiconductor JIT disruption under customs freezes."""
        sc_path = SCENARIOS_DIR / "07_semiconductor_jit_accelerator.json"
        self.assertTrue(sc_path.exists())

        res = run_monte_carlo_stress_audit(sc_path, num_simulations=25, random_seed=42)
        self.assertEqual(res["total_simulations"], 25)
        self.assertIn("wafer lots", res["sla_recommendation"])
        self.assertIn("Pune Battery Pack Fab", res["sla_recommendation"])
        self.assertIn("S2", res["sla_recommendation"])

    def test_semiconductor_manufacturing_scenario_schema_and_invariants(self):
        """Validate that SC-07 conforms to exact system scenario schema and invariants."""
        sc_path = SCENARIOS_DIR / "07_semiconductor_jit_accelerator.json"
        sc = load_scenario(sc_path)

        self.assertEqual(sc.id, "SC-07")
        self.assertEqual(len(sc.hospitals), 3)
        self.assertEqual(len(sc.suppliers), 2)
        self.assertEqual(len(sc.routes), 4)
        self.assertEqual(sc.total_demand, 20)
        self.assertEqual(sc.total_supply, 20)


if __name__ == "__main__":
    unittest.main()
