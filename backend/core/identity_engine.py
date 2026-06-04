"""
AegisTrace v4.0 — Pluggable Identity Risk Engine
──────────────────────────────────────────────────
Orchestrates registered RiskDetector subclasses, aggregates scores,
updates IdentityNode.risk_score, and writes an AuditLog entry.

Usage (in main.py):
    from core.identity_engine import engine, register_default_detectors
    register_default_detectors()

Usage (in endpoints):
    from core.identity_engine import engine
    result = engine.process(node_id=42, session=session)
"""
from __future__ import annotations

import json
from abc import ABC, abstractmethod
from datetime import datetime
from typing import List, Dict, Any, Optional
from sqlmodel import Session, select


# ── Abstract base class ───────────────────────────────────────────────────────

class RiskDetector(ABC):
    """
    Subclass this to create a new risk detector.
    Register it with: engine.register(MyDetector())
    """
    name: str = "base_detector"
    weight: float = 1.0        # contribution multiplier (e.g. 2.0 = double weight)

    @abstractmethod
    def analyze(self, node: Any, anomalies: List[Any]) -> float:
        """
        Return a risk score between 0.0 (safe) and 100.0 (critical).
        node       — IdentityNode SQLModel instance
        anomalies  — list of unresolved IdentityAnomaly instances for this node
        """
        raise NotImplementedError


# ── Core engine ───────────────────────────────────────────────────────────────

class IdentityEngine:
    """
    Maintains a registry of RiskDetectors.
    Call process(node_id, session) to run all detectors and update the node.
    """

    def __init__(self) -> None:
        self._detectors: List[RiskDetector] = []

    def register(self, detector: RiskDetector) -> None:
        self._detectors.append(detector)
        print(f"[IdentityEngine] Registered: {detector.name} (weight={detector.weight})")

    def process(self, node_id: int, session: Session) -> Dict[str, Any]:
        """
        Run all detectors for the node, aggregate scores, persist and return.

        Returns:
            {
              "node_id": int,
              "old_score": int,
              "new_score": int,
              "detector_results": [{name, score, weight, weighted_score}]
            }
        """
        # Import here to avoid circular imports at module load time
        from models import IdentityNode, IdentityAnomaly, AuditLog

        node = session.get(IdentityNode, node_id)
        if not node:
            raise ValueError(f"IdentityNode {node_id} not found")

        anomalies = session.exec(
            select(IdentityAnomaly).where(
                IdentityAnomaly.node_id == node_id,
                IdentityAnomaly.resolved == False,       # noqa: E712
            )
        ).all()

        detector_results = []
        total_weighted = 0.0
        total_weight   = 0.0

        for detector in self._detectors:
            raw_score     = float(detector.analyze(node, anomalies))
            raw_score     = max(0.0, min(100.0, raw_score))
            weighted      = raw_score * detector.weight
            total_weighted += weighted
            total_weight   += detector.weight
            detector_results.append({
                "name":           detector.name,
                "score":          round(raw_score, 1),
                "weight":         detector.weight,
                "weighted_score": round(weighted, 1),
            })

        # Weighted average → cap at 100
        if total_weight > 0:
            final_score = min(100.0, total_weighted / total_weight)
        else:
            final_score = 0.0

        old_score      = node.risk_score or 0
        node.risk_score = int(round(final_score))
        session.add(node)

        # Write audit trail
        session.add(AuditLog(
            action="identity_risk_recalculated",
            entity_type="identity_node",
            entity_id=str(node_id),
            old_value=str(old_score),
            new_value=json.dumps({"score": node.risk_score, "detectors": detector_results}),
        ))
        session.commit()
        session.refresh(node)

        return {
            "node_id":          node_id,
            "old_score":        old_score,
            "new_score":        node.risk_score,
            "detector_results": detector_results,
        }

    # ── convenience ──────────────────────────────────────────────────────────

    @staticmethod
    def severity_label(score: int) -> str:
        if score <= 20:  return "low"
        if score <= 50:  return "medium"
        if score <= 80:  return "high"
        return "critical"


# ── Three default detectors ───────────────────────────────────────────────────

class AnomalyCountDetector(RiskDetector):
    """
    Score based on count and severity of unresolved anomalies.
    Each anomaly contributes: low→5, medium→15, high→30, critical→50 points.
    """
    name   = "anomaly_count"
    weight = 1.5

    _WEIGHTS = {"low": 5, "medium": 15, "high": 30, "critical": 50}

    def analyze(self, node: Any, anomalies: List[Any]) -> float:
        return min(100.0, sum(self._WEIGHTS.get(a.severity, 5) for a in anomalies))


class LastSeenDetector(RiskDetector):
    """
    Score increases the longer the identity has been inactive (stale account).
    Never seen → 100. ≤14 days → 0. 30–59 days → 50. 90+ days → 100.
    """
    name   = "last_seen"
    weight = 1.0

    def analyze(self, node: Any, anomalies: List[Any]) -> float:
        if not node.last_seen:
            return 100.0
        days = (datetime.utcnow() - node.last_seen).days
        if days <= 14:  return 0.0
        if days <= 29:  return 20.0
        if days <= 59:  return 50.0
        if days <= 89:  return 70.0
        return 100.0


class CompromisedFlagDetector(RiskDetector):
    """
    If node.is_compromised is True → score 100, otherwise 0.
    Highest weight so a confirmed compromise always dominates.
    """
    name   = "compromised_flag"
    weight = 2.0

    def analyze(self, node: Any, anomalies: List[Any]) -> float:
        return 100.0 if node.is_compromised else 0.0


# ── Global singleton + registration helper ────────────────────────────────────

engine = IdentityEngine()


def register_default_detectors() -> None:
    """Call once at startup to register the three built-in detectors."""
    engine.register(AnomalyCountDetector())
    engine.register(LastSeenDetector())
    engine.register(CompromisedFlagDetector())
    print("[IdentityEngine] 3 default detectors registered.")
