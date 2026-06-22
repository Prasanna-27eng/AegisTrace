"""
AegisTrace v4.3 — ITDR: Identity Threat Detection & Response
──────────────────────────────────────────────────────────────
Analysts enter auth events manually or paste from logs.
Six detectors (v4.3 hardened) run on demand to flag identity attacks.

Detectors:
  1. CredentialStuffingDetector  — multi-window: 10min/5, 1h/15, 24h/25 + distributed
  2. ImpossibleTravelDetector    — logins from different continents < 4h apart
  3. NewDeviceDetector           — login from a device not seen before
  4. PrivilegeEscalationDetector — privilege_change event without approval
  5. TokenTheftDetector          — same session token, different user-agents < 1h (v4.3)
  6. ShadowAIITDRDetector        — 3+ unapproved AI API hits in 24h (v4.3)

GET  /api/itdr/events
POST /api/itdr/events            — create single event
POST /api/itdr/events/parse      — paste raw log text → AI extracts events
POST /api/itdr/events/bulk       — create multiple events
POST /api/itdr/analyse           — run all detectors for an identity
GET  /api/itdr/anomalies         — ITDR-sourced anomalies
GET  /api/itdr/alerts            — ITDRAlert records
"""
import json
import re
import asyncio
import os
from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select
from models import AuthEvent, IdentityAnomaly, IdentityNode, User, AuditLog, ITDRAlert, ShadowAIEvent
from database import get_session
from routers.auth import get_current_user
from ai_router import call_ai_json
from core.events import event_bus, Events
from geoip import lookup_country
import adaptive_config

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


# ── Detector 1: Credential Stuffing (v4.3 — multi-window + distributed) ──────

def _detect_credential_stuffing(
    identity_label: str,
    node_id: Optional[int],
    session: Session,
    org_id: int,
) -> Optional[dict]:
    """
    v4.3 hardened: three time windows + cross-user distributed attack detection.
    Windows:
      10 min / 5+ failures  → HIGH
      1 hour / 15+ failures → HIGH
      24 hours / 25+ failures → CRITICAL
    Cross-user: same source IP, 2+ failures across 10+ different users in 1h → CRITICAL
    """
    now = datetime.utcnow()

    # ── Per-identity, multi-window ────────────────────────────────────────────
    windows = [
        (10,       5,  "high",     "10-minute"),
        (60,       15, "high",     "1-hour"),
        (60 * 24,  25, "critical", "24-hour"),
    ]

    for window_minutes, threshold, severity, label_str in windows:
        cutoff = now - timedelta(minutes=window_minutes)
        q = select(AuthEvent).where(
            AuthEvent.event_type == "failed_login",
            AuthEvent.success == False,   # noqa: E712
            AuthEvent.timestamp >= cutoff,
            AuthEvent.org_id == org_id,
        )
        if node_id:
            q = q.where(AuthEvent.node_id == node_id)
        else:
            q = q.where(AuthEvent.identity_label == identity_label)

        failures = session.exec(q).all()
        if len(failures) >= threshold:
            return {
                "detector": "credential_stuffing",
                "severity": severity,
                "confidence": 0.95,
                "description": (
                    f"{len(failures)} failed logins for '{identity_label}' "
                    f"within {label_str} — likely credential stuffing"
                ),
                "evidence": {
                    "failed_count": len(failures),
                    "window_minutes": window_minutes,
                    "threshold": threshold,
                    "source_ips": list({e.source_ip for e in failures if e.source_ip}),
                },
            }

    # ── Cross-user distributed attack detection ────────────────────────────────
    # Same source IP, failures across 10+ different users in 1h
    cutoff_1h = now - timedelta(hours=1)
    distributed_q = select(AuthEvent).where(
        AuthEvent.event_type == "failed_login",
        AuthEvent.success == False,      # noqa: E712
        AuthEvent.timestamp >= cutoff_1h,
        AuthEvent.source_ip != None,     # noqa: E711
        AuthEvent.org_id == org_id,
    )
    all_failures = session.exec(distributed_q).all()

    # Group by source IP
    ip_to_users: dict = {}
    for ev in all_failures:
        if ev.source_ip:
            ip_to_users.setdefault(ev.source_ip, set()).add(ev.identity_label)

    for ip, users in ip_to_users.items():
        if len(users) >= 10:
            return {
                "detector": "credential_stuffing_distributed",
                "severity": "critical",
                "confidence": 0.98,
                "description": (
                    f"Distributed credential stuffing from {ip}: "
                    f"failures across {len(users)} different accounts in 1 hour"
                ),
                "evidence": {
                    "source_ip": ip,
                    "unique_targets": len(users),
                    "sample_targets": list(users)[:5],
                    "window_hours": 1,
                },
            }

    return None


# ── Detector 2: Impossible Travel ───────────────────────────────────────────

def _detect_impossible_travel(
    identity_label: str,
    node_id: Optional[int],
    session: Session,
    org_id: int,
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
            AuthEvent.org_id == org_id,
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
    org_id: int,
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
            AuthEvent.org_id == org_id,
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
            AuthEvent.org_id == org_id,
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
    org_id: int,
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
            AuthEvent.org_id == org_id,
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

def _create_anomaly(detection: dict, node_id: Optional[int], session: Session, org_id: int) -> IdentityAnomaly:
    sev_map = {"low": "low", "medium": "medium", "high": "high", "critical": "critical"}
    anomaly = IdentityAnomaly(
        node_id=node_id,
        anomaly_type=detection["detector"],
        description=detection["description"],
        severity=sev_map.get(detection["severity"], "medium"),
        confidence=detection["confidence"],
        org_id=org_id,
    )
    session.add(anomaly)
    return anomaly


# ── Email notification helper ────────────────────────────────────────────────

def _notify_itdr_alert(alert, org_id: int, session):
    """
    Send email notification for CRITICAL/HIGH severity ITDR alerts.
    Uses the same _send_email helper as schedule_reports.py.
    Only fires if SENDGRID_API_KEY or SMTP_HOST is configured.
    Silently skips if no email config found.
    """
    if alert.severity not in ("critical", "high"):
        return

    # Get notification recipients — admin users in this org
    from sqlmodel import select as _select
    admins = session.exec(
        _select(User).where(
            User.org_id == org_id,
            User.role.in_(["admin", "analyst"]),
        )
    ).all()
    emails = [u.email for u in admins if u.email]
    if not emails:
        return

    has_email_config = bool(os.getenv("SENDGRID_API_KEY") or os.getenv("SMTP_HOST"))
    if not has_email_config:
        return

    severity_color = {"critical": "#EF4444", "high": "#F97316"}.get(alert.severity, "#6B7280")

    subject = f"[AegisTrace] {alert.severity.upper()} ITDR Alert: {alert.alert_type.replace('_', ' ').title()}"

    detected_str = alert.detected_at.strftime('%Y-%m-%d %H:%M UTC') if alert.detected_at else 'Now'

    body_html = f"""
    <div style="font-family: 'IBM Plex Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0B0F1A; color: #F1F5F9; padding: 0; border-radius: 8px; overflow: hidden;">
      <div style="background: {severity_color}; padding: 20px 28px;">
        <h1 style="margin: 0; font-size: 18px; color: #fff;">ITDR Alert — {alert.severity.upper()}</h1>
        <p style="margin: 6px 0 0; font-size: 13px; color: rgba(255,255,255,0.8);">{alert.alert_type.replace('_', ' ').title()}</p>
      </div>
      <div style="padding: 28px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 10px 0; color: #94A3B8; font-size: 12px; border-bottom: 1px solid rgba(255,255,255,0.06);">Identity</td>
              <td style="padding: 10px 0; font-size: 13px; text-align: right; border-bottom: 1px solid rgba(255,255,255,0.06);">{alert.identity_label}</td></tr>
          <tr><td style="padding: 10px 0; color: #94A3B8; font-size: 12px; border-bottom: 1px solid rgba(255,255,255,0.06);">Severity</td>
              <td style="padding: 10px 0; font-size: 13px; color: {severity_color}; font-weight: 700; text-align: right; border-bottom: 1px solid rgba(255,255,255,0.06);">{alert.severity.upper()}</td></tr>
          <tr><td style="padding: 10px 0; color: #94A3B8; font-size: 12px; border-bottom: 1px solid rgba(255,255,255,0.06);">Detected</td>
              <td style="padding: 10px 0; font-size: 13px; text-align: right; border-bottom: 1px solid rgba(255,255,255,0.06);">{detected_str}</td></tr>
        </table>
        <p style="margin: 20px 0 0; font-size: 13px; color: #94A3B8; line-height: 1.6;">{alert.description}</p>
        <div style="margin-top: 24px;">
          <a href="{os.getenv('PUBLIC_URL', 'https://aegistrace.uk')}/app/itdr"
             style="background: #2563EB; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-size: 13px; font-weight: 600; display: inline-block;">
            View in AegisTrace
          </a>
        </div>
      </div>
      <div style="padding: 16px 28px; border-top: 1px solid rgba(255,255,255,0.06); font-size: 11px; color: #475569;">
        AegisTrace · Identity Threat Detection · aegistrace.uk
      </div>
    </div>"""

    try:
        from routers.schedule_reports import _send_email
        _send_email(emails, subject, body_html)
    except Exception:
        pass  # Never let email failure break the ITDR flow


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
    q = (
        select(AuthEvent)
        .where(AuthEvent.org_id == _user.org_id)
        .order_by(AuthEvent.timestamp.desc())
        .limit(limit)
    )
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
    case_id = data.get("case_id")
    if case_id is not None:
        from models import Case
        case = session.get(Case, case_id)
        if not case or case.org_id != user.org_id:
            raise HTTPException(404, "Case not found")
    source_ip = data.get("source_ip")
    country   = data.get("country") or lookup_country(source_ip)
    event = AuthEvent(
        node_id=data.get("node_id"),
        identity_label=data.get("identity_label", ""),
        event_type=data.get("event_type", "login"),
        success=data.get("success", True),
        source_ip=source_ip,
        country=country,
        city=data.get("city"),
        region=data.get("region"),
        device_id=data.get("device_id"),
        device_name=data.get("device_name"),
        user_agent=data.get("user_agent"),
        privilege_before=data.get("privilege_before"),
        privilege_after=data.get("privilege_after"),
        approved=data.get("approved"),
        case_id=case_id,
        notes=data.get("notes"),
        org_id=user.org_id,
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
        source_ip = d.get("source_ip")
        country   = d.get("country") or lookup_country(source_ip)
        ev = AuthEvent(
            node_id=d.get("node_id"),
            identity_label=d.get("identity_label", ""),
            event_type=d.get("event_type", "login"),
            success=d.get("success", True),
            source_ip=source_ip,
            country=country,
            city=d.get("city"),
            device_id=d.get("device_id"),
            device_name=d.get("device_name"),
            privilege_before=d.get("privilege_before"),
            privilege_after=d.get("privilege_after"),
            approved=d.get("approved"),
            org_id=user.org_id,
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


# ── Detector 5: Token Theft (v4.3) ────────────────────────────────────────────

def _detect_token_theft(
    identity_label: str,
    node_id: Optional[int],
    session: Session,
    org_id: int,
    hours: int = 1,
) -> Optional[dict]:
    """
    Same session token (tracked via device_id as session key) used from
    two different user-agent strings within 1 hour.
    This catches session hijacking even when IP stays the same.
    """
    cutoff = datetime.utcnow() - timedelta(hours=hours)
    q = (
        select(AuthEvent)
        .where(
            AuthEvent.timestamp >= cutoff,
            AuthEvent.device_id != None,    # noqa: E711
            AuthEvent.user_agent != None,   # noqa: E711
            AuthEvent.org_id == org_id,
        )
        .order_by(AuthEvent.timestamp.desc())
    )
    if node_id:
        q = q.where(AuthEvent.node_id == node_id)
    else:
        q = q.where(AuthEvent.identity_label == identity_label)

    events = session.exec(q).all()

    # Group by device_id (used as session key)
    device_agents: dict = {}
    for ev in events:
        if ev.device_id:
            device_agents.setdefault(ev.device_id, set()).add(ev.user_agent or "")

    for device_id, agents in device_agents.items():
        # Filter empty strings
        agents = {a for a in agents if a}
        if len(agents) >= 2:
            agents_list = list(agents)
            return {
                "detector": "token_theft",
                "severity": "critical",
                "confidence": 0.91,
                "description": (
                    f"Session token used from {len(agents)} different user-agents within {hours}h "
                    f"for '{identity_label}' — possible session hijacking"
                ),
                "evidence": {
                    "device_id": device_id,
                    "user_agents": agents_list,
                    "window_hours": hours,
                    "unique_agents": len(agents),
                },
            }
    return None


# ── Detector 6: Shadow AI ITDR (v4.3) ─────────────────────────────────────────

def _detect_shadow_ai_usage(
    identity_label: str,
    node_id: Optional[int],
    session: Session,
    hours: int = 24,
    threshold: int = 3,
) -> Optional[dict]:
    """
    Same process hits unapproved AI API 3+ times in 24 hours → ITDR alert.
    First offence: MEDIUM. Repeat: HIGH.
    """
    try:
        cutoff = datetime.utcnow() - timedelta(hours=hours)
        events = session.exec(
            select(ShadowAIEvent).where(ShadowAIEvent.detected_at >= cutoff)
        ).all()

        if not events:
            return None

        # Group by process name
        proc_counts: dict = {}
        for ev in events:
            proc_counts[ev.process_name] = proc_counts.get(ev.process_name, 0) + 1

        for proc_name, count in proc_counts.items():
            if count >= threshold:
                # Check if this is a repeat offender (has alerts from before the window)
                older = session.exec(
                    select(ShadowAIEvent).where(
                        ShadowAIEvent.process_name == proc_name,
                        ShadowAIEvent.detected_at < cutoff,
                    )
                ).first()
                severity = "high" if older else "medium"

                return {
                    "detector": "shadow_ai",
                    "severity": severity,
                    "confidence": 0.93,
                    "description": (
                        f"Process '{proc_name}' made {count} unapproved AI API "
                        f"calls in {hours}h — Shadow AI usage escalated to ITDR alert"
                    ),
                    "evidence": {
                        "process_name": proc_name,
                        "call_count": count,
                        "window_hours": hours,
                        "threshold": threshold,
                        "is_repeat": bool(older),
                        "domains": list({e.destination_domain for e in events if e.process_name == proc_name}),
                    },
                }
    except Exception:
        pass
    return None


# ── API Endpoints ─────────────────────────────────────────────────────────────


@router.post("/analyse")
def run_itdr_detectors(
    data: dict,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    """
    Run all ITDR detectors for a given identity and persist anomalies.
    Body: {node_id?: int, identity_label?: str}
    """
    node_id = data.get("node_id")
    label   = data.get("identity_label", "")

    if node_id:
        node = session.get(IdentityNode, node_id)
        if not node or node.org_id != user.org_id:
            raise HTTPException(404, "Node not found")
        if not label:
            label = node.label

    if not label and not node_id:
        raise HTTPException(400, "node_id or identity_label required")

    org_id = user.org_id
    detections = []
    detectors = [
        lambda: _detect_credential_stuffing(label, node_id, session, org_id),
        lambda: _detect_impossible_travel(label, node_id, session, org_id),
        lambda: _detect_new_device(label, node_id, session, org_id),
        lambda: _detect_privilege_escalation(label, node_id, session, org_id),
        lambda: _detect_token_theft(label, node_id, session, org_id),
        lambda: _detect_shadow_ai_usage(label, node_id, session),
    ]

    min_confidence = adaptive_config.get("itdr_confidence_threshold")
    for fn in detectors:
        try:
            result = fn()
            if result and result["confidence"] >= min_confidence:
                detections.append(result)
                _create_anomaly(result, node_id, session, org_id)
                event_bus.emit(Events.ITDR_ALERT_FIRED, {
                    "alert_type": result["detector"],
                    "identity_id": node_id,
                    "severity": result["severity"],
                    "details": result.get("evidence", {}),
                })
        except Exception as e:
            pass

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
    itdr_types = [
        "credential_stuffing", "credential_stuffing_distributed",
        "impossible_travel", "new_device", "privilege_escalation",
        "token_theft", "shadow_ai",
    ]
    q = (
        select(IdentityAnomaly)
        .where(
            IdentityAnomaly.anomaly_type.in_(itdr_types),
            IdentityAnomaly.resolved == resolved,   # noqa: E712
            IdentityAnomaly.org_id == _user.org_id,
        )
        .order_by(IdentityAnomaly.detected_at.desc())
    )
    return session.exec(q).all()


@router.get("/alerts")
def list_itdr_alerts(
    status: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    limit: int = Query(50),
    offset: int = Query(0),
    session: Session = Depends(get_session),
    _user: User = Depends(get_current_user),
):
    """List all ITDRAlert records (from agents + manual analysis), scoped to the caller's org."""
    q = select(ITDRAlert).where(ITDRAlert.org_id == _user.org_id).order_by(ITDRAlert.detected_at.desc())
    if status:
        q = q.where(ITDRAlert.status == status)
    if severity:
        q = q.where(ITDRAlert.severity == severity)
    total = len(session.exec(q).all())
    items = session.exec(q.offset(offset).limit(limit)).all()
    return {
        "items": [
            {
                "id": a.id,
                "alert_type": a.alert_type,
                "severity": a.severity,
                "identity_label": a.identity_label,
                "description": a.description,
                "status": a.status,
                "detected_at": a.detected_at,
                "evidence": json.loads(a.evidence or "{}"),
            }
            for a in items
        ],
        "total": total, "limit": limit, "offset": offset,
    }


@router.get("/analytics")
def get_itdr_analytics(
    days: int = Query(30, ge=7, le=90),
    session: Session = Depends(get_session),
    _user: User = Depends(get_current_user),
):
    """
    ITDR Analytics dashboard data.
    Returns: detector fire rates, top targeted identities, 30-day trend,
             severity distribution, status breakdown, false-positive rate.
    """
    ITDR_TYPES = [
        "credential_stuffing", "credential_stuffing_distributed",
        "impossible_travel", "new_device", "privilege_escalation",
        "token_theft", "shadow_ai",
    ]
    cutoff = datetime.utcnow() - timedelta(days=days)

    # ── Raw data pulls (scoped to the caller's org) ──────────────────────────
    anomalies = session.exec(
        select(IdentityAnomaly).where(
            IdentityAnomaly.anomaly_type.in_(ITDR_TYPES),
            IdentityAnomaly.detected_at >= cutoff,
            IdentityAnomaly.org_id == _user.org_id,
        )
    ).all()

    alerts = session.exec(
        select(ITDRAlert).where(
            ITDRAlert.detected_at >= cutoff,
            ITDRAlert.org_id == _user.org_id,
        )
    ).all()

    active_count = len(session.exec(
        select(IdentityAnomaly).where(
            IdentityAnomaly.anomaly_type.in_(ITDR_TYPES),
            IdentityAnomaly.resolved == False,  # noqa: E712
            IdentityAnomaly.org_id == _user.org_id,
        )
    ).all()) + sum(1 for a in alerts if (a.status or "open") == "open")

    # ── 1. Detector fire rates (anomalies + agent alerts combined) ────────────
    detector_counts: dict = {}
    for a in anomalies:
        detector_counts[a.anomaly_type] = detector_counts.get(a.anomaly_type, 0) + 1
    for a in alerts:
        if a.alert_type:
            detector_counts[a.alert_type] = detector_counts.get(a.alert_type, 0) + 1

    # ── 2. Top targeted identities ────────────────────────────────────────────
    identity_counts: dict = {}
    for a in alerts:
        if a.identity_label:
            identity_counts[a.identity_label] = identity_counts.get(a.identity_label, 0) + 1

    top_identities = sorted(identity_counts.items(), key=lambda x: x[1], reverse=True)[:10]

    # ── 3. Daily trend — last 30 days capped ─────────────────────────────────
    daily: dict = {}
    for a in anomalies:
        day = a.detected_at.strftime("%Y-%m-%d")
        daily[day] = daily.get(day, 0) + 1
    for a in alerts:
        day = a.detected_at.strftime("%Y-%m-%d")
        daily[day] = daily.get(day, 0) + 1

    chart_days = min(days, 30)
    trend = [
        {
            "date": (datetime.utcnow() - timedelta(days=chart_days - 1 - i)).strftime("%Y-%m-%d"),
            "count": daily.get(
                (datetime.utcnow() - timedelta(days=chart_days - 1 - i)).strftime("%Y-%m-%d"), 0
            ),
        }
        for i in range(chart_days)
    ]

    # ── 4. Severity distribution ──────────────────────────────────────────────
    sev_counts = {"critical": 0, "high": 0, "medium": 0, "low": 0}
    for a in anomalies:
        sev = (a.severity or "low").lower()
        if sev in sev_counts:
            sev_counts[sev] += 1
    for a in alerts:
        sev = (a.severity or "low").lower()
        if sev in sev_counts:
            sev_counts[sev] += 1

    # ── 5. Alert status breakdown ─────────────────────────────────────────────
    status_counts: dict = {}
    for a in alerts:
        st = a.status or "open"
        status_counts[st] = status_counts.get(st, 0) + 1

    # ── 6. False positive rate ────────────────────────────────────────────────
    total_alerts = len(alerts)
    fp_count = sum(1 for a in alerts if a.status == "false_positive")
    fp_rate = round((fp_count / total_alerts * 100), 1) if total_alerts else 0.0

    return {
        "period_days": days,
        "total_detections": len(anomalies) + len(alerts),
        "active_threats": active_count,
        "total_alerts": total_alerts,
        "fp_count": fp_count,
        "fp_rate": fp_rate,
        "detector_fire_rates": sorted(
            [{"detector": k, "count": v} for k, v in detector_counts.items()],
            key=lambda x: x["count"],
            reverse=True,
        ),
        "top_targeted_identities": [
            {"identity": k, "count": v} for k, v in top_identities
        ],
        "daily_trend": trend,
        "severity_distribution": sev_counts,
        "status_breakdown": status_counts,
    }


@router.patch("/alerts/{alert_id}")
def update_itdr_alert(
    alert_id: int,
    data: dict,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    alert = session.get(ITDRAlert, alert_id)
    if not alert or alert.org_id != user.org_id:
        raise HTTPException(404)
    if "status" in data:
        alert.status = data["status"]
        if data["status"] == "resolved":
            alert.resolved_by = user.email
            alert.resolved_at = datetime.utcnow()
    if "case_id" in data:
        case_id = data["case_id"]
        if case_id is not None:
            from models import Case
            case = session.get(Case, case_id)
            if not case or case.org_id != user.org_id:
                raise HTTPException(404, "Case not found")
        alert.case_id = case_id
    session.add(alert)
    session.commit()
    return {"ok": True}
