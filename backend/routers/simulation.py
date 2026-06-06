"""
AegisTrace — MITRE ATT&CK Simulation Engine
─────────────────────────────────────────────
Injects real synthetic auth events into the ITDR pipeline and verifies
whether the corresponding detector fires. All synthetic identities use
the prefix __sim_<uuid>__@aegistrace.internal so they are never confused
with real analyst data.

Techniques supported:
  T1110     Brute Force                (→ credential_stuffing detector)
  T1078.001 Impossible Travel          (→ impossible_travel detector)
  T1078.004 New Device Login           (→ new_device detector)
  T1098     Privilege Escalation       (→ privilege_escalation detector)
  T1539     Steal Web Session Cookie   (→ token_theft detector)
"""
import json
import uuid
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from models import AuthEvent, SimulationRun, AuditLog, User
from database import get_session
from routers.auth import get_current_user
from routers.itdr import (
    _detect_credential_stuffing,
    _detect_impossible_travel,
    _detect_new_device,
    _detect_privilege_escalation,
    _detect_token_theft,
)

router = APIRouter(prefix="/api/simulation", tags=["simulation"])

# ── Technique catalogue ───────────────────────────────────────────────────────

TECHNIQUES = {
    "T1110": {
        "id": "T1110",
        "name": "Brute Force",
        "tactic": "Credential Access",
        "description": (
            "Adversary tries many passwords against one account until one works. "
            "AegisTrace detects this via its multi-window credential stuffing detector "
            "(5+ failed logins within 10 minutes triggers a HIGH alert)."
        ),
        "detector": "credential_stuffing",
        "events_count": 7,
        "expected": "DETECTED",
    },
    "T1078.001": {
        "id": "T1078.001",
        "name": "Valid Accounts — Impossible Travel",
        "tactic": "Initial Access",
        "description": (
            "The same account authenticates from Ireland and China within 2 hours — "
            "physically impossible. AegisTrace flags the continent mismatch as a "
            "CRITICAL impossible travel event."
        ),
        "detector": "impossible_travel",
        "events_count": 2,
        "expected": "DETECTED",
    },
    "T1078.004": {
        "id": "T1078.004",
        "name": "Valid Accounts — New Device",
        "tactic": "Initial Access",
        "description": (
            "Account logs in from a device never seen in the past 90 days. "
            "AegisTrace compares against the known-device history and raises "
            "a MEDIUM new device alert."
        ),
        "detector": "new_device",
        "events_count": 4,
        "expected": "DETECTED",
    },
    "T1098": {
        "id": "T1098",
        "name": "Account Manipulation — Privilege Escalation",
        "tactic": "Persistence",
        "description": (
            "An analyst role is elevated to admin without an approval flag. "
            "AegisTrace's privilege escalation detector catches unapproved "
            "privilege_change events and raises a CRITICAL alert."
        ),
        "detector": "privilege_escalation",
        "events_count": 1,
        "expected": "DETECTED",
    },
    "T1539": {
        "id": "T1539",
        "name": "Steal Web Session Cookie",
        "tactic": "Collection",
        "description": (
            "The same session token (tracked by device_id) is used from two "
            "different browser user-agents within 1 hour — a classic session "
            "hijacking pattern. AegisTrace detects the user-agent mismatch."
        ),
        "detector": "token_theft",
        "events_count": 2,
        "expected": "DETECTED",
    },
}

# ── Helpers ───────────────────────────────────────────────────────────────────

def _sim_identity() -> str:
    """Generate a unique synthetic identity that is clearly marked as simulation."""
    return f"__sim_{uuid.uuid4().hex[:8]}__@aegistrace.internal"


def _cleanup_sim_events(identity: str, session: Session) -> None:
    """Remove all synthetic auth events for this simulation identity."""
    events = session.exec(
        select(AuthEvent).where(AuthEvent.identity_label == identity)
    ).all()
    for ev in events:
        session.delete(ev)
    session.flush()


def _record_result(
    technique_id: str,
    identity: str,
    events_count: int,
    detection: Optional[dict],
    run_by: str,
    session: Session,
) -> SimulationRun:
    t = TECHNIQUES[technique_id]
    run = SimulationRun(
        technique_id=technique_id,
        technique_name=t["name"],
        mitre_tactic=t["tactic"],
        target_identity=identity,
        events_injected=events_count,
        detector_name=detection.get("detector") if detection else t["detector"],
        result="DETECTED" if detection else "NOT_DETECTED",
        confidence=detection.get("confidence") if detection else None,
        description=detection.get("description") if detection else "Detector did not fire — technique may not be configured or thresholds not met.",
        evidence=json.dumps(detection.get("evidence", {})) if detection else "{}",
        run_by=run_by,
    )
    session.add(run)
    return run


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/techniques")
def list_techniques(_user: User = Depends(get_current_user)):
    """Return the catalogue of available simulation techniques."""
    return list(TECHNIQUES.values())


@router.post("/run/{technique_id}")
def run_simulation(
    technique_id: str,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    """
    Run a single MITRE ATT&CK simulation.

    1. Generates synthetic auth events in the DB.
    2. Calls the actual ITDR detector function.
    3. Records the SimulationRun result.
    4. Cleans up synthetic events.
    5. Returns full result including evidence.
    """
    if technique_id not in TECHNIQUES:
        raise HTTPException(400, f"Unknown technique: {technique_id}. Valid: {list(TECHNIQUES)}")

    identity = _sim_identity()
    now      = datetime.utcnow()
    t        = TECHNIQUES[technique_id]
    detection: Optional[dict] = None
    events_created = 0

    # ── T1110: Brute Force ────────────────────────────────────────────────────
    if technique_id == "T1110":
        for _ in range(7):
            session.add(AuthEvent(
                identity_label=identity,
                event_type="failed_login",
                success=False,
                source_ip="198.51.100.42",  # TEST-NET-3 (RFC 5737, safe)
                country="CN",
                timestamp=now - timedelta(seconds=_ * 45),
            ))
        session.flush()
        events_created = 7
        detection = _detect_credential_stuffing(identity, None, session)

    # ── T1078.001: Impossible Travel ─────────────────────────────────────────
    elif technique_id == "T1078.001":
        session.add(AuthEvent(
            identity_label=identity,
            event_type="login",
            success=True,
            source_ip="193.1.100.1",   # Ireland range (safe)
            country="IE",
            timestamp=now - timedelta(hours=2),
        ))
        session.add(AuthEvent(
            identity_label=identity,
            event_type="login",
            success=True,
            source_ip="1.12.100.1",    # China range (safe)
            country="CN",
            timestamp=now,
        ))
        session.flush()
        events_created = 2
        detection = _detect_impossible_travel(identity, None, session)

    # ── T1078.004: New Device Login ───────────────────────────────────────────
    elif technique_id == "T1078.004":
        # Create 2 historical logins from a known device (95 days ago)
        known_device = f"sim-known-device-{uuid.uuid4().hex[:6]}"
        for i in range(2):
            session.add(AuthEvent(
                identity_label=identity,
                event_type="login",
                success=True,
                device_id=known_device,
                device_name="Corporate Laptop",
                source_ip="10.0.0.1",
                country="IE",
                timestamp=now - timedelta(days=95 + i),
            ))
        # New unknown device login (now)
        session.add(AuthEvent(
            identity_label=identity,
            event_type="login",
            success=True,
            device_id=f"sim-unknown-{uuid.uuid4().hex[:6]}",
            device_name="Unknown Device",
            source_ip="198.51.100.55",
            country="RU",
            timestamp=now,
        ))
        session.flush()
        events_created = 3
        detection = _detect_new_device(identity, None, session)

    # ── T1098: Privilege Escalation ───────────────────────────────────────────
    elif technique_id == "T1098":
        session.add(AuthEvent(
            identity_label=identity,
            event_type="privilege_change",
            success=True,
            privilege_before="analyst",
            privilege_after="admin",
            approved=False,
            source_ip="192.168.1.100",
            timestamp=now,
        ))
        session.flush()
        events_created = 1
        detection = _detect_privilege_escalation(identity, None, session)

    # ── T1539: Session Hijacking ──────────────────────────────────────────────
    elif technique_id == "T1539":
        session_id = f"sim-session-{uuid.uuid4().hex[:8]}"
        session.add(AuthEvent(
            identity_label=identity,
            event_type="login",
            success=True,
            device_id=session_id,
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0",
            source_ip="10.0.1.50",
            timestamp=now - timedelta(minutes=25),
        ))
        session.add(AuthEvent(
            identity_label=identity,
            event_type="login",
            success=True,
            device_id=session_id,              # same session — different UA
            user_agent="python-requests/2.31.0",  # attacker's tool
            source_ip="198.51.100.99",
            timestamp=now,
        ))
        session.flush()
        events_created = 2
        detection = _detect_token_theft(identity, None, session)

    # ── Record + cleanup ──────────────────────────────────────────────────────
    run = _record_result(technique_id, identity, events_created, detection, user.email, session)
    _cleanup_sim_events(identity, session)

    session.add(AuditLog(
        action="simulation_run",
        entity_type="simulation",
        entity_id=technique_id,
        new_value=json.dumps({"result": run.result, "technique": t["name"]}),
        user_id=user.id,
        user_email=user.email,
    ))
    session.commit()
    session.refresh(run)

    return {
        "id": run.id,
        "technique_id": technique_id,
        "technique_name": t["name"],
        "mitre_tactic": t["tactic"],
        "result": run.result,
        "detector_name": run.detector_name,
        "confidence": run.confidence,
        "description": run.description,
        "evidence": json.loads(run.evidence or "{}"),
        "events_injected": events_created,
        "run_at": run.run_at,
        "run_by": user.email,
    }


@router.get("/history")
def get_simulation_history(
    limit: int = 50,
    session: Session = Depends(get_session),
    _user: User = Depends(get_current_user),
):
    """Retrieve past simulation runs, newest first."""
    runs = session.exec(
        select(SimulationRun).order_by(SimulationRun.run_at.desc()).limit(limit)
    ).all()
    return [
        {
            "id": r.id,
            "technique_id": r.technique_id,
            "technique_name": r.technique_name,
            "mitre_tactic": r.mitre_tactic,
            "result": r.result,
            "detector_name": r.detector_name,
            "confidence": r.confidence,
            "events_injected": r.events_injected,
            "run_by": r.run_by,
            "run_at": r.run_at,
        }
        for r in runs
    ]


@router.delete("/history")
def clear_simulation_history(
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    """Clear all simulation run history."""
    if user.role not in ("admin",):
        raise HTTPException(403, "Admin only")
    runs = session.exec(select(SimulationRun)).all()
    for r in runs:
        session.delete(r)
    session.commit()
    return {"deleted": len(runs)}
