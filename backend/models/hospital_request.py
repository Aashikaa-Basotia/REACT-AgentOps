"""
Hospital Request Model for REACT Crisis Logistics.

Represents user-submitted hospital replenishment requests entered through the Hospital Portal.
Maintains clear separation between scenario-seeded baseline demand and dynamic submitted demand.
"""

from __future__ import annotations

from dataclasses import dataclass, field, asdict
from enum import Enum
from typing import Any


class RequestStatus(str, Enum):
    """Lifecycle status of a hospital resource request."""
    SUBMITTED = "SUBMITTED"
    ALLOCATING = "ALLOCATING"
    PENDING_APPROVAL = "PENDING_APPROVAL"
    ALLOCATED = "ALLOCATED"
    FULFILLED = "FULFILLED"
    REJECTED = "REJECTED"


class RequestPriority(str, Enum):
    """Urgency / triage level for hospital requests."""
    ROUTINE = "ROUTINE"
    URGENT = "URGENT"
    CRITICAL = "CRITICAL"


@dataclass
class HospitalRequest:
    """A resource replenishment request submitted by a hospital facility."""
    request_id: str
    scenario_id: str
    hospital_id: str
    hospital_name: str
    resource_type: str             # e.g. "liquid_oxygen", "oxygen_batches", "wafer_lots"
    quantity_batches: int
    deadline_minutes: int
    priority: RequestPriority = RequestPriority.URGENT
    notes: str = ""
    status: RequestStatus = RequestStatus.SUBMITTED
    created_at_minute: int = 0
    allocated_batches: int = 0
    fulfilled_at_minute: int | None = None
    supplier_allocations: list[dict[str, Any]] = field(default_factory=list)

    def __post_init__(self):
        if self.quantity_batches <= 0:
            raise ValueError(f"quantity_batches must be strictly positive, got {self.quantity_batches}")
        if self.deadline_minutes <= 0:
            raise ValueError(f"deadline_minutes must be strictly positive, got {self.deadline_minutes}")
        if isinstance(self.priority, str):
            self.priority = RequestPriority(self.priority.upper())
        if isinstance(self.status, str):
            self.status = RequestStatus(self.status.upper())

    def to_dict(self) -> dict[str, Any]:
        """Serialize for API response and JSON event logging."""
        d = asdict(self)
        d["priority"] = self.priority.value
        d["status"] = self.status.value
        return d
