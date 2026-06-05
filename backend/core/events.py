"""
AegisTrace Internal Event Bus
──────────────────────────────
Synchronous, in-process event bus for loose coupling between features.
No external dependencies.

Usage:
    from core.events import event_bus

    # Emit an event
    event_bus.emit("identity.discovered", {"node_id": 42, "node_type": "service_account"})

    # Register a handler (usually in main.py startup)
    @event_bus.on("identity.discovered")
    def handle_new_identity(payload):
        ...
"""
import logging
from collections import defaultdict
from typing import Callable, Dict, List, Any

logger = logging.getLogger("aegistrace.events")


class EventBus:
    def __init__(self):
        self._handlers: Dict[str, List[Callable]] = defaultdict(list)

    def on(self, event_name: str):
        """Decorator to register a handler for an event."""
        def decorator(fn: Callable):
            self._handlers[event_name].append(fn)
            return fn
        return decorator

    def register(self, event_name: str, handler: Callable) -> None:
        """Programmatically register a handler."""
        self._handlers[event_name].append(handler)

    def emit(self, event_name: str, payload: dict = None) -> None:
        """
        Fire event synchronously. All handlers run in order.
        Exceptions in handlers are logged but never crash the caller.
        """
        if payload is None:
            payload = {}
        handlers = self._handlers.get(event_name, [])
        for handler in handlers:
            try:
                handler(payload)
            except Exception as e:
                logger.error(f"[event_bus] Handler error on '{event_name}': {e}", exc_info=True)

    def emit_all(self, events: list) -> None:
        """Emit multiple events: [{"name": "...", "payload": {...}}, ...]"""
        for ev in events:
            self.emit(ev.get("name", ""), ev.get("payload", {}))

    @property
    def registered_events(self) -> list:
        return list(self._handlers.keys())


# ── Global singleton ──────────────────────────────────────────────────────────
event_bus = EventBus()


# ── Standard event name constants ─────────────────────────────────────────────
class Events:
    IDENTITY_DISCOVERED    = "identity.discovered"     # {node_id, node_type, source, timestamp}
    IDENTITY_RISK_CHANGED  = "identity.risk_changed"   # {node_id, old_score, new_score}
    ITDR_ALERT_FIRED       = "itdr.alert.fired"        # {alert_type, identity_id, severity, details}
    AGENT_ACTION_PENDING   = "agent.action.pending"    # {action_id, action_type, confidence}
    CASE_CREATED           = "case.created"            # {case_id, severity, analyst}
    CASE_CLOSED            = "case.closed"             # {case_id, closure_notes}
    ENDPOINT_CONNECTED     = "endpoint.connected"      # {agent_id, hostname, ip}
    SHADOW_AI_DETECTED     = "shadow_ai.detected"      # {process_name, destination, agent_id}
    TRUST_DECAY_TRIGGERED  = "trust.decay.triggered"   # {node_id, new_score}
