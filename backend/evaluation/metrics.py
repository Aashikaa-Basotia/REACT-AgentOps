"""
Standardized Evaluation Metrics for REACT.

Defines RunMetrics dataclass capturing empirical execution metrics across:
- Fixed-rules baseline
- Single-agent coordinator
- Multi-agent coordinator (REACT)
"""

from __future__ import annotations

from dataclasses import dataclass, asdict
from typing import Any, Literal


@dataclass
class RunMetrics:
    """Standardized performance and safety metrics for an evaluation run."""
    scenario_id: str
    approach: Literal["fixed_rules", "single_agent", "multi_agent"]
    tool_calls: int
    invalid_proposals: int
    unmet_batches: int
    integrity_invariant_violations: int   # Target: strictly 0
    runtime_ms: float
    scenario_name: str = ""

    def to_dict(self) -> dict[str, Any]:
        """Convert metrics to dictionary."""
        return asdict(self)
