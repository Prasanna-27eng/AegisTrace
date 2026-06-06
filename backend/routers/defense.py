"""
AegisTrace AI Defense Engine — v5.3
─────────────────────────────────────
Real-time threat detection and AI-powered triage for the AegisTrace platform.

Components:
  1. Request Fingerprinter  — tracks per-IP patterns, detects AI agent behaviour
  2. Honeypot Endpoints     — fake routes only scanners hit
  3. Groq Triage Engine     — classifies threats, recommends actions (<1s)
  4. Defense Event API      — CRUD + approve/dismiss for the Defense Console

Attack types detected:
  - ai_agent_scan    : systematic endpoint scanning (AI agent tell)
  - honeypot_trigger : hit a fake endpoint no real user visits
  - rate_abuse       : too many requests too fast
  - brute_force      : repeated auth failures from same IP
  - api_abuse        : abnormal API usage pattern

Endpoints:
  POST /api/defense/honeypot/{path}   — honeypot trap (no auth)
  GET  /api/defense/events            — list all defense events
  GET  /api/defense/events/{id}       — get single event
  POST /api/defense/events/{id}/review — approve / dismiss / watchlist
  GET  /api/defense/stats             — summary counts for the console KPIs
  POST /api/defense/test              — manual test trigger (dev only)
"""

import json
import time
import asyncio
from collections import defaultdict
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlmodel import Session, select

from database import get_session
from models import DefenseEvent, AuditLog, ProvenanceLedger
from routers.auth import get_current_user
from ai_router import call_ai_json

router = APIRouter(prefix="/api/defense", tags=["defense-engine"])

# ── In-memory fingerprint state (resets on restart — intentional for prototype) ─
# Structure: { ip: { "requests": [(timestamp, path), ...], "endpoints": set() } }
_fingerprint: dict = defaultdict(lambda: {"requests": [], "endpoints": set(), "ua_set": set()})

# IPs currently on watchlist (in-memory — persisted to DefenseEvent table)
_watchlist: set = set()
# IPs currently rate-limited
_rate_limited: set = set()

# Thresholds
SCAN_THRESHOLD_REQ  = 40    # requests in 60s = suspicious
SCAN_THRESHOLD_EP   = 8     # unique endpoints in 60s = scanner
RATE_ABUSE_WINDOW   = 60    # seconds
AUTO_BLOCK_CONF     = 0.92  # confidence above this → auto-handle (watchlist + alert)
HITL_CONF           = 0.70  # confidence above this → send to Defense Console for review


# ── Honeypot endpoint paths — real users never visit these ────────────────────
HONEYPOT_PATHS = {
    "admin/export",
    "admin/dump",
    "users/export",
    "users/all",
    "config/secrets",
    "config/env",
    "backup/download",
    "debug/vars",
    "internal/tokens",
    "v1/admin/keys",
}


# ── Helper: get real client IP ────────────────────────────────────────────────
def _get_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


# ── Helper: clean old fingerprint data (>60s) ────────────────────────────────
def _clean_fp(ip: str):
    cutoff = time.time() - RATE_ABUSE_WINDOW
    fp = _fingerprint[ip]
    fp["requests"] = [(t, p) for t, p in fp["requests"] if t > cutoff]
    # Rebuild endpoint set from recent requests only
    fp["endpoints"] = {p for _, p in fp["requests"]}


# ── Groq triage engine ────────────────────────────────────────────────────────
async def _triage_with_groq(
    ip: str,
    attack_type: str,
    endpoint_hit: str,
    request_count: int,
    unique_endpoints: int,
    user_agent: str,
    pattern_summary: str,
) -> dict:
    """Send threat signal to Groq for classification. Returns structured triage result."""
    prompt = f"""You are AegisTrace's AI defense engine. Analyse this incoming threat signal.

THREAT SIGNAL:
- Source IP: {ip}
- Attack type flagged: {attack_type}
- Endpoint that triggered detection: {endpoint_hit}
- Requests in last 60s: {request_count}
- Unique endpoints probed: {unique_endpoints}
- User-Agent: {user_agent or 'none'}
- Pattern summary: {pattern_summary}

Classify this threat and recommend a defense action.

Respond ONLY with valid JSON:
{{
  "threat_type": "AI Agent Scanner | Brute Force Bot | Credential Stuffer | API Abuser | Suspicious Crawler | Honeypot Trigger | Unknown",
  "confidence": <0.0 to 1.0>,
  "severity": "low | medium | high | critical",
  "reasoning": "2-3 sentence explanation of why this matches the threat type",
  "recommended_action": "watchlist | rate_limit | block | escalate | dismiss",
  "indicators": ["key indicator 1", "key indicator 2", "key indicator 3"]
}}"""

    result = call_ai_json("fast", prompt, temperature=0.1, max_tokens=350)
    return result if isinstance(result, dict) else {}


# ── Core detection + triage function ─────────────────────────────────────────
async def _detect_and_triage(
    request: Request,
    db: Session,
    attack_type: str,
    endpoint_hit: str,
):
    """Create a DefenseEvent and run Groq triage asynchronously."""
    ip = _get_ip(request)
    fp = _fingerprint[ip]
    ua = request.headers.get("User-Agent", "")
    req_count = len(fp["requests"])
    unique_eps = len(fp["endpoints"])
    pattern_summary = f"{req_count} requests, {unique_eps} unique endpoints probed in 60s"

    # Run Groq triage
    triage = await _triage_with_groq(
        ip=ip,
        attack_type=attack_type,
        endpoint_hit=endpoint_hit,
        request_count=req_count,
        unique_endpoints=unique_eps,
        user_agent=ua,
        pattern_summary=pattern_summary,
    )

    confidence   = float(triage.get("confidence", 0.5))
    severity     = triage.get("severity", "medium")
    recommended  = triage.get("recommended_action", "watchlist")
    threat_type  = triage.get("threat_type", "Unknown")
    reasoning    = triage.get("reasoning", "")

    # Determine status and response
    if confidence >= AUTO_BLOCK_CONF:
        status          = "auto_handled"
        response_action = recommended
        if ip not in _watchlist:
            _watchlist.add(ip)
    elif confidence >= HITL_CONF:
        status          = "pending_review"
        response_action = None
    else:
        status          = "auto_handled"
        response_action = "watchlist"
        _watchlist.add(ip)

    # Persist DefenseEvent
    event = DefenseEvent(
        attacker_ip=ip,
        attack_type=attack_type,
        threat_source="fingerprinter" if attack_type != "honeypot_trigger" else "honeypot",
        endpoint_hit=endpoint_hit,
        request_count=req_count,
        user_agent=ua[:500] if ua else None,
        request_pattern=json.dumps({
            "unique_endpoints": unique_eps,
            "request_count": req_count,
            "pattern": pattern_summary,
            "indicators": triage.get("indicators", []),
        }),
        ai_threat_type=threat_type,
        ai_confidence=confidence,
        ai_reasoning=reasoning,
        ai_recommended_action=recommended,
        ai_model_used="llama-3.1-8b-instant",
        status=status,
        response_action=response_action,
        severity=severity,
    )
    db.add(event)

    # Provenance ledger entry
    ledger = ProvenanceLedger(
        action_type="defense_triage",
        actor="defense-engine",
        model_used="llama-3.1-8b-instant",
        input_context=pattern_summary,
        output_summary=f"{threat_type} | conf={confidence:.2f} | action={recommended}",
        confidence=int(confidence * 100),
        approval_status="auto" if status == "auto_handled" else "pending",
    )
    db.add(ledger)
    db.commit()
    return event


# ── Request Fingerprinting (called from background thread only) ───────────────
async def fingerprint_request(request, db: Session):
    """
    Called from a background thread when threshold is already crossed.
    Runs Groq triage and persists DefenseEvent. Never on the hot request path.
    """
    ip   = _get_ip(request) if hasattr(request, 'client') else str(getattr(getattr(request, 'client', None), 'host', 'unknown'))
    path = str(getattr(getattr(request, 'url', None), 'path', '/unknown'))

    await _detect_and_triage(
        request=request,
        db=db,
        attack_type="ai_agent_scan",
        endpoint_hit=path,
    )


# ══════════════════════════════════════════════════════════════════════════════
# HONEYPOT ENDPOINTS — no auth required, any hit = instant flag
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/trap/{trap_path:path}", include_in_schema=False)
@router.post("/trap/{trap_path:path}", include_in_schema=False)
async def honeypot_trap(
    trap_path: str,
    request: Request,
    db: Session = Depends(get_session),
):
    """Honeypot — any access here is an instant flag. Returns plausible fake response."""
    await _detect_and_triage(
        request=request,
        db=db,
        attack_type="honeypot_trigger",
        endpoint_hit=f"/api/defense/trap/{trap_path}",
    )
    # Return plausible fake response to keep scanner engaged
    return {"status": "ok", "data": [], "token": "eyJhbGciOiJIUzI1NiJ9.fake"}


# Separate honeypot paths registered at app level (added in main.py)
async def honeypot_handler(request: Request, db: Session = Depends(get_session)):
    """Generic honeypot handler for all fake admin/config routes."""
    path = request.url.path
    await _detect_and_triage(
        request=request,
        db=db,
        attack_type="honeypot_trigger",
        endpoint_hit=path,
    )
    return {"status": "ok", "data": [], "message": "success"}


# ══════════════════════════════════════════════════════════════════════════════
# DEFENSE EVENT API
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/events")
def list_defense_events(
    status: Optional[str] = None,
    severity: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_session),
    current_user: dict = Depends(get_current_user),
):
    """List defense events — optionally filter by status or severity."""
    q = select(DefenseEvent).order_by(DefenseEvent.detected_at.desc()).limit(limit)
    if status:
        q = select(DefenseEvent).where(DefenseEvent.status == status).order_by(
            DefenseEvent.detected_at.desc()
        ).limit(limit)
    if severity:
        q = select(DefenseEvent).where(DefenseEvent.severity == severity).order_by(
            DefenseEvent.detected_at.desc()
        ).limit(limit)
    events = db.exec(q).all()
    return [_event_to_dict(e) for e in events]


@router.get("/events/{event_id}")
def get_defense_event(
    event_id: int,
    db: Session = Depends(get_session),
    current_user: dict = Depends(get_current_user),
):
    event = db.get(DefenseEvent, event_id)
    if not event:
        raise HTTPException(404, "Defense event not found")
    return _event_to_dict(event)


@router.post("/events/{event_id}/review")
def review_defense_event(
    event_id: int,
    payload: dict,
    db: Session = Depends(get_session),
    current_user: dict = Depends(get_current_user),
):
    """
    Analyst reviews a pending_review event.
    payload: { "action": "block|watchlist|dismiss|escalate", "notes": "..." }
    """
    event = db.get(DefenseEvent, event_id)
    if not event:
        raise HTTPException(404, "Defense event not found")

    action = payload.get("action", "dismiss")
    notes  = payload.get("notes", "")
    analyst = current_user.get("email", "analyst")

    event.status          = "approved" if action in ("block", "watchlist", "escalate") else "dismissed"
    event.response_action = action
    event.reviewed_by     = analyst
    event.review_notes    = notes
    event.reviewed_at     = datetime.utcnow()

    # Apply action to in-memory state
    if action == "block":
        _rate_limited.add(event.attacker_ip)
        _watchlist.add(event.attacker_ip)
    elif action == "watchlist":
        _watchlist.add(event.attacker_ip)

    # Audit log
    db.add(AuditLog(
        action=f"defense_{action}",
        entity_type="defense_event",
        entity_id=str(event_id),
        actor=analyst,
        new_value=f"IP {event.attacker_ip} → {action}. Notes: {notes}",
    ))

    db.add(event)
    db.commit()
    db.refresh(event)
    return _event_to_dict(event)


@router.get("/stats")
def defense_stats(
    db: Session = Depends(get_session),
    current_user: dict = Depends(get_current_user),
):
    """KPI counts for the Defense Console header."""
    all_events = db.exec(select(DefenseEvent)).all()
    total       = len(all_events)
    pending     = sum(1 for e in all_events if e.status == "pending_review")
    auto_handled = sum(1 for e in all_events if e.status == "auto_handled")
    blocked_ips  = len(_rate_limited)
    watchlisted  = len(_watchlist)
    critical     = sum(1 for e in all_events if e.severity == "critical")
    honeypot_hits = sum(1 for e in all_events if e.attack_type == "honeypot_trigger")
    ai_scans     = sum(1 for e in all_events if e.attack_type == "ai_agent_scan")

    return {
        "total_events":    total,
        "pending_review":  pending,
        "auto_handled":    auto_handled,
        "blocked_ips":     blocked_ips,
        "watchlisted":     watchlisted,
        "critical_events": critical,
        "honeypot_hits":   honeypot_hits,
        "ai_scan_events":  ai_scans,
        "engine_status":   "active",
    }


@router.post("/test")
async def trigger_test_event(
    db: Session = Depends(get_session),
    current_user: dict = Depends(get_current_user),
):
    """Dev tool — manually inject a test defense event to verify the console works."""
    triage = await _triage_with_groq(
        ip="10.0.0.99",
        attack_type="ai_agent_scan",
        endpoint_hit="/api/v1/admin/export",
        request_count=67,
        unique_endpoints=14,
        user_agent="python-httpx/0.25.0",
        pattern_summary="67 requests, 14 unique endpoints probed in 60s — systematic scanning pattern",
    )
    confidence  = float(triage.get("confidence", 0.88))
    event = DefenseEvent(
        attacker_ip="10.0.0.99",
        attack_type="ai_agent_scan",
        threat_source="fingerprinter",
        endpoint_hit="/api/v1/admin/export",
        request_count=67,
        user_agent="python-httpx/0.25.0",
        request_pattern=json.dumps({"unique_endpoints": 14, "request_count": 67}),
        ai_threat_type=triage.get("threat_type", "AI Agent Scanner"),
        ai_confidence=confidence,
        ai_reasoning=triage.get("reasoning", ""),
        ai_recommended_action=triage.get("recommended_action", "block"),
        ai_model_used="llama-3.1-8b-instant",
        status="pending_review",
        severity=triage.get("severity", "high"),
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return {"message": "Test event created", "event": _event_to_dict(event)}


# ── Serialiser ────────────────────────────────────────────────────────────────
def _event_to_dict(e: DefenseEvent) -> dict:
    return {
        "id":                    e.id,
        "attacker_ip":           e.attacker_ip,
        "attack_type":           e.attack_type,
        "threat_source":         e.threat_source,
        "endpoint_hit":          e.endpoint_hit,
        "request_count":         e.request_count,
        "user_agent":            e.user_agent,
        "request_pattern":       json.loads(e.request_pattern or "{}"),
        "ai_threat_type":        e.ai_threat_type,
        "ai_confidence":         e.ai_confidence,
        "ai_reasoning":          e.ai_reasoning,
        "ai_recommended_action": e.ai_recommended_action,
        "ai_model_used":         e.ai_model_used,
        "status":                e.status,
        "response_action":       e.response_action,
        "reviewed_by":           e.reviewed_by,
        "review_notes":          e.review_notes,
        "severity":              e.severity,
        "detected_at":           e.detected_at.isoformat() if e.detected_at else None,
        "reviewed_at":           e.reviewed_at.isoformat() if e.reviewed_at else None,
    }
