"""
REACT Evaluation Benchmark Runner.

Executes comparative benchmarks across all 6 compound disruption scenarios:
1. Fixed-Rules Baseline (greedy FIFO)
2. Single-Agent Coordinator (monolithic LLM context)
3. Multi-Agent Coordinator (REACT role-specialized coordination)

Measures:
- Tool call counts & efficiency
- Invalid proposals caught by deterministic verifier
- Unmet demand (honest gap recognition)
- Integrity invariant violations (strictly 0 target)
- Runtime execution latency (ms)

Saves aggregated JSON results to backend/evaluation/results.json
and prints a formatted terminal comparison table.
"""

from __future__ import annotations

import sys
import json
import time
from pathlib import Path
from datetime import datetime, timezone

# Ensure backend root is on sys.path for direct script execution
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from models.scenario import load_scenario
from models.inventory import ResourceState
from engine.simulator import SimulationEngine
from engine.reservation import ReservationService
from engine.verifier import ConstraintVerifier
from agents.fixed_rules import FixedRulesBaseline
from agents.single_agent import SingleAgent
from agents.multi_agent import MultiAgentSystem
from evaluation.metrics import RunMetrics

SCENARIOS_DIR = Path(__file__).resolve().parent / "scenarios"
RESULTS_FILE = Path(__file__).resolve().parent / "results.json"


DISRUPTION_EVAL_TIMES = {
    "SC-01": 0,    # Normal ops
    "SC-02": 40,   # Flood disruption active (t=30 onset)
    "SC-03": 35,   # Double booking pressure (S2 routes blocked at t=30)
    "SC-04": 25,   # Ambiguous supplier message received (t=20)
    "SC-05": 55,   # S1 stock changed & version bumped (t=50)
    "SC-06": 15,   # Both S2 routes blocked, infeasible demand (t=10)
    "SC-07": 40,   # Semiconductor JIT customs delay (t=30 onset)
}


def evaluate_approach(approach_name: str, scenario_path: Path) -> RunMetrics:
    """Run a single approach on a scenario and compute its metrics."""
    scenario = load_scenario(scenario_path)
    engine = SimulationEngine(scenario)

    # Advance clock to active disruption window so agents face realistic conditions
    onset_time = DISRUPTION_EVAL_TIMES.get(scenario.id, 0)
    if onset_time > 0:
        engine.advance_to(onset_time)

    reservation_service = ReservationService(engine)

    if approach_name == "fixed_rules":
        agent = FixedRulesBaseline(engine, reservation_service)
    elif approach_name == "single_agent":
        agent = SingleAgent(engine, reservation_service)
    elif approach_name == "multi_agent":
        agent = MultiAgentSystem(engine, reservation_service)
    else:
        raise ValueError(f"Unknown approach: {approach_name}")

    t0 = time.perf_counter()
    res = agent.run()
    elapsed_ms = (time.perf_counter() - t0) * 1000.0

    # Advance clock to end of exercise so all valid in-transit deliveries complete
    engine.advance_to(300)

    # Invariant Verification: Confirm 0 illegal commitments were accepted
    verifier = ConstraintVerifier(engine)
    invariant_violations = 0
    for res_id, r in engine.inventory.reservations.items():
        if r.state in (ResourceState.RESERVED, ResourceState.IN_TRANSIT, ResourceState.RECEIVED):
            # Verify supplier stock sufficiency
            if engine.inventory.available_stock(r.supplier_id) < 0:
                invariant_violations += 1
            # Verify route not blocked
            route = engine.get_route(r.route_id)
            if route.status.value == "blocked":
                invariant_violations += 1

    return RunMetrics(
        scenario_id=scenario.id,
        approach=approach_name,
        tool_calls=res["tool_calls"],
        invalid_proposals=res["invalid_proposals"],
        unmet_batches=res["unmet_batches"],
        integrity_invariant_violations=invariant_violations,
        runtime_ms=round(elapsed_ms, 2),
        scenario_name=scenario.name,
    )


def run_all_benchmarks() -> list[RunMetrics]:
    """Execute all 3 approaches across all 6 scenarios."""
    scenario_files = sorted([f for f in SCENARIOS_DIR.glob("*.json") if not f.name.startswith("07_")])
    approaches = ["fixed_rules", "single_agent", "multi_agent"]
    all_metrics: list[RunMetrics] = []

    print(f"\n==================================================================================")
    print(f"                  REACT SYSTEM EVALUATION BENCHMARK SUITE")
    print(f"==================================================================================")
    print(f"Loaded {len(scenario_files)} scenarios from {SCENARIOS_DIR.name}/")
    print(f"Approaches: {', '.join(approaches)}\n")

    for sf in scenario_files:
        for app in approaches:
            metric = evaluate_approach(app, sf)
            all_metrics.append(metric)

    return all_metrics


def print_comparison_table(metrics: list[RunMetrics]) -> None:
    """Print clean terminal / Markdown comparison table."""
    headers = [
        "Scenario",
        "Approach",
        "Tool Calls",
        "Invalid Proposals",
        "Unmet Batches",
        "Invariant Violations",
        "Runtime (ms)"
    ]
    widths = [10, 14, 12, 19, 15, 22, 14]

    row_format = "| " + " | ".join(f"{{:<{w}}}" for w in widths) + " |"
    separator = "|-" + "-|-".join("-" * w for w in widths) + "-|"

    print(separator)
    print(row_format.format(*headers))
    print(separator)

    last_sc = None
    for m in metrics:
        if last_sc and m.scenario_id != last_sc:
            print(separator)
        last_sc = m.scenario_id

        inv_str = f"{m.integrity_invariant_violations} (PASS)" if m.integrity_invariant_violations == 0 else f"{m.integrity_invariant_violations} (FAIL)"

        print(row_format.format(
            m.scenario_id,
            m.approach,
            str(m.tool_calls),
            str(m.invalid_proposals),
            str(m.unmet_batches),
            inv_str,
            f"{m.runtime_ms:.2f}"
        ))

    print(separator)


def save_results(metrics: list[RunMetrics], output_path: Path = RESULTS_FILE) -> None:
    """Save metrics to JSON output file."""
    data = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "total_evaluations": len(metrics),
        "results": [m.to_dict() for m in metrics],
        "summary": {
            "total_integrity_violations": sum(m.integrity_invariant_violations for m in metrics),
            "multi_agent_invalid_proposals": sum(m.invalid_proposals for m in metrics if m.approach == "multi_agent"),
            "single_agent_invalid_proposals": sum(m.invalid_proposals for m in metrics if m.approach == "single_agent"),
            "fixed_rules_invalid_proposals": sum(m.invalid_proposals for m in metrics if m.approach == "fixed_rules"),
        }
    }
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
    print(f"\n[REACT] Benchmark results successfully written to: {output_path}")


def main() -> None:
    metrics = run_all_benchmarks()
    print_comparison_table(metrics)
    save_results(metrics)


if __name__ == "__main__":
    main()
