"""
Event logging — the immutable audit trail of everything that happens.

Every tool call, state change, agent action, and human decision is
recorded as an Event. This supports replay, debugging, and evaluation.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any


class EventType(str, Enum):
    """Types of events in the system log."""
    # Scenario events (authored)
    SCENARIO_LOADED = "scenario_loaded"
    DISRUPTION_FIRED = "disruption_fired"
    CLOCK_ADVANCED = "clock_advanced"

    # Inventory events
    STOCK_UPDATED = "stock_updated"
    RESERVATION_CREATED = "reservation_created"
    RESERVATION_DISPATCHED = "reservation_dispatched"
    RESERVATION_RECEIVED = "reservation_received"
    RESERVATION_CANCELLED = "reservation_cancelled"
    RESERVATION_EXPIRED = "reservation_expired"
    RESERVATION_REJECTED = "reservation_rejected"

    # Agent events
    AGENT_STARTED = "agent_started"
    AGENT_THINKING = "agent_thinking"
    TOOL_CALLED = "tool_called"
    TOOL_RESULT = "tool_result"
    AGENT_MESSAGE = "agent_message"
    AGENT_FINISHED = "agent_finished"
    AGENT_ERROR = "agent_error"
    BUDGET_EXHAUSTED = "budget_exhausted"

    # Human events
    AWAITING_HUMAN_APPROVAL = "awaiting_human_approval"
    HUMAN_APPROVAL = "human_approval"
    HUMAN_REJECTION = "human_rejection"
    HUMAN_INPUT = "human_input"
    NEW_OPTION_INTRODUCED = "new_option_introduced"

    # Verification events
    CONSTRAINT_CHECK = "constraint_check"
    CONSTRAINT_PASSED = "constraint_passed"
    CONSTRAINT_FAILED = "constraint_failed"

    # Evidence events
    EVIDENCE_ADDED = "evidence_added"
    EVIDENCE_SUPERSEDED = "evidence_superseded"
    EVIDENCE_EXPIRED = "evidence_expired"

    # System events
    RUN_STARTED = "run_started"
    RUN_COMPLETED = "run_completed"
    DEBRIEF_GENERATED = "debrief_generated"
    ERROR = "error"

    # Governance and Ingestion events
    PROMPT_INJECTION_BLOCKED = "prompt_injection_blocked"
    DATA_INGESTED_AND_CONFIRMED = "data_ingested_and_confirmed"

    # Hospital Request Workflow events
    HOSPITAL_REQUEST_SUBMITTED = "hospital_request_submitted"
    HOSPITAL_REQUEST_ALLOCATED = "hospital_request_allocated"


@dataclass
class Event:
    """An immutable event record in the audit trail."""
    id: int                          # Sequential event number
    timestamp: int                   # Simulation minute
    event_type: EventType
    actor: str                       # Who caused this event
    description: str                 # Human-readable description
    details: dict[str, Any] = field(default_factory=dict)
    related_entities: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        """Serialize for API/logging."""
        return {
            "id": self.id,
            "timestamp": self.timestamp,
            "event_type": self.event_type.value,
            "actor": self.actor,
            "description": self.description,
            "details": self.details,
            "related_entities": self.related_entities,
        }


class EventLog:
    """
    Immutable, append-only event log.

    Supports queries by type, actor, time range, and entity.
    Used for replay, evaluation, and the agent activity feed.
    """

    def __init__(self):
        self._events: list[Event] = []
        self._next_id = 1

    def record(
        self,
        timestamp: int,
        event_type: EventType,
        actor: str,
        description: str,
        details: dict[str, Any] | None = None,
        related_entities: list[str] | None = None,
    ) -> Event:
        """Append an event to the log. Returns the created event."""
        event = Event(
            id=self._next_id,
            timestamp=timestamp,
            event_type=event_type,
            actor=actor,
            description=description,
            details=details or {},
            related_entities=related_entities or [],
        )
        self._events.append(event)
        self._next_id += 1
        return event

    @property
    def events(self) -> list[Event]:
        """All events in chronological order (read-only view)."""
        return list(self._events)

    def __len__(self) -> int:
        return len(self._events)

    def by_type(self, event_type: EventType) -> list[Event]:
        """Filter events by type."""
        return [e for e in self._events if e.event_type == event_type]

    def by_actor(self, actor: str) -> list[Event]:
        """Filter events by actor."""
        return [e for e in self._events if e.actor == actor]

    def by_entity(self, entity_id: str) -> list[Event]:
        """Filter events involving a specific entity."""
        return [e for e in self._events if entity_id in e.related_entities]

    def in_range(self, start: int, end: int) -> list[Event]:
        """Events within a time range (inclusive)."""
        return [e for e in self._events if start <= e.timestamp <= end]

    def since(self, event_id: int) -> list[Event]:
        """Events after a given event ID (for incremental fetch)."""
        return [e for e in self._events if e.id > event_id]

    def latest(self, n: int = 10) -> list[Event]:
        """Most recent N events."""
        return self._events[-n:]

    def tool_calls(self) -> list[Event]:
        """All tool call events."""
        return self.by_type(EventType.TOOL_CALLED)

    def agent_events(self) -> list[Event]:
        """All agent-related events."""
        agent_types = {
            EventType.AGENT_STARTED, EventType.AGENT_THINKING,
            EventType.TOOL_CALLED, EventType.TOOL_RESULT,
            EventType.AGENT_MESSAGE, EventType.AGENT_FINISHED,
            EventType.AGENT_ERROR, EventType.BUDGET_EXHAUSTED,
        }
        return [e for e in self._events if e.event_type in agent_types]

    def constraint_events(self) -> list[Event]:
        """All constraint check events."""
        check_types = {
            EventType.CONSTRAINT_CHECK, EventType.CONSTRAINT_PASSED,
            EventType.CONSTRAINT_FAILED,
        }
        return [e for e in self._events if e.event_type in check_types]

    def snapshot(self) -> list[dict[str, Any]]:
        """Full log snapshot for API/export."""
        return [e.to_dict() for e in self._events]
