"""
Simulation engine — runs scenarios on a deterministic clock.

The engine manages the simulation timeline, processes disruption events,
and coordinates between the inventory, evidence store, and event log.
This is the backbone that all three approaches (fixed rules, single agent,
multi-agent) operate on top of.
"""

from __future__ import annotations

from typing import Any

from models.scenario import (
    Scenario, RouteStatus, EventType as ScenarioEventType, ScenarioEvent, Route,
)
from models.inventory import InventoryManager, ResourceState
from models.evidence import EvidenceStore, EvidenceType, VerificationState
from models.events import EventLog, EventType


class SimulationEngine:
    """
    Runs a scenario on a deterministic simulation clock.

    Usage:
        scenario = load_scenario("flood_basic.json")
        engine = SimulationEngine(scenario)
        engine.advance_to(60)   # Process events up to t=60
        engine.advance_to(120)  # Continue to t=120
    """

    def __init__(self, scenario: Scenario):
        self.scenario = scenario
        self.clock: int = 0
        self.inventory = InventoryManager()
        self.evidence_store = EvidenceStore(freshness_window=scenario.freshness_window)
        self.event_log = EventLog()

        # Runtime route state (mutable copy from scenario)
        self.routes: dict[str, Route] = {}
        for r in scenario.routes:
            # Create a mutable copy
            self.routes[r.id] = Route(
                id=r.id,
                supplier_id=r.supplier_id,
                hospital_id=r.hospital_id,
                travel_minutes=r.travel_minutes,
                capacity_batches=r.capacity_batches,
                status=r.status,
                delay_minutes=r.delay_minutes,
                corridor_name=getattr(r, "corridor_name", ""),
            )

        # Pending events sorted by time
        self._pending_events = sorted(scenario.events, key=lambda e: e.time)
        self._processed_events: list[ScenarioEvent] = []
        self.hospital_requests: list[Any] = []

        # Initialize
        self._initialize()

    def _initialize(self) -> None:
        """Set up initial state from scenario definition."""
        self.inventory.init_from_scenario(self.scenario)

        # Record initial evidence for all known stock
        for s in self.scenario.suppliers:
            self.evidence_store.add(
                entity_id=s.id,
                entity_type="supplier",
                evidence_type=EvidenceType.STOCK_AVAILABILITY,
                claim=f"Supplier {s.id} has {s.confirmed_stock} batches confirmed",
                quantity=s.confirmed_stock,
                observed_at=0,
                source="scenario_setup",
                verification=VerificationState.CONFIRMED,
            )

        for r in self.scenario.routes:
            self.evidence_store.add(
                entity_id=r.id,
                entity_type="route",
                evidence_type=EvidenceType.ROUTE_STATUS,
                claim=f"Route {r.id} ({r.supplier_id}→{r.hospital_id}): "
                      f"{r.status.value}, travel {r.travel_minutes} min",
                observed_at=0,
                source="scenario_setup",
                verification=VerificationState.CONFIRMED,
                metadata={
                    "status": r.status.value,
                    "travel_minutes": r.travel_minutes,
                    "capacity": r.capacity_batches,
                },
            )

        self.event_log.record(
            timestamp=0,
            event_type=EventType.SCENARIO_LOADED,
            actor="system",
            description=f"Scenario '{self.scenario.name}' loaded: "
                        f"{len(self.scenario.hospitals)} hospitals, "
                        f"{len(self.scenario.suppliers)} suppliers, "
                        f"{len(self.scenario.routes)} routes",
            details={"scenario_id": self.scenario.id},
        )

    # ---------- Clock ----------

    def advance_to(self, minute: int) -> list[ScenarioEvent]:
        """
        Advance the simulation clock and process all events up to the given time.
        Returns the events that were processed.
        """
        if minute < self.clock:
            raise ValueError(f"Cannot go backwards: current={self.clock}, requested={minute}")

        processed = []
        events_to_fire = [
            e for e in self._pending_events
            if self.clock < e.time <= minute
        ]

        for event in events_to_fire:
            self._process_event(event)
            self._processed_events.append(event)
            processed.append(event)

        # Remove processed events from pending
        self._pending_events = [
            e for e in self._pending_events
            if e.time > minute
        ]

        # Expire stale evidence
        self.evidence_store.expire_stale(minute)

        # Expire stale reservations
        expired = self.inventory.expire_all_stale(minute)
        for r in expired:
            self.event_log.record(
                timestamp=minute,
                event_type=EventType.RESERVATION_EXPIRED,
                actor="system",
                description=f"Reservation {r.id} expired "
                            f"({r.quantity} batches {r.supplier_id}→{r.hospital_id})",
                details=r.to_dict(),
                related_entities=[r.supplier_id, r.hospital_id],
            )

        # Auto dispatch & receive deliveries based on route travel times & expected arrival
        for r in list(self.inventory.reservations.values()):
            route_obj = self.get_route(r.route_id)
            route_val = route_obj.status.value if hasattr(route_obj.status, "value") else str(route_obj.status)
            is_blocked = (route_obj.status == RouteStatus.BLOCKED or route_val == "blocked")

            if is_blocked and r.state in {ResourceState.RESERVED, ResourceState.IN_TRANSIT}:
                self.inventory.cancel_reservation(r.id, reason=f"Route {r.route_id} is BLOCKED by disruption")
                self.event_log.record(
                    timestamp=minute,
                    event_type=EventType.RESERVATION_CANCELLED,
                    actor="system_verifier",
                    description=f"Reservation {r.id} ({r.quantity} batches {r.supplier_id}→{r.hospital_id}) CANCELLED: Route {r.route_id} is BLOCKED",
                    details=r.to_dict(),
                    related_entities=[r.hospital_id, r.supplier_id, r.route_id],
                )
                continue

            if r.state == ResourceState.RESERVED and r.reserved_at is not None:
                # Dispatch immediately or when clock moves past reserved_at
                if minute >= r.reserved_at:
                    self.inventory.dispatch_reservation(r.id, clock=r.reserved_at)
                    self.event_log.record(
                        timestamp=r.reserved_at,
                        event_type=EventType.RESERVATION_DISPATCHED,
                        actor="logistics_dispatch",
                        description=f"Dispatched {r.quantity} batches from {r.supplier_id} to {r.hospital_id} via {r.route_id}",
                        details=r.to_dict(),
                        related_entities=[r.supplier_id, r.hospital_id, r.route_id],
                    )

            if r.state == ResourceState.IN_TRANSIT and r.expected_arrival is not None:
                actual_arrival = r.expected_arrival
                if route_obj.status == RouteStatus.DELAYED or route_val == "delayed":
                    actual_arrival = r.expected_arrival + route_obj.delay_minutes

                h_obj = self.scenario.get_hospital(r.hospital_id)
                # If delayed past hospital deadline, cancel the reservation as unfeasible so the unmet gap surfaces
                if (route_obj.status == RouteStatus.DELAYED or route_val == "delayed") and actual_arrival > h_obj.deadline_minutes:
                    self.inventory.cancel_reservation(r.id, reason=f"Delivery delayed past hospital deadline ({actual_arrival}m > {h_obj.deadline_minutes}m)")
                    self.event_log.record(
                        timestamp=minute,
                        event_type=EventType.RESERVATION_CANCELLED,
                        actor="system_verifier",
                        description=f"Delivery of {r.quantity} batches to Hospital {r.hospital_id} failed: ETA {actual_arrival}m misses deadline {h_obj.deadline_minutes}m (Gap surfaced)",
                        details=r.to_dict(),
                        related_entities=[r.hospital_id, r.supplier_id, r.route_id],
                    )
                elif not is_blocked and minute >= actual_arrival:
                    self.inventory.receive_delivery(r.id, clock=actual_arrival)
                    self.event_log.record(
                        timestamp=actual_arrival,
                        event_type=EventType.RESERVATION_RECEIVED,
                        actor="hospital_receiving",
                        description=f"Hospital {r.hospital_id} received {r.quantity} batches from {r.supplier_id} (On-hand stock updated)",
                        details=r.to_dict(),
                        related_entities=[r.hospital_id, r.supplier_id],
                    )

        self.clock = minute

        self.event_log.record(
            timestamp=minute,
            event_type=EventType.CLOCK_ADVANCED,
            actor="system",
            description=f"Clock advanced to t={minute}",
            details={"events_processed": len(processed)},
        )

        return processed

    def _process_event(self, event: ScenarioEvent) -> None:
        """Apply a scenario-authored disruption event."""
        self.event_log.record(
            timestamp=event.time,
            event_type=EventType.DISRUPTION_FIRED,
            actor="scenario",
            description=event.description or f"Event: {event.event_type.value} on {event.target_id}",
            details={"event_type": event.event_type.value, "params": event.params},
            related_entities=[event.target_id],
        )

        if event.event_type == ScenarioEventType.ROUTE_BLOCKED:
            self._block_route(event.target_id, event)
        elif event.event_type == ScenarioEventType.ROUTE_DELAYED:
            self._delay_route(event.target_id, event)
        elif event.event_type == ScenarioEventType.ROUTE_RESTORED:
            self._restore_route(event.target_id, event)
        elif event.event_type == ScenarioEventType.STOCK_CHANGED:
            self._change_stock(event.target_id, event)
        elif event.event_type == ScenarioEventType.NEW_ROUTE_AVAILABLE:
            self._add_route(event)
        elif event.event_type == ScenarioEventType.SUPPLIER_MESSAGE:
            self._supplier_message(event.target_id, event)

    def _block_route(self, route_id: str, event: ScenarioEvent) -> None:
        """Block a delivery route."""
        route = self.routes[route_id]
        route.status = RouteStatus.BLOCKED

        self.evidence_store.add(
            entity_id=route_id,
            entity_type="route",
            evidence_type=EvidenceType.ROUTE_STATUS,
            claim=f"Route {route_id} BLOCKED: {event.description}",
            observed_at=event.time,
            source="disruption_event",
            verification=VerificationState.CONFIRMED,
            metadata={"status": "blocked", "reason": event.description},
        )

    def _delay_route(self, route_id: str, event: ScenarioEvent) -> None:
        """Delay a delivery route."""
        route = self.routes[route_id]
        route.status = RouteStatus.DELAYED
        route.delay_minutes = event.params.get("delay_minutes", 120)

        self.evidence_store.add(
            entity_id=route_id,
            entity_type="route",
            evidence_type=EvidenceType.ROUTE_STATUS,
            claim=f"Route {route_id} DELAYED by {route.delay_minutes} min",
            observed_at=event.time,
            source="disruption_event",
            verification=VerificationState.CONFIRMED,
            metadata={
                "status": "delayed",
                "delay_minutes": route.delay_minutes,
                "new_travel_time": route.effective_travel_time,
            },
        )

    def _restore_route(self, route_id: str, event: ScenarioEvent) -> None:
        """Restore a previously blocked/delayed route."""
        route = self.routes[route_id]
        route.status = RouteStatus.OPEN
        route.delay_minutes = 0

        self.evidence_store.add(
            entity_id=route_id,
            entity_type="route",
            evidence_type=EvidenceType.ROUTE_STATUS,
            claim=f"Route {route_id} RESTORED to normal operation",
            observed_at=event.time,
            source="disruption_event",
            verification=VerificationState.CONFIRMED,
            metadata={"status": "open"},
        )

    def _change_stock(self, supplier_id: str, event: ScenarioEvent) -> None:
        """Change a supplier's confirmed stock level."""
        new_stock = event.params["new_stock"]
        new_version = self.inventory.update_supplier_stock(supplier_id, new_stock)

        self.evidence_store.add(
            entity_id=supplier_id,
            entity_type="supplier",
            evidence_type=EvidenceType.STOCK_AVAILABILITY,
            claim=f"Supplier {supplier_id} stock updated to {new_stock} batches (v{new_version})",
            quantity=new_stock,
            observed_at=event.time,
            source="stock_update_event",
            verification=VerificationState.CONFIRMED,
            metadata={"stock_version": new_version},
        )

        self.event_log.record(
            timestamp=event.time,
            event_type=EventType.STOCK_UPDATED,
            actor="scenario",
            description=f"Supplier {supplier_id} stock changed to {new_stock} (v{new_version})",
            details={"supplier_id": supplier_id, "new_stock": new_stock,
                      "new_version": new_version},
            related_entities=[supplier_id],
        )

    def _add_route(self, event: ScenarioEvent) -> None:
        """Add a new delivery route (e.g., confirmed alternate route)."""
        params = event.params
        route = Route(
            id=params["route_id"],
            supplier_id=params["supplier_id"],
            hospital_id=params["hospital_id"],
            travel_minutes=params["travel_minutes"],
            capacity_batches=params["capacity_batches"],
            status=RouteStatus.OPEN,
        )
        self.routes[route.id] = route

        self.evidence_store.add(
            entity_id=route.id,
            entity_type="route",
            evidence_type=EvidenceType.ROUTE_STATUS,
            claim=f"New route {route.id} ({route.supplier_id}→{route.hospital_id}): "
                  f"open, travel {route.travel_minutes} min, capacity {route.capacity_batches}",
            observed_at=event.time,
            source="human_coordinator",
            verification=VerificationState.CONFIRMED,
            metadata={
                "status": "open",
                "travel_minutes": route.travel_minutes,
                "capacity": route.capacity_batches,
            },
        )

    def _supplier_message(self, supplier_id: str, event: ScenarioEvent) -> None:
        """Record a supplier message as evidence."""
        message = event.params.get("message", "")
        is_ambiguous = event.params.get("is_ambiguous", False)

        verification = (VerificationState.UNVERIFIED if is_ambiguous
                        else VerificationState.CONFIRMED)

        self.evidence_store.add(
            entity_id=supplier_id,
            entity_type="supplier",
            evidence_type=EvidenceType.SUPPLIER_REPLY,
            claim=message,
            quantity=event.params.get("quantity"),
            observed_at=event.time,
            source=f"supplier_{supplier_id}",
            verification=verification,
            raw_message=message,
            metadata={"is_ambiguous": is_ambiguous},
        )

    # ---------- Queries ----------

    def get_route(self, route_id: str) -> Route:
        """Get current route state (may differ from scenario initial state)."""
        if route_id not in self.routes:
            raise KeyError(f"Route {route_id} not found")
        return self.routes[route_id]

    def get_routes_for_supplier(self, supplier_id: str) -> list[Route]:
        """All current routes from a supplier."""
        return [r for r in self.routes.values() if r.supplier_id == supplier_id]

    def get_routes_for_hospital(self, hospital_id: str) -> list[Route]:
        """All current routes to a hospital."""
        return [r for r in self.routes.values() if r.hospital_id == hospital_id]

    def get_open_routes_between(self, supplier_id: str, hospital_id: str) -> list[Route]:
        """Open/delayed routes (not blocked) between a supplier and hospital."""
        return [
            r for r in self.routes.values()
            if r.supplier_id == supplier_id
            and r.hospital_id == hospital_id
            and r.status != RouteStatus.BLOCKED
        ]

    def compute_arrival(self, route_id: str, dispatch_time: int | None = None) -> int:
        """Compute expected arrival time for a delivery dispatched now (or at given time)."""
        route = self.get_route(route_id)
        start = dispatch_time if dispatch_time is not None else self.clock
        return start + route.effective_travel_time

    # ---------- Supplier Mock Service ----------

    def get_supplier_response(self, supplier_id: str, question: str) -> dict[str, Any]:
        """
        Query the mock supplier service with a question.
        Returns a pre-authored response based on trigger matching.
        """
        responses = self.scenario.supplier_responses.get(supplier_id, [])

        for resp in responses:
            # Simple keyword matching against triggers
            trigger_lower = resp.trigger.lower()
            question_lower = question.lower()

            if trigger_lower in question_lower or any(
                word in question_lower for word in trigger_lower.split()
            ):
                return {
                    "text": resp.text,
                    "quantity": resp.quantity,
                    "arrival_minutes": resp.arrival_minutes,
                    "clarifies": resp.clarifies,
                    "is_ambiguous": resp.is_ambiguous,
                    "source": f"supplier_{supplier_id}",
                }

        return {
            "text": "No additional information available at this time.",
            "quantity": None,
            "arrival_minutes": None,
            "clarifies": None,
            "is_ambiguous": False,
            "source": f"supplier_{supplier_id}",
        }

    # ---------- State Summary ----------

    def state_summary(self) -> dict[str, Any]:
        """Complete simulation state snapshot for API/frontend."""
        return {
            "scenario_id": self.scenario.id,
            "scenario_name": self.scenario.name,
            "clock": self.clock,
            "total_time": self.scenario.total_simulation_time,
            "hospitals": [
                {
                    "id": h.id,
                    "name": h.name,
                    "zone": getattr(h, "zone", "Bengaluru Central"),
                    "lat": getattr(h, "lat", 12.9716),
                    "lng": getattr(h, "lng", 77.5946),
                    "requested_batches": h.requested_batches,
                    "seeded_batches": getattr(h, "seeded_requested_batches", h.requested_batches),
                    "submitted_batches": max(0, h.requested_batches - getattr(h, "seeded_requested_batches", h.requested_batches)),
                    "deadline_minutes": h.deadline_minutes,
                    "allocated_batches": self.inventory.total_allocated_for_hospital(h.id),
                    "on_hand": self.inventory.get_hospital_stock(h.id).on_hand,
                    "on_hand_stock": self.inventory.get_hospital_stock(h.id).on_hand,
                    "total_received": self.inventory.get_hospital_stock(h.id).total_received,
                    "reserved_incoming": self.inventory.total_reserved_for_hospital(h.id),
                    "unmet": max(0, h.requested_batches - self.inventory.total_allocated_for_hospital(h.id)),
                }
                for h in self.scenario.hospitals
            ],
            "suppliers": [
                {
                    "id": s.id,
                    "name": s.name,
                    "zone": getattr(s, "zone", "Bengaluru Industrial"),
                    "lat": getattr(s, "lat", 13.0285),
                    "lng": getattr(s, "lng", 77.5197),
                    "confirmed_stock": self.inventory.get_supplier_stock(s.id).confirmed_total,
                    "available_stock": self.inventory.available_stock(s.id),
                    "stock_version": self.inventory.get_supplier_stock(s.id).stock_version,
                    "active_reservations": len(
                        self.inventory.active_reservations_for_supplier(s.id)
                    ),
                }
                for s in self.scenario.suppliers
            ],
            "routes": [
                {
                    "id": r.id,
                    "supplier_id": r.supplier_id,
                    "hospital_id": r.hospital_id,
                    "status": r.status.value,
                    "travel_minutes": r.travel_minutes,
                    "delay_minutes": r.delay_minutes,
                    "effective_travel_time": r.effective_travel_time,
                    "capacity_batches": r.capacity_batches,
                    "corridor_name": getattr(r, "corridor_name", ""),
                }
                for r in self.routes.values()
            ],
            "pending_events": len(self._pending_events),
            "processed_events": len(self._processed_events),
            "event_log_size": len(self.event_log),
            "evidence_count": len(self.evidence_store.records),
            "reservation_count": len(self.inventory.reservations),
            "hospital_requests": [r.to_dict() if hasattr(r, "to_dict") else r for r in self.hospital_requests],
        }
