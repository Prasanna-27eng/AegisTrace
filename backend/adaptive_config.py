"""
AegisTrace Adaptive Thresholds Config — v10.1 Priority 3
──────────────────────────────────────────────────────────
In-memory runtime config singleton for the Adaptive Thresholds Agent.

Three detection thresholds + one tuning target are tunable within bounded
ranges (+/- ~20% of the shipped defaults). The agent (adaptive_agent.py)
is the only writer; routers/itdr.py, routers/defense.py and
routers/identity.py read from here instead of using hardcoded constants.

Consumers:
  anomaly_score_threshold         -> routers/identity.py  (IdentityNode.risk_score >= X => "high_risk")
  itdr_confidence_threshold       -> routers/itdr.py (gate for creating IdentityAnomaly/ITDRAlert)
                                      routers/defense.py (HITL_CONF — escalate to Defense Console review)
  behavioral_similarity_threshold -> routers/defense.py (AUTO_BLOCK_CONF — auto-handle threshold)
  defense_fp_tolerance            -> target false-positive rate used by the agent's own tuning logic
"""
import threading

_lock = threading.Lock()

_config = {
    "anomaly_score_threshold": 70,
    "behavioral_similarity_threshold": 0.85,
    "itdr_confidence_threshold": 0.75,
    "defense_fp_tolerance": 0.05,
}

# Agent may only move each value within these bounds (~ +/-20% of default)
ADJUSTMENT_BOUNDS = {
    "anomaly_score_threshold":         (56, 84),
    "behavioral_similarity_threshold": (0.68, 1.0),
    "itdr_confidence_threshold":       (0.60, 0.90),
}


def get(name: str):
    with _lock:
        return _config.get(name)


def get_all() -> dict:
    with _lock:
        return dict(_config)


def set_value(name: str, value):
    """Clamp to ADJUSTMENT_BOUNDS (if defined for this key) and store."""
    if name not in _config:
        raise KeyError(f"Unknown adaptive threshold: {name}")
    bounds = ADJUSTMENT_BOUNDS.get(name)
    if bounds:
        lo, hi = bounds
        value = max(lo, min(hi, value))
    with _lock:
        _config[name] = value
    return value
