"""
Inventory state management — stock tracking and reservation lifecycle.

This is the heart of the system. It tracks:
- Supplier stock: confirmed total, available (after reservations), version
- Hospital stock: on-hand, received
- Reservations: full lifecycle from PROPOSED through RECEIVED
- Deliveries: dispatch and receipt tracking

All state changes go through this module. The constraint verifier and
reservation service operate ON these data structures.
"""

from __future__ import annotations

import threading
import uuid
from dataclasses import dataclass, field
from enum import Enum
from typing import Any


class ResourceState(str, Enum):
    """Lifecycle state of a reservation."""
    PROPOSED = "proposed"            # Plan exists, no stock committed
    PENDING_HUMAN_APPROVAL = "pending_human_approval"  # Staged, awaiting human approval
    APPROVED = "approved"            # Human approved this plan version
    RESERVED = "reserved"            # Stock atomically held
    IN_TRANSIT = "in_transit"        # Dispatched, not yet received
    RECEIVED = "received"            # Confirmed at hospital
    CANCELLED = "cancelled"          # Released back to supplier
    EXPIRED = "expired"              # Reservation timed out
    REJECTED = "rejected"            # Failed constraint check


# States where stock is actively committed
ACTIVE_RESERVATION_STATES = {ResourceState.RESERVED, ResourceState.IN_TRANSIT}

# States where reservation is terminal
TERMINAL_STATES = {ResourceState.RECEIVED, ResourceState.CANCELLED,
                   ResourceState.EXPIRED, ResourceState.REJECTED}


@dataclass
class Reservation:
    """A resource reservation tracking the full commitment lifecycle."""
    id: str
    idempotency_key: str             # Prevents double-booking on retry
    supplier_id: str
    hospital_id: str
    route_id: str
    quantity: int
    plan_version: int                # Tied to specific approved plan
    state: ResourceState
    created_at: int                  # Simulation minute
    expires_at: int | None = None    # Auto-expire time
    approved_at: int | None = None
    reserved_at: int | None = None
    dispatched_at: int | None = None
    received_at: int | None = None
    rejection_reason: str = ""
    expected_arrival: int | None = None  # Computed from route

    @property
    def is_active(self) -> bool:
        """Is stock currently committed for this reservation?"""
        return self.state in ACTIVE_RESERVATION_STATES

    @property
    def is_terminal(self) -> bool:
        """Has this reservation reached a final state?"""
        return self.state in TERMINAL_STATES

    def to_dict(self) -> dict[str, Any]:
        """Serialize for API/logging."""
        return {
            "id": self.id,
            "idempotency_key": self.idempotency_key,
            "supplier_id": self.supplier_id,
            "hospital_id": self.hospital_id,
            "route_id": self.route_id,
            "quantity": self.quantity,
            "plan_version": self.plan_version,
            "state": self.state.value,
            "created_at": self.created_at,
            "expires_at": self.expires_at,
            "approved_at": self.approved_at,
            "reserved_at": self.reserved_at,
            "dispatched_at": self.dispatched_at,
            "received_at": self.received_at,
            "rejection_reason": self.rejection_reason,
            "expected_arrival": self.expected_arrival,
        }


@dataclass
class SupplierStock:
    """Runtime stock state for a supplier."""
    supplier_id: str
    confirmed_total: int             # Total confirmed stock
    stock_version: int = 1           # Optimistic concurrency version

    def available(self, reservations: list[Reservation]) -> int:
        """Available stock = confirmed - (reserved + in_transit + received)."""
        deducted_states = {ResourceState.RESERVED, ResourceState.IN_TRANSIT, ResourceState.RECEIVED}
        committed = sum(
            r.quantity for r in reservations
            if r.supplier_id == self.supplier_id and r.state in deducted_states
        )
        return self.confirmed_total - committed

    def to_dict(self) -> dict[str, Any]:
        return {
            "supplier_id": self.supplier_id,
            "confirmed_total": self.confirmed_total,
            "stock_version": self.stock_version,
        }


@dataclass
class HospitalStock:
    """Runtime stock state for a hospital."""
    hospital_id: str
    on_hand: int                     # Current usable stock
    total_received: int = 0          # Cumulative received during exercise

    def to_dict(self) -> dict[str, Any]:
        return {
            "hospital_id": self.hospital_id,
            "on_hand": self.on_hand,
            "total_received": self.total_received,
        }


class InventoryManager:
    """
    Central inventory state manager.

    Thread-safe through a lock. All stock queries and mutations go through here.
    The reservation service uses this for atomic operations.
    """

    def __init__(self):
        self._lock = threading.Lock()
        self.supplier_stocks: dict[str, SupplierStock] = {}
        self.hospital_stocks: dict[str, HospitalStock] = {}
        self.reservations: dict[str, Reservation] = {}
        self._idempotency_index: dict[str, str] = {}  # key -> reservation_id

    # ---------- Initialization ----------

    def init_from_scenario(self, scenario) -> None:
        """Initialize stock from scenario definition."""
        from models.scenario import Scenario
        assert isinstance(scenario, Scenario)

        for s in scenario.suppliers:
            self.supplier_stocks[s.id] = SupplierStock(
                supplier_id=s.id,
                confirmed_total=s.confirmed_stock,
                stock_version=s.stock_version,
            )
        for h in scenario.hospitals:
            self.hospital_stocks[h.id] = HospitalStock(
                hospital_id=h.id,
                on_hand=h.on_hand_stock,
            )

    # ---------- Stock Queries ----------

    def get_supplier_stock(self, supplier_id: str) -> SupplierStock:
        """Get current stock state for a supplier."""
        if supplier_id not in self.supplier_stocks:
            raise KeyError(f"Supplier {supplier_id} not found in inventory")
        return self.supplier_stocks[supplier_id]

    def get_hospital_stock(self, hospital_id: str) -> HospitalStock:
        """Get current stock state for a hospital."""
        if hospital_id not in self.hospital_stocks:
            raise KeyError(f"Hospital {hospital_id} not found in inventory")
        return self.hospital_stocks[hospital_id]

    def available_stock(self, supplier_id: str) -> int:
        """Available (unreserved / undelivered) stock for a supplier."""
        stock = self.get_supplier_stock(supplier_id)
        supplier_reservations = [
            r for r in self.reservations.values()
            if r.supplier_id == supplier_id
        ]
        return stock.available(supplier_reservations)

    def active_reservations_for_supplier(self, supplier_id: str) -> list[Reservation]:
        """All active (stock-holding) reservations for a supplier."""
        return [
            r for r in self.reservations.values()
            if r.supplier_id == supplier_id and r.is_active
        ]

    def reservations_for_hospital(self, hospital_id: str) -> list[Reservation]:
        """All reservations destined for a hospital."""
        return [
            r for r in self.reservations.values()
            if r.hospital_id == hospital_id
        ]

    def active_reservations_for_hospital(self, hospital_id: str) -> list[Reservation]:
        """Active reservations destined for a hospital."""
        return [
            r for r in self.reservations.values()
            if r.hospital_id == hospital_id and r.is_active
        ]

    def total_reserved_for_hospital(self, hospital_id: str) -> int:
        """Total quantity currently reserved/in-transit for a hospital."""
        return sum(
            r.quantity for r in self.active_reservations_for_hospital(hospital_id)
        )

    def total_allocated_for_hospital(self, hospital_id: str) -> int:
        """Total quantity allocated (reserved, in-transit, or received) for a hospital."""
        return self.total_reserved_for_hospital(hospital_id) + self.get_hospital_stock(hospital_id).total_received

    # ---------- Stock Mutations (thread-safe) ----------

    def update_supplier_stock(self, supplier_id: str, new_total: int) -> int:
        """
        Update a supplier's confirmed stock and increment version.
        Returns the new version number.
        """
        with self._lock:
            stock = self.get_supplier_stock(supplier_id)
            stock.confirmed_total = new_total
            stock.stock_version += 1
            return stock.stock_version

    # ---------- Reservation Operations (thread-safe) ----------

    def find_by_idempotency_key(self, key: str) -> Reservation | None:
        """Look up an existing reservation by idempotency key."""
        rid = self._idempotency_index.get(key)
        if rid:
            return self.reservations.get(rid)
        return None

    def create_reservation(
        self,
        supplier_id: str,
        hospital_id: str,
        route_id: str,
        quantity: int,
        plan_version: int,
        idempotency_key: str,
        clock: int,
        expires_at: int | None = None,
        expected_arrival: int | None = None,
    ) -> Reservation:
        """
        Atomically create a reservation and deduct available stock.

        This is the ONLY way to commit stock. Thread-safe.
        Raises ValueError if stock is insufficient.
        """
        with self._lock:
            # Check idempotency
            existing = self.find_by_idempotency_key(idempotency_key)
            if existing is not None:
                return existing  # Idempotent replay

            # Verify stock sufficiency
            available = self.available_stock(supplier_id)
            if available < quantity:
                raise ValueError(
                    f"Insufficient stock: {available} available, {quantity} requested "
                    f"from supplier {supplier_id}"
                )

            # Verify version match
            stock = self.get_supplier_stock(supplier_id)
            if stock.stock_version != plan_version:
                raise ValueError(
                    f"Version mismatch: plan references v{plan_version}, "
                    f"current is v{stock.stock_version}"
                )

            # Create the reservation
            reservation = Reservation(
                id=f"RES-{uuid.uuid4().hex[:8].upper()}",
                idempotency_key=idempotency_key,
                supplier_id=supplier_id,
                hospital_id=hospital_id,
                route_id=route_id,
                quantity=quantity,
                plan_version=plan_version,
                state=ResourceState.RESERVED,
                created_at=clock,
                reserved_at=clock,
                expires_at=expires_at,
                expected_arrival=expected_arrival,
            )

            self.reservations[reservation.id] = reservation
            self._idempotency_index[idempotency_key] = reservation.id

            return reservation

    def dispatch_reservation(self, reservation_id: str, clock: int) -> Reservation:
        """Mark a reservation as dispatched (in transit)."""
        with self._lock:
            r = self.reservations[reservation_id]
            if r.state != ResourceState.RESERVED:
                raise ValueError(
                    f"Cannot dispatch reservation {reservation_id}: "
                    f"state is {r.state.value}, expected RESERVED"
                )
            r.state = ResourceState.IN_TRANSIT
            r.dispatched_at = clock
            return r

    def receive_delivery(self, reservation_id: str, clock: int) -> Reservation:
        """Confirm receipt at hospital. Increases hospital on-hand stock."""
        with self._lock:
            r = self.reservations[reservation_id]
            if r.state != ResourceState.IN_TRANSIT:
                raise ValueError(
                    f"Cannot receive reservation {reservation_id}: "
                    f"state is {r.state.value}, expected IN_TRANSIT"
                )
            r.state = ResourceState.RECEIVED
            r.received_at = clock

            # Increase hospital stock
            h_stock = self.get_hospital_stock(r.hospital_id)
            h_stock.on_hand += r.quantity
            h_stock.total_received += r.quantity

            return r

    def cancel_reservation(self, reservation_id: str, reason: str = "") -> Reservation:
        """Cancel a reservation, releasing the stock."""
        with self._lock:
            r = self.reservations[reservation_id]
            if r.is_terminal:
                raise ValueError(
                    f"Cannot cancel reservation {reservation_id}: "
                    f"already in terminal state {r.state.value}"
                )
            r.state = ResourceState.CANCELLED
            r.rejection_reason = reason
            return r

    def expire_reservation(self, reservation_id: str, clock: int) -> Reservation | None:
        """Expire a reservation if past its expiry time."""
        with self._lock:
            r = self.reservations[reservation_id]
            if r.expires_at is not None and clock >= r.expires_at and r.is_active:
                r.state = ResourceState.EXPIRED
                return r
            return None

    def expire_all_stale(self, clock: int) -> list[Reservation]:
        """Expire all reservations past their expiry time."""
        expired = []
        for rid in list(self.reservations):
            r = self.expire_reservation(rid, clock)
            if r is not None:
                expired.append(r)
        return expired

    # ---------- Snapshot ----------

    def snapshot(self) -> dict[str, Any]:
        """Full inventory snapshot for API/logging."""
        return {
            "supplier_stocks": {
                sid: {
                    **stock.to_dict(),
                    "available": self.available_stock(sid),
                    "active_reservations": len(self.active_reservations_for_supplier(sid)),
                }
                for sid, stock in self.supplier_stocks.items()
            },
            "hospital_stocks": {
                hid: stock.to_dict()
                for hid, stock in self.hospital_stocks.items()
            },
            "reservations": {
                rid: r.to_dict()
                for rid, r in self.reservations.items()
            },
        }
