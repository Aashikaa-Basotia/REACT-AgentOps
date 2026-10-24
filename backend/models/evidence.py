"""
Evidence model — tracking the provenance and freshness of every claim.

Every availability observation, supplier reply, or route status carries
its source, observation time, and verification state. This ensures that
the system never silently treats a stale or unconfirmed claim as fact.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any


class VerificationState(str, Enum):
    """How well-confirmed is this piece of evidence?"""
    UNVERIFIED = "unverified"        # Reported but not confirmed
    CONFIRMED = "confirmed"          # Confirmed by a reliable source
    SUPERSEDED = "superseded"        # Newer information exists
    EXPIRED = "expired"              # Past the freshness window
    CONTRADICTED = "contradicted"    # Conflicts with newer confirmed evidence


class EvidenceType(str, Enum):
    """What kind of claim does this evidence represent?"""
    STOCK_AVAILABILITY = "stock_availability"
    ROUTE_STATUS = "route_status"
    DELIVERY_ESTIMATE = "delivery_estimate"
    SUPPLIER_REPLY = "supplier_reply"
    FACILITY_REQUEST = "facility_request"
    CLARIFICATION = "clarification"


@dataclass
class Evidence:
    """A single piece of evidence with full provenance tracking."""
    id: str
    entity_id: str                   # Which hospital/supplier/route
    entity_type: str                 # "hospital", "supplier", "route"
    evidence_type: EvidenceType
    claim: str                       # Human-readable claim
    quantity: int | None = None      # Quantity if applicable
    unit: str = "batches"
    observed_at: int = 0             # Simulation time of observation
    source: str = ""                 # Who reported this
    verification: VerificationState = VerificationState.UNVERIFIED
    freshness_window: int = 60       # Minutes before this expires
    raw_message: str = ""            # Original text/message
    superseded_by: str | None = None # ID of newer evidence
    metadata: dict[str, Any] = field(default_factory=dict)

    def is_expired(self, current_time: int) -> bool:
        """Has this evidence passed its freshness window?"""
        return (current_time - self.observed_at) > self.freshness_window

    def is_usable(self, current_time: int) -> bool:
        """Can this evidence be used for decision-making right now?"""
        if self.verification in (VerificationState.SUPERSEDED,
                                  VerificationState.CONTRADICTED):
            return False
        if self.is_expired(current_time):
            return False
        return True

    def to_dict(self) -> dict[str, Any]:
        """Serialize for API/logging."""
        return {
            "id": self.id,
            "entity_id": self.entity_id,
            "entity_type": self.entity_type,
            "evidence_type": self.evidence_type.value,
            "claim": self.claim,
            "quantity": self.quantity,
            "unit": self.unit,
            "observed_at": self.observed_at,
            "source": self.source,
            "verification": self.verification.value,
            "freshness_window": self.freshness_window,
            "raw_message": self.raw_message,
            "superseded_by": self.superseded_by,
            "metadata": self.metadata,
        }


class EvidenceStore:
    """
    Manages all evidence records for a rehearsal run.

    Handles superseding, expiry, and queries by entity.
    """

    def __init__(self, freshness_window: int = 60):
        self.records: list[Evidence] = []
        self.default_freshness_window = freshness_window
        self._id_counter = 0

    def _next_id(self) -> str:
        self._id_counter += 1
        return f"EV-{self._id_counter:04d}"

    def add(
        self,
        entity_id: str,
        entity_type: str,
        evidence_type: EvidenceType,
        claim: str,
        observed_at: int,
        source: str,
        quantity: int | None = None,
        unit: str = "batches",
        verification: VerificationState = VerificationState.UNVERIFIED,
        raw_message: str = "",
        freshness_window: int | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> Evidence:
        """Add a new piece of evidence and auto-supersede older records."""
        ev = Evidence(
            id=self._next_id(),
            entity_id=entity_id,
            entity_type=entity_type,
            evidence_type=evidence_type,
            claim=claim,
            quantity=quantity,
            unit=unit,
            observed_at=observed_at,
            source=source,
            verification=verification,
            freshness_window=freshness_window or self.default_freshness_window,
            raw_message=raw_message,
            metadata=metadata or {},
        )

        # Auto-supersede older evidence of the same type for the same entity
        for old in self.records:
            if (old.entity_id == entity_id
                    and old.evidence_type == evidence_type
                    and old.verification not in (VerificationState.SUPERSEDED,
                                                  VerificationState.CONTRADICTED)
                    and old.observed_at < observed_at):
                old.verification = VerificationState.SUPERSEDED
                old.superseded_by = ev.id

        self.records.append(ev)
        return ev

    def latest_for(self, entity_id: str,
                   evidence_type: EvidenceType | None = None) -> Evidence | None:
        """Get the most recent usable evidence for an entity."""
        candidates = [
            e for e in self.records
            if e.entity_id == entity_id
            and e.verification not in (VerificationState.SUPERSEDED,
                                        VerificationState.CONTRADICTED)
            and (evidence_type is None or e.evidence_type == evidence_type)
        ]
        if not candidates:
            return None
        return max(candidates, key=lambda e: e.observed_at)

    def all_for(self, entity_id: str) -> list[Evidence]:
        """Get all evidence records for an entity (including superseded)."""
        return [e for e in self.records if e.entity_id == entity_id]

    def by_entity(self, entity_id: str) -> list[Evidence]:
        """Alias for all_for."""
        return self.all_for(entity_id)

    def usable_for(self, entity_id: str, current_time: int) -> list[Evidence]:
        """Get all currently usable evidence for an entity."""
        return [
            e for e in self.records
            if e.entity_id == entity_id and e.is_usable(current_time)
        ]

    def expire_stale(self, current_time: int) -> list[Evidence]:
        """Mark all stale evidence as expired. Returns newly expired records."""
        newly_expired = []
        for e in self.records:
            if (e.verification == VerificationState.CONFIRMED
                    and e.is_expired(current_time)):
                e.verification = VerificationState.EXPIRED
                newly_expired.append(e)
        return newly_expired

    def get(self, evidence_id: str) -> Evidence | None:
        """Look up evidence by ID."""
        for e in self.records:
            if e.id == evidence_id:
                return e
        return None

    def confirmed_count(self) -> int:
        """Number of currently confirmed evidence records."""
        return sum(1 for e in self.records
                   if e.verification == VerificationState.CONFIRMED)

    def snapshot(self) -> list[dict[str, Any]]:
        """Full evidence snapshot for API/logging."""
        return [e.to_dict() for e in self.records]
