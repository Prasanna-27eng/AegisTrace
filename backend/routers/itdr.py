"""
AegisTrace v4.0 — ITDR: Identity Threat Detection & Response
──────────────────────────────────────────────────────────────
Analysts enter auth events manually or paste from logs.
Four detectors run on demand to flag identity-based attack patterns.

Detectors (all work on AuthEvent data):
  1. CredentialStuffingDetector  — 5+ failed logins within 10 minutes
  2. ImpossibleTravelDetector    — logins from different continents < 4h apart
  3. NewDeviceDetector           — login from a device not seen before
  4. PrivilegeEscalationDetector — privilege_change event without approval

GET  /api/itdr/events
POST /api/itdr/events            — create single event
POST /api/itdr/events/parse      — paste raw log text → AI extracts events
POST /api/itdr/events/bulk       — create multiple events
POST /api/itdr/analyse           — run all 4 detectors for an identity
GET  /api/itdr/anomalies         — ITDR-sourced anomalies
"""
import json
import re
from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select
from models import AuthEvent, IdentityAnomaly, IdentityNode, User, AuditLog
from database import get_session
from routers.auth import get_current_user
from ai_router import call_ai_json

router = APIRouter(prefix="/api/itdr", tags=["itdr"])

# ── Country → rough geographic region (for impossible-travel detection) ───────
COUNTRY_REGION = {
    # Europe
    "IE": "EU", "GB": "EU", "FR": "EU", "DE": "EU", "NL": "EU", "BE": "EU",
    "ES": "EU", "IT": "EU", "PT": "EU", "SE": "EU", "NO": "EU", "DK": "EU",
    "FI": "EU", "PL": "EU", "CZ": "EU", "AT": "EU", "CH": "EU", "HU": "EU",
    "RO": "EU", "BG": "EU", "GR": "EU", "HR": "EU", "SK": "EU", "LT": "EU",
    "LV": "EU", "EE": "EU", "SI": "EU", "RU": "EU",
    # North America
    "US": "NA", "CA": "NA", "MX": "NA",
    # South America
    "BR": "SA", "AR": "SA", "CL": "SA", "CO": "SA", "PE": "SA",
    # Asia
    "CN": "AS", "JP": "AS", "KR": "AS", "IN": "AS", "SG": "AS",
    "HK": "AS", "TW": "AS", "TH": "AS", "ID": "AS", "MY": "AS",
    "PH": "AS", "VN": "AS", "PK": "AS", "BD": "AS",
    # Middle East
    "AE": "ME", "SA": "ME", "IL": "ME", "TR": "ME", "IR": "ME",
    # Africa
    "ZA": "AF", "NG": "AF", "EG": "AF", "KE": "AF", "GH": "AF",
    # Oceania
    "AU": "OC", "NZ": "OC",
}


def _region(country_code: Optional[str]) -> Optional[str]:
    if not country_code:
        return None
    return COUNTRY_REGION.get(country_code.upper())


# ── Detector 1: Credential Stuffing ─────────────────────────────────────────

def _detect_credential_stuffing(
    identity_label: str,
    node_id: Optional[int],
    session: Session,
    window_minutes: int = 10,
    threshold: int = 5,
) -> Optional[dict]:
    """5+ failed logins for the same identity within `window_minutes`."""
    cutoff = datetime.utcnow() - timedelta(minutes=window_minutes)
    q = select(AuthEvent).where(
        AuthEvent.event_type == "failed_login",
        AuthEvent.success == False,     # noqa: E712
        AuthEvent.timestamp >= cutoff,
    )
    if node_id:
        q = q.where(AuthEvent.node_id == node_id)
    else:
        q = q.where(AuthEvent.identity_label == identity_label)

    failures = session.exec(q).all()
    if len(failures) >= threshold:
        return {
            "detector": "credential_stuffing",
            "severity": "high",
            "confidence": 0.95,
            "description": (
                f"{len(failures)} failed logins for '{identity_label}' "
                f"within {window_minutes} minutes — likely credential stuffing"
            ),
            "evidence": {
                "failed_count": len(failures),
                "window_minutes": window_minutes,
                "threshold": threshold,
                "source_ips": list({e.source_ip for e in failures if e.source_ip}),
            },
        }
    return None


# ── Detector 2: Impossible Travel ───────────────────────────────────────────

def _detect_impossible_travel(
    identity_label: str,
    node_id: Optional[int],
    session: Session,
    hours: int = 4,
) -> Optional[dict]:
    """Two successful logins from different continents within `hours` hours."""
    cutoff = datetime.utcnow() - timedelta(hours=hours * 2)
    q = (
        select(AuthEvent)
        .where(
            AuthEvent.event_type.in_(["login"]),
            AuthEvent.success == True,      # noqa: E712
            AuthEvent.timestamp >= cutoff,
            AuthEvent.country != None,      # noqa: E711
        )
        .order_by(AuthEvent.timestamp.desc())
        .limit(20)
    )
    if node_id:
        q = q.where(AuthEvent.node_id == node_id)
    else:
        q = q.where(AuthEvent.identity_label == identity_label)

    logins = session.exec(q).all()
    for i in range(len(logins) - 1):
        a, b = logins[i], logins[i + 1]
        diff_hours = abs((a.timestamp - b.timestamp).total_seconds()) / 3600
        if diff_hours > hours:
            continue
        region_a = _region(a.country)
        region_b = _region(b.country)
        if region_a and region_b and region_a != region_b:
            return {
                "detector": "impossible_travel",
                "severity": "critical",
                "confidence": 0.92,
                "description": (
                    f"Impossible travel for '{identity_label}': "
                    f"{b.country} ({region_b}) → {a.country} ({region_a}) "
                    f"in {diff_hours:.1f}h"
                ),
                "evidence": {
                    "login_a": {
                        "country": a.country, "region": region_a,
                        "ip": a.source_ip, "time": a.timestamp.isoformat(),
                    },
                    "login_b": {
                        "country": b.country, "region": region_b,
                        "ip": b.source_ip, "time": b.timestamp.isoformat(),
                    },
                    "hours_apart": round(diff_hours, 2),
                },
            }
    return None


# ── Detector 3: New Device ───────────────────────────────────────────────────

def _detect_new_device(
    identity_label: str,
    node_id: Optional[int],
    session: Session,
    lookback_days: int = 90,
) -> Optional[dict]:
    """A login from a device_id never seen in the past `lookback_days` days."""
    cutoff = datetime.utcnow() - timedelta(days=lookback_days)

    # Historical devices
    hist_q = (
        select(AuthEvent)
        .where(
            AuthEvent.event_type == "login",
            AuthEvent.success == True,      # noqa: E712
            AuthEvent.timestamp < cutoff,
            AuthEvent.device_id != None,    # noqa: E711
        )
    )
    if node_id:
        hist_q = hist_q.where(AuthEvent.node_id == node_id)
    else:
        hist_q = hist_q.where(AuthEvent.identity_label == identity_label)
    known_devices = {e.device_id for e in session.exec(hist_q).all() if e.device_id}

    # Recent logins
    recent_q = (
        select(AuthEvent)
        .where(
            AuthEvent.event_type == "login",
            AuthEvent.success == True,      # noqa: E712
            AuthEvent.timestamp >= cutoff,
            AuthEvent.device_id != None,    # noqa: E711
        )
        .order_by(AuthEvent.timestamp.desc())
        .limit(5)
    )
    if node_id:
        recent_q = recent_q.where(AuthEvent.node_id == node_id)
    else:
        recent_q = recent_q.where(AuthEvent.identity_label == identity_label)
    recent_logins = session.exec(recent_q).all()

    if not known_devices:
        return None  # No history to compare against

    new_device_logins = [e for e in recent_logins if e.device_id not in known_devices]
    if new_device_logins:
        ev = new_device_logins[0]
        return {
            "detector": "new_device",
            "severity": "medium",
            "confidence": 0.88,
            "description": (
                f"'{identity_label}' logged in from unrecognised device "
                f"'{ev.device_name or ev.device_id}' "
                f"({ev.country or 'unknown location'})"
            ),
            "evidence": {
                "device_id": ev.device_id,
                "device_name": ev.device_name,
                "source_ip": ev.source_ip,
                "country": ev.country,
                "timestamp": ev.timestamp.isoformat(),
                "known_device_count": len(known_devices),
            },
        }
    return None


# ── Detector 4: Privilege Escalation ────────────────────────────────────────

def _detect_privilege_escalation(
    identity_label: str,
    node_id: Optional[int],
    session: Session,
    hours: int = 24,
) -> Optional[dict]:
    """Privilege change event where approved is False or None within `hours`h."""
    cutoff = datetime.utcnow() - timedelta(hours=hours)
    q = (
        select(AuthEvent)
        .where(
            AuthEvent.event_type == "privilege_change",
            AuthEvent.timestamp >= cutoff,
            AuthEvent.approved != True,     # noqa: E712 — catches False + None
        )
        .order_by(AuthEvent.timestamp.desc())
        .limit(5)
    )
    if node_id:
        q = q.where(AuthEvent.node_id == node_id)
    else:
        q = q.where(AuthEvent.identity_label == identity_label)

    priv_changes = session.exec(q).all()
    if priv_changes:
        ev = priv_changes[0]
        return {
            "detector": "privilege_escalation",
            "severity": "critical",
            "confidence": 0.97,
            "description": (
                f"Unapproved privilege change for '{identity_label}': "
                f"{ev.privilege_before or 'unknown'} → {ev.privilege_after or 'unknown'}"
            ),
            "evidence": {
                "privilege_before": ev.privilege_before,
                "privilege_after": ev.privilege_after,
                "approved": ev.approved,
                "timestamp": ev.timestamp.isoformat(),
                "source_ip": ev.source_ip,
            },
        }
    return None


# ── Helper: create anomaly from detection result ─────────────────────────────

def _create_anomaly(detection: dict, node_id: Optional[int], session: Session) -> IdentityAnomaly:
    sev_map = {"low": "low", "medium": "medium", "high": "high", "critical": "critical"}
    anomaly = IdentityAnomaly(
        node_id=node_id,
        anomaly_type=detection["detector"],
        description=detection["description"],
        severity=sev_map.get(detection["severity"], "medium"),
        confidence=detection["confidence"],
    )
    session.add(anomaly)
    return anomaly


# ── API Endpoints ─────────────────────────────────────────────────────────────

@router.get("/events")
def list_auth_events(
    node_id: Optional[int]   = Query(None),
    identity: Optional[str]  = Query(None),
    event_type: Optional[str] = Query(None),
    limit: int = Query(100),
    session: Session = Depends(get_session),
    _user: User = Depends(get_current_user),
):
    q = select(AuthEvent).order_by(AuthEvent.timestamp.desc()).limit(limit)
    if node_id:
        q = q.where(AuthEvent.node_id == node_id)
    if identity:
        q = q.where(AuthEvent.identity_label == identity)
    if event_type:
        q = q.where(AuthEvent.event_type == event_type)
    return session.exec(q).all()


@router.post("/events")
def create_auth_event(
    data: dict,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    """Create a single authentication event."""
    raw_ts = data.get("timestamp")
    ts = datetime.fromisoformat(raw_ts) if raw_ts else datetime.utcnow()
    event = AuthEvent(
        node_id=data.get("node_id"),
        identity_label=data.get("identity_label", ""),
        event_type=data.get("event_type", "login"),
        success=data.get("success", True),
        source_ip=data.get("source_ip"),
        country=data.get("country"),
        city=data.get("city"),
        region=data.get("region"),
        device_id=data.get("device_id"),
        device_name=data.get("device_name"),
        user_agent=data.get("user_agent"),
        privilege_before=data.get("privilege_before"),
        privilege_after=data.get("privilege_after"),
        approved=data.get("approved"),
        case_id=data.get("case_id"),
        notes=data.get("notes"),
        timestamp=ts,
    )
    session.add(event)
    session.add(AuditLog(
        action="itdr_event_added", entity_type="auth_event",
        entity_id=data.get("identity_label", ""),
        user_id=user.id, user_email=user.email,
    ))
    session.commit()
    session.refresh(event)
    return event


@router.post("/events/bulk")
def create_bulk_events(
    data: dict,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    """Create multiple events at once. Body: {events: [...]}"""
    events = data.get("events", [])
    created = []
    for d in events:
        raw_ts = d.get("timestamp")
        ts = datetime.fromisoformat(raw_ts) if raw_ts else datetime.utcnow()
        ev = AuthEvent(
            node_id=d.get("node_id"),
            identity_label=d.get("identity_label", ""),
            event_type=d.get("event_type", "login"),
            success=d.get("success", True),
            source_ip=d.get("source_ip"),
            country=d.get("country"),
            city=d.get("city"),
            device_id=d.get("device_id"),
            device_name=d.get("device_name"),
            privilege_before=d.get("privilege_before"),
            privilege_after=d.get("privilege_after"),
            approved=d.get("approved"),
            timestamp=ts,
        )
        session.add(ev)
        created.append(ev)
    session.commit()
    return {"created": len(created)}


@router.post("/events/parse")
def parse_log_text(
    data: dict,
    _user: User = Depends(get_current_user),
):
    """
    Paste raw auth log text → AI extracts structured AuthEvent records.
    Body: {text: str, identity_label: str (optional)}
    """
    text = (data.get("text") or "").strip()
    if not text:
        raise HTTPException(400, "text required")

    label = data.get("identity_label", "")
    prompt = f"""You are a SOC analyst parsing authentication log entries.
Extract all authentication events from the following log text.

Log text:
{text[:3000]}

Return ONLY valid JSON as a list of objects. Each object must have:
- identity_label: string (email, username, or identifier)
- event_type: one of [login, failed_login, logout, privilege_change, mfa_challenge, password_reset, account_lock]
- success: boolean
- source_ip: string or null
- country: 2-letter ISO code or null
- city: string or null
- device_name: string or null
- device_id: string or null
- privilege_before: string or null (for privilege_change only)
- privilege_after: string or null (for privilege_change only)
- approved: boolean or null (for privilege_change only)
- timestamp: ISO datetime string or null
- notes: string with relevant log context

If identity_label is not in the log, use: "{label or 'unknown'}"
Return [] if no auth events are found."""

    parsed = call_ai_json("extraction", prompt, temperature=0.1, max_tokens=1500)
    if isinstance(parsed, list):
        return {"events": parsed, "count": len(parsed)}
    if isinstance(parsed, dict) and "events" in parsed:
        return {"events": parsed["events"], "count": len(parsed["events"])}
    return {"events": [], "count": 0, "raw": parsed}


@router.post("/analyse")
def run_itdr_detectors(
    data: dict,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    """
    Run all 4 ITDR detectors for a given identity and persist anomalies.

    Body: {node_id?: int, identity_label?: str}
    Returns: {detections: [...], anomalies_created: int}
    """
    node_id    = data.get("node_id")
    label      = data.get("identity_label", "")

    # Resolve label from node if not provided
    if node_id and not label:
        node = session.get(IdentityNode, node_id)
        if node:
            label = node.label

    if not label and not node_id:
        raise HTTPException(400, "node_id or identity_label required")

    detections = []
    for fn in [
        lambda: _detect_credential_stuffing(label, node_id, session),
        lambda: _detect_impossible_travel(label, node_id, session),
        lambda: _detect_new_device(label, node_id, session),
        lambda: _detect_privilege_escalation(label, node_id, session),
    ]:
        result = fn()
        if result:
            detections.append(result)
            _create_anomaly(result, node_id, session)

    if detections:
        session.add(AuditLog(
            action="itdr_analysis_run",
            entity_type="identity_node" if node_id else "identity_label",
            entity_id=str(node_id or label),
            new_value=json.dumps({"detections": len(detections)}),
            user_id=user.id, user_email=user.email,
        ))
    session.commit()

    return {
        "identity_label": label,
        "node_id": node_id,
        "detections": detections,
        "anomalies_created": len(detections),
    }


@router.get("/anomalies")
def list_itdr_anomalies(
    resolved: bool = Query(False),
    session: Session = Depends(get_session),
    _user: User = Depends(get_current_user),
):
    """Return anomalies sourced from ITDR detectors."""
    itdr_types = ["credential_stuffing", "impossible_travel", "new_device", "privilege_escalation"]
    q = (
        select(IdentityAnomaly)
        .where(
            IdentityAnomaly.anomaly_type.in_(itdr_types),
            IdentityAnomaly.resolved == resolved,   # noqa: E712
        )
        .order_by(IdentityAnomaly.detected_at.desc())
    )
    return session.exec(q).all()
