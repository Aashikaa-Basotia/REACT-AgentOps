"""
Scenario definitions — the static exercise configuration.

A Scenario is the complete description of a preparedness drill:
hospitals, suppliers, routes, timed disruption events, and
pre-authored supplier responses for the mock service.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Any


class RouteStatus(str, Enum):
    """Operational status of a delivery route."""
    OPEN = "open"
    DELAYED = "delayed"
    BLOCKED = "blocked"


class EventType(str, Enum):
    """Types of scenario-authored disruption events."""
    ROUTE_BLOCKED = "route_blocked"
    ROUTE_DELAYED = "route_delayed"
    ROUTE_RESTORED = "route_restored"
    STOCK_CHANGED = "stock_changed"
    SUPPLIER_MESSAGE = "supplier_message"
    NEW_ROUTE_AVAILABLE = "new_route_available"


@dataclass
class Hospital:
    """A hospital facility in the exercise."""
    id: str                          # e.g. "H1"
    name: str                        # e.g. "Manipal Hospital Whitefield"
    requested_batches: int           # Replenishment need
    deadline_minutes: int            # Must receive by this time
    on_hand_stock: int = 0           # Current stock at start
    min_reserve: int = 0             # Exercise-defined minimum
    zone: str = "Bengaluru Central"
    lat: float = 12.9716
    lng: float = 77.5946
    seeded_requested_batches: int = field(init=False, default=0)
    seeded_deadline_minutes: int = field(init=False, default=120)

    def __post_init__(self):
        if self.requested_batches < 0:
            raise ValueError(f"Hospital {self.id}: requested_batches cannot be negative")
        if self.deadline_minutes <= 0:
            raise ValueError(f"Hospital {self.id}: deadline_minutes must be positive")
        self.seeded_requested_batches = self.requested_batches
        self.seeded_deadline_minutes = self.deadline_minutes


@dataclass
class Supplier:
    """An oxygen supplier in the exercise."""
    id: str                          # e.g. "S1"
    name: str                        # e.g. "Peenya Industrial Cryo-Plant"
    confirmed_stock: int             # Confirmed batches available
    stock_version: int = 1           # Increments on any stock change
    zone: str = "Bengaluru Industrial"
    lat: float = 13.0285
    lng: float = 77.5197

    def __post_init__(self):
        if self.confirmed_stock < 0:
            raise ValueError(f"Supplier {self.id}: confirmed_stock cannot be negative")


@dataclass
class Route:
    """A delivery route between a supplier and a hospital."""
    id: str                          # e.g. "R_S1_H1"
    supplier_id: str
    hospital_id: str
    travel_minutes: int              # Base travel time
    capacity_batches: int            # Max batches per delivery
    status: RouteStatus = RouteStatus.OPEN
    delay_minutes: int = 0           # Additional delay if status is DELAYED
    corridor_name: str = ""          # e.g. "Outer Ring Road - Bellandur Flood Corridor"

    @property
    def effective_travel_time(self) -> int:
        """Actual travel time including any delays."""
        if self.status == RouteStatus.BLOCKED:
            return 999_999  # Effectively infinite
        return self.travel_minutes + self.delay_minutes

    def __post_init__(self):
        if self.travel_minutes < 0:
            raise ValueError(f"Route {self.id}: travel_minutes cannot be negative")
        if self.capacity_batches <= 0:
            raise ValueError(f"Route {self.id}: capacity_batches must be positive")


@dataclass
class ScenarioEvent:
    """A timed disruption event authored by the exercise designer."""
    time: int                        # Simulation minute when this fires
    event_type: EventType
    target_id: str                   # Which entity is affected
    params: dict[str, Any] = field(default_factory=dict)
    description: str = ""            # Human-readable description

    def __post_init__(self):
        if self.time < 0:
            raise ValueError("Event time cannot be negative")


@dataclass
class SupplierResponse:
    """A pre-authored supplier reply for the mock service."""
    trigger: str                     # Keyword/pattern to match questions
    text: str                        # The supplier's reply text
    quantity: int | None = None      # Quantity if clarified
    arrival_minutes: int | None = None  # Delivery time if clarified
    clarifies: str | None = None     # What this response clarifies
    is_ambiguous: bool = False       # Does this need further clarification?


@dataclass
class ExpectedInvariant:
    """Machine-checkable expected outcome for a scenario."""
    name: str                        # e.g. "no_invalid_commitments"
    check_type: str                  # e.g. "zero_invalid", "exact_unmet", "reservation_rejected"
    params: dict[str, Any] = field(default_factory=dict)
    description: str = ""


@dataclass
class Scenario:
    """Complete exercise scenario definition."""
    id: str
    name: str
    description: str
    hospitals: list[Hospital]
    suppliers: list[Supplier]
    routes: list[Route]
    events: list[ScenarioEvent]
    supplier_responses: dict[str, list[SupplierResponse]]  # keyed by supplier_id
    expected_invariants: list[ExpectedInvariant] = field(default_factory=list)
    freshness_window: int = 60       # Minutes before evidence expires
    total_simulation_time: int = 360  # Total exercise duration

    def get_hospital(self, hospital_id: str) -> Hospital:
        """Look up a hospital by ID."""
        for h in self.hospitals:
            if h.id == hospital_id:
                return h
        raise KeyError(f"Hospital {hospital_id} not found")

    def get_supplier(self, supplier_id: str) -> Supplier:
        """Look up a supplier by ID."""
        for s in self.suppliers:
            if s.id == supplier_id:
                return s
        raise KeyError(f"Supplier {supplier_id} not found")

    def get_route(self, route_id: str) -> Route:
        """Look up a route by ID."""
        for r in self.routes:
            if r.id == route_id:
                return r
        raise KeyError(f"Route {route_id} not found")

    def get_routes_for_supplier(self, supplier_id: str) -> list[Route]:
        """All routes originating from a supplier."""
        return [r for r in self.routes if r.supplier_id == supplier_id]

    def get_routes_for_hospital(self, hospital_id: str) -> list[Route]:
        """All routes delivering to a hospital."""
        return [r for r in self.routes if r.hospital_id == hospital_id]

    def get_routes_between(self, supplier_id: str, hospital_id: str) -> list[Route]:
        """Routes connecting a specific supplier to a specific hospital."""
        return [r for r in self.routes
                if r.supplier_id == supplier_id and r.hospital_id == hospital_id]

    @property
    def total_demand(self) -> int:
        """Total batches requested across all hospitals."""
        return sum(h.requested_batches for h in self.hospitals)

    @property
    def total_supply(self) -> int:
        """Total confirmed supply across all suppliers."""
        return sum(s.confirmed_stock for s in self.suppliers)


def load_scenario(path: str | Path) -> Scenario:
    """Load a scenario from a JSON file."""
    with open(path) as f:
        data = json.load(f)

    hospitals = [Hospital(**h) for h in data["hospitals"]]
    suppliers = [Supplier(**s) for s in data["suppliers"]]
    routes = [Route(status=RouteStatus(r.pop("status", "open")), **r)
              for r in data["routes"]]
    events = [ScenarioEvent(event_type=EventType(e.pop("event_type")), **e)
              for e in data.get("events", [])]

    supplier_responses: dict[str, list[SupplierResponse]] = {}
    for sid, responses in data.get("supplier_responses", {}).items():
        supplier_responses[sid] = [SupplierResponse(**r) for r in responses]

    expected_invariants = [ExpectedInvariant(**inv)
                           for inv in data.get("expected_invariants", [])]

    return Scenario(
        id=data["id"],
        name=data["name"],
        description=data.get("description", ""),
        hospitals=hospitals,
        suppliers=suppliers,
        routes=routes,
        events=events,
        supplier_responses=supplier_responses,
        expected_invariants=expected_invariants,
        freshness_window=data.get("freshness_window", 60),
        total_simulation_time=data.get("total_simulation_time", 360),
    )


DEFAULT_SCENARIOS_DIR = Path(__file__).resolve().parent.parent / "evaluation" / "scenarios"


def resolve_scenario_file(scenario_id: str, scenarios_dir: Path | None = None) -> Path | None:
    """
    Robustly resolve a scenario file by its declared scenario ID or exact stem.
    Rejects unknown IDs with None; avoids arbitrary substring collisions.
    """
    dir_path = Path(scenarios_dir) if scenarios_dir else DEFAULT_SCENARIOS_DIR
    if not dir_path.exists():
        return None

    target_id = scenario_id.strip().upper()

    # Pass 1: Match against declared "id" inside each JSON file
    for f in sorted(dir_path.glob("*.json")):
        try:
            with open(f, "r", encoding="utf-8") as fp:
                data = json.load(fp)
                if data.get("id", "").strip().upper() == target_id:
                    return f
        except Exception:
            continue

    # Pass 2: Exact stem match (e.g. '01_baseline', '02_flood_basic')
    for f in sorted(dir_path.glob("*.json")):
        if f.stem.lower() == scenario_id.strip().lower():
            return f

    return None

