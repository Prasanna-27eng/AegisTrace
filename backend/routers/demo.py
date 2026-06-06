"""
AegisTrace Demo Seed Router — v5.5
────────────────────────────────────
Seeds realistic demo data for all major features so analysts can see
how each section works without waiting for real events to accumulate.

POST /api/demo/seed       — seed all demo data (idempotent)
POST /api/demo/seed/defense — seed Defense Console events only
POST /api/demo/seed/identity — seed Identity Graph + Trust data only
DELETE /api/demo/clear    — remove all demo-seeded data (admin only)
"""

import json
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from database import get_session
from routers.auth import get_current_user, require_admin
from models import (
    User, IdentityNode, IdentityEdge, IdentityAnomaly, ITDRAlert,
    ShadowAIEvent, DefenseEvent, AuditLog, Endpoint, ProvenanceLedger,
    TrustEvent
)

router = APIRouter(prefix="/api/demo", tags=["demo"])

DEMO_TAG = "__demo__"   # marker in metadata_json to identify demo records


# ══════════════════════════════════════════════════════════════════════════════
# IDENTITY GRAPH DEMO DATA
# ══════════════════════════════════════════════════════════════════════════════

def _seed_identity(db: Session) -> dict:
    """Seed a realistic identity graph with anomalies."""
    now = datetime.utcnow()

    # Check if already seeded
    existing = db.exec(
        select(IdentityNode).where(IdentityNode.label == "alice.johnson@acmecorp.com")
    ).first()
    if existing:
        return {"skipped": True, "reason": "Identity demo data already exists"}

    # ── Users ──────────────────────────────────────────────────────────────────
    users = [
        IdentityNode(label="alice.johnson@acmecorp.com",   node_type="user", risk_score=12,  privilege_level="admin",   last_active=now - timedelta(hours=1),  is_compromised=False, metadata_json=json.dumps({"dept":"Engineering","demo":True}), anomaly_count_7d=0, trust_score_history=json.dumps([95,94,96,95,93,94,95])),
        IdentityNode(label="bob.smith@acmecorp.com",       node_type="user", risk_score=78,  privilege_level="medium",  last_active=now - timedelta(hours=3),  is_compromised=False, metadata_json=json.dumps({"dept":"Finance","demo":True}),      anomaly_count_7d=4, trust_score_history=json.dumps([88,85,72,68,60,55,48])),
        IdentityNode(label="carol.white@acmecorp.com",     node_type="user", risk_score=34,  privilege_level="low",     last_active=now - timedelta(days=1),   is_compromised=False, metadata_json=json.dumps({"dept":"HR","demo":True}),          anomaly_count_7d=1, trust_score_history=json.dumps([90,89,88,87,86,85,84])),
        IdentityNode(label="svc-payment-processor",        node_type="service_account", risk_score=55, privilege_level="high",  last_active=now - timedelta(minutes=5),is_compromised=False, metadata_json=json.dumps({"system":"payments","demo":True}),anomaly_count_7d=2, trust_score_history=json.dumps([80,82,79,75,70,68,65])),
        IdentityNode(label="COMPROMISED-daniel.evans@acmecorp.com", node_type="user", risk_score=95, privilege_level="high",last_active=now - timedelta(hours=2), is_compromised=True, metadata_json=json.dumps({"dept":"IT","demo":True,"breach_indicator":"impossible_travel"}), anomaly_count_7d=8, trust_score_history=json.dumps([88,85,60,45,30,20,10])),
        IdentityNode(label="api-key-stripe-prod",          node_type="api_key",  risk_score=40,  privilege_level="high",  last_active=now - timedelta(minutes=30),is_compromised=False, is_orphaned=False, metadata_json=json.dumps({"service":"stripe","demo":True}), anomaly_count_7d=0),
        IdentityNode(label="api-key-old-unused-2023",      node_type="api_key",  risk_score=85,  privilege_level="admin", last_active=now - timedelta(days=180),  is_compromised=False, is_orphaned=True,  metadata_json=json.dumps({"service":"unknown","demo":True}), anomaly_count_7d=0, credential_sprawl_score=0.9),
        IdentityNode(label="aegis-ai-agent-v1",            node_type="agent",    risk_score=22,  privilege_level="medium",last_active=now - timedelta(minutes=2),  is_compromised=False, metadata_json=json.dumps({"model":"llama-3.3","demo":True}), anomaly_count_7d=0),
        IdentityNode(label="token-jwt-session-8821",       node_type="token",    risk_score=15,  privilege_level="low",   last_active=now - timedelta(minutes=10), is_compromised=False, metadata_json=json.dumps({"type":"jwt","demo":True}),        anomaly_count_7d=0),
        IdentityNode(label="workstation-eng-alice",        node_type="device",   risk_score=10,  privilege_level="medium",last_active=now - timedelta(hours=1),    is_compromised=False, metadata_json=json.dumps({"os":"macOS 14","ip":"10.0.1.101","demo":True}), anomaly_count_7d=0),
    ]
    saved = {}
    for node in users:
        db.add(node)
        db.flush()
        saved[node.label] = node.id

    # ── Edges (relationships) ──────────────────────────────────────────────────
    edges_data = [
        ("alice.johnson@acmecorp.com",   "api-key-stripe-prod",              "owns"),
        ("alice.johnson@acmecorp.com",   "api-key-old-unused-2023",          "owns"),
        ("alice.johnson@acmecorp.com",   "workstation-eng-alice",             "used"),
        ("alice.johnson@acmecorp.com",   "token-jwt-session-8821",            "issued"),
        ("bob.smith@acmecorp.com",        "svc-payment-processor",            "accessed"),
        ("COMPROMISED-daniel.evans@acmecorp.com", "svc-payment-processor",   "accessed"),
        ("COMPROMISED-daniel.evans@acmecorp.com", "api-key-stripe-prod",      "accessed"),
        ("aegis-ai-agent-v1",             "token-jwt-session-8821",           "used"),
        ("svc-payment-processor",         "api-key-stripe-prod",              "used"),
    ]
    for src_label, tgt_label, rel in edges_data:
        if src_label in saved and tgt_label in saved:
            db.add(IdentityEdge(
                source_id=saved[src_label],
                target_id=saved[tgt_label],
                relationship=rel,
                confidence=95,
            ))

    # ── Anomalies ──────────────────────────────────────────────────────────────
    daniel_id = saved.get("COMPROMISED-daniel.evans@acmecorp.com")
    bob_id    = saved.get("bob.smith@acmecorp.com")
    svc_id    = saved.get("svc-payment-processor")

    anomalies = [
        IdentityAnomaly(node_id=daniel_id, anomaly_type="impossible_travel",    severity="critical", confidence=0.97, description="Login from Dublin IE at 09:15 UTC, then Shanghai CN at 11:20 UTC — 9,200km in 2h5m. Physically impossible.", detected_at=now - timedelta(hours=2)),
        IdentityAnomaly(node_id=daniel_id, anomaly_type="new_device",           severity="high",     confidence=0.91, description="First-time login from unrecognised device ID 'D-UNKNOWN-88421'. Previous 30 logins all from device D-LAPTOP-2291.", detected_at=now - timedelta(hours=2.5)),
        IdentityAnomaly(node_id=daniel_id, anomaly_type="privilege_escalation", severity="high",     confidence=0.88, description="Unapproved privilege change: analyst → admin at 11:22 UTC. No change request ticket found.", detected_at=now - timedelta(hours=1.5)),
        IdentityAnomaly(node_id=bob_id,    anomaly_type="failed_login",         severity="medium",   confidence=0.82, description="5 consecutive failed logins in 8 minutes from IP 185.220.101.47 — possible credential stuffing.", detected_at=now - timedelta(hours=3)),
        IdentityAnomaly(node_id=svc_id,    anomaly_type="new_location",         severity="medium",   confidence=0.75, description="Payment processor service account accessed from new IP range 203.0.113.x — outside normal AWS us-east-1 range.", detected_at=now - timedelta(hours=4)),
    ]
    for a in anomalies:
        if a.node_id:
            db.add(a)

    db.commit()
    return {"seeded": len(users), "edges": len(edges_data), "anomalies": len(anomalies)}


# ══════════════════════════════════════════════════════════════════════════════
# ITDR + TRUST EVENT DEMO DATA
# ══════════════════════════════════════════════════════════════════════════════

def _seed_itdr(db: Session) -> dict:
    """Seed ITDR alerts and trust events."""
    now = datetime.utcnow()

    existing = db.exec(
        select(ITDRAlert).where(ITDRAlert.identity_label == "COMPROMISED-daniel.evans@acmecorp.com")
    ).first()
    if existing:
        return {"skipped": True}

    alerts = [
        ITDRAlert(alert_type="impossible_travel",    severity="critical", identity_label="COMPROMISED-daniel.evans@acmecorp.com", description="Simultaneous login from Dublin IE and Shanghai CN — 9,200km in 125 minutes.", evidence=json.dumps({"ip1":"185.175.0.1","country1":"IE","ip2":"114.80.0.1","country2":"CN","gap_hours":2.08}), status="open",            detected_at=now - timedelta(hours=2)),
        ITDRAlert(alert_type="privilege_escalation", severity="high",     identity_label="COMPROMISED-daniel.evans@acmecorp.com", description="Unapproved role change from analyst to admin. No change request found.", evidence=json.dumps({"before":"analyst","after":"admin","approved":False}), status="investigating", detected_at=now - timedelta(hours=1.5)),
        ITDRAlert(alert_type="credential_stuffing",  severity="high",     identity_label="bob.smith@acmecorp.com",                description="5 failed logins in 8 minutes from single IP 185.220.101.47. Credential stuffing pattern detected.", evidence=json.dumps({"ip":"185.220.101.47","count":5,"window_min":8}), status="open", detected_at=now - timedelta(hours=3)),
        ITDRAlert(alert_type="token_theft",          severity="medium",   identity_label="carol.white@acmecorp.com",              description="JWT session token used from two different User-Agents within 5 minutes.", evidence=json.dumps({"ua1":"Chrome/124","ua2":"python-requests/2.31","gap_secs":280}), status="resolved", resolved_by="prasanna80564@gmail.com", detected_at=now - timedelta(days=1)),
        ITDRAlert(alert_type="shadow_ai",            severity="medium",   identity_label="svc-payment-processor",                 description="Service account made 12 requests to openai.com API — not in approved AI services list.", evidence=json.dumps({"domain":"openai.com","count":12,"approved":False}), status="open", detected_at=now - timedelta(hours=6)),
    ]
    for a in alerts:
        db.add(a)

    # ── Trust events ─────────────────────────────────────────────────────────
    trust_events = [
        TrustEvent(event_category="login",           actor="COMPROMISED-daniel.evans@acmecorp.com", actor_type="human",  description="Login from Dublin IE — normal location", trust_level="verified",   timestamp=now - timedelta(hours=3)),
        TrustEvent(event_category="login",           actor="COMPROMISED-daniel.evans@acmecorp.com", actor_type="human",  description="Login from Shanghai CN — impossible travel flagged", trust_level="suspicious",  timestamp=now - timedelta(hours=2)),
        TrustEvent(event_category="privilege_change",actor="COMPROMISED-daniel.evans@acmecorp.com", actor_type="human",  description="Privilege escalation: analyst → admin (unapproved)", trust_level="revoked",     timestamp=now - timedelta(hours=1.5)),
        TrustEvent(event_category="ai_output",       actor="aegis-ai-agent-v1",                     actor_type="ai",     description="AI generated ITDR analysis for bob.smith — confidence 87%", trust_level="verified",   timestamp=now - timedelta(hours=4)),
        TrustEvent(event_category="approval",        actor="prasanna80564@gmail.com",               actor_type="human",  description="Analyst approved AI action: auto_enrich for case SOC-DEMO-001", trust_level="verified",   timestamp=now - timedelta(hours=5)),
    ]
    for te in trust_events:
        db.add(te)

    db.commit()
    return {"alerts": len(alerts), "trust_events": len(trust_events)}


# ══════════════════════════════════════════════════════════════════════════════
# SHADOW AI DEMO DATA
# ══════════════════════════════════════════════════════════════════════════════

def _seed_shadow_ai(db: Session) -> dict:
    now = datetime.utcnow()

    existing = db.exec(
        select(ShadowAIEvent).where(ShadowAIEvent.destination_domain == "openai.com")
    ).first()
    if existing:
        return {"skipped": True}

    endpoint = db.exec(select(Endpoint).limit(1)).first()
    ep_id = endpoint.id if endpoint else None

    events = [
        ShadowAIEvent(agent_id=ep_id, process_name="node",         process_pid=8821, destination_domain="openai.com",       destination_ip="104.18.7.192",  detected_at=now - timedelta(hours=6),  is_reviewed=False),
        ShadowAIEvent(agent_id=ep_id, process_name="python3",      process_pid=9201, destination_domain="api.anthropic.com",destination_ip="160.79.104.11", detected_at=now - timedelta(hours=5),  is_reviewed=False),
        ShadowAIEvent(agent_id=ep_id, process_name="chrome",       process_pid=4421, destination_domain="claude.ai",        destination_ip="104.18.3.131",  detected_at=now - timedelta(hours=4),  is_reviewed=True,  reviewed_by="prasanna80564@gmail.com"),
        ShadowAIEvent(agent_id=ep_id, process_name="vscode",       process_pid=3312, destination_domain="api.openai.com",   destination_ip="104.18.7.192",  detected_at=now - timedelta(hours=3),  is_reviewed=False),
        ShadowAIEvent(agent_id=ep_id, process_name="curl",         process_pid=7711, destination_domain="generativelanguage.googleapis.com", destination_ip="142.250.185.202", detected_at=now - timedelta(hours=2), is_reviewed=False),
        ShadowAIEvent(agent_id=ep_id, process_name="node",         process_pid=5501, destination_domain="huggingface.co",   destination_ip="54.84.71.193",  detected_at=now - timedelta(hours=1),  is_reviewed=False),
    ]
    for e in events:
        db.add(e)

    db.commit()
    return {"seeded": len(events)}


# ══════════════════════════════════════════════════════════════════════════════
# DEFENSE CONSOLE DEMO DATA
# ══════════════════════════════════════════════════════════════════════════════

def _seed_defense(db: Session) -> dict:
    now = datetime.utcnow()

    existing = db.exec(
        select(DefenseEvent).where(DefenseEvent.attacker_ip == "185.220.101.47")
    ).first()
    if existing:
        return {"skipped": True}

    events = [
        DefenseEvent(attacker_ip="185.220.101.47", attack_type="ai_agent_scan",    threat_source="fingerprinter", endpoint_hit="/api/cases",                 request_count=72, user_agent="python-httpx/0.25.0", request_pattern=json.dumps({"unique_endpoints":16,"request_count":72,"indicators":["Uniform timing","httpx UA","API scan pattern"]}), ai_threat_type="AI Agent Scanner",       ai_confidence=0.94, ai_reasoning="72 requests in 60s with 16 unique endpoints probed. Timing intervals are mathematically uniform at 0.82s — inconsistent with human behaviour. httpx user-agent confirms automated client.",             ai_recommended_action="block",     ai_model_used="llama-3.1-8b-instant", status="pending_review", severity="high",     detected_at=now - timedelta(minutes=5)),
        DefenseEvent(attacker_ip="45.142.212.100", attack_type="honeypot_trigger", threat_source="honeypot",      endpoint_hit="/api/v1/config/secrets",     request_count=1,  user_agent="Go-http-client/1.1",  request_pattern=json.dumps({"unique_endpoints":1,"request_count":1,"indicators":["Honeypot hit","Go client","Targeted path"]}),            ai_threat_type="Honeypot Trigger",        ai_confidence=0.99, ai_reasoning="Direct hit on honeypot endpoint that does not exist in the public API. Only automated scanners probe this path. Zero false positive rate.",                                                                    ai_recommended_action="block",     ai_model_used="llama-3.1-8b-instant", status="pending_review", severity="critical",  detected_at=now - timedelta(minutes=12)),
        DefenseEvent(attacker_ip="91.108.4.55",    attack_type="brute_force",      threat_source="fingerprinter", endpoint_hit="/api/auth/login",            request_count=48, user_agent="Mozilla/5.0 (bot)",   request_pattern=json.dumps({"unique_endpoints":1,"request_count":48,"indicators":["48 login attempts","Credential rotation","Consistent 401s"]}), ai_threat_type="Credential Stuffing Bot", ai_confidence=0.87, ai_reasoning="48 POST requests to login endpoint in 60s. Body varies each time — credential rotation from leaked database. All returned 401. Classic credential stuffing pattern.",                                          ai_recommended_action="block",     ai_model_used="llama-3.1-8b-instant", status="auto_handled",   response_action="watchlist", reviewed_by="auto-engine", severity="high",     detected_at=now - timedelta(hours=1)),
        DefenseEvent(attacker_ip="103.21.244.0",   attack_type="prompt_injection", threat_source="prompt_shield", endpoint_hit="/api/cases/chat",           request_count=3,  user_agent="Mozilla/5.0",         request_pattern=json.dumps({"unique_endpoints":1,"request_count":3,"indicators":["system_override pattern","exfiltration attempt","Role hijack"]}), ai_threat_type="Prompt Injection",       ai_confidence=0.95, ai_reasoning="Detected 'ignore all previous instructions' pattern in chat message. Prompt Shield intercepted before reaching Groq. 3 attempts from same IP indicates deliberate probing.",                               ai_recommended_action="escalate",  ai_model_used="prompt_shield",          status="approved",       response_action="escalate",  reviewed_by="prasanna80564@gmail.com", severity="high", detected_at=now - timedelta(hours=2)),
        DefenseEvent(attacker_ip="198.54.117.200", attack_type="api_abuse",        threat_source="fingerprinter", endpoint_hit="/api/enrich/185.220.101.47", request_count=89, user_agent="curl/7.88.0",         request_pattern=json.dumps({"unique_endpoints":1,"request_count":89,"indicators":["Rate limit evasion","Curl UA","Enrichment abuse"]}),            ai_threat_type="API Abuser",              ai_confidence=0.78, ai_reasoning="89 requests to the enrichment endpoint in 60s — attempting to abuse the free IOC enrichment API as a proxy for VirusTotal/Shodan queries. Pacing slightly below rate limit.",                               ai_recommended_action="rate_limit",ai_model_used="llama-3.1-8b-instant", status="dismissed",      response_action="dismiss",   reviewed_by="prasanna80564@gmail.com", severity="medium",detected_at=now - timedelta(hours=3)),
    ]
    for e in events:
        db.add(e)

    db.commit()
    return {"seeded": len(events)}


# ══════════════════════════════════════════════════════════════════════════════
# AI AGENT SECURITY DEMO DATA
# ══════════════════════════════════════════════════════════════════════════════

def _seed_agent_security(db: Session) -> dict:
    now = datetime.utcnow()

    existing = db.exec(
        select(ProvenanceLedger).where(ProvenanceLedger.action_type == "ai_case_analysis")
    ).first()
    if existing:
        return {"skipped": True}

    records = [
        ProvenanceLedger(action_type="ai_case_analysis",   actor="llama-3.3-70b-versatile", model_used="llama-3.3-70b-versatile", input_context="BEC phishing case SOC-DEMO-001 — 4 IOCs, 3 MITRE techniques",        output_summary="AI generated executive summary + severity score 72/100. Recommended escalation to finance team.", confidence=88, approval_status="approved",  approved_by="prasanna80564@gmail.com", timestamp=now - timedelta(hours=5)),
        ProvenanceLedger(action_type="auto_enrich",        actor="llama-3.1-8b-instant",    model_used="llama-3.1-8b-instant",    input_context="IOC enrichment: 185.220.101.47 — Shodan/GreyNoise/VT",               output_summary="IP confirmed Tor exit node. 34/93 VT engines flagged. GreyNoise: mass scanner.",                  confidence=94, approval_status="approved",  approved_by="prasanna80564@gmail.com", timestamp=now - timedelta(hours=4)),
        ProvenanceLedger(action_type="report_generate",    actor="llama-3.3-70b-versatile", model_used="llama-3.3-70b-versatile", input_context="DORA Article 19 report for SOC-DEMO-001",                              output_summary="Full incident report generated — executive summary, technical narrative, DORA 5-pillar mapping.", confidence=91, approval_status="pending",               timestamp=now - timedelta(hours=2)),
        ProvenanceLedger(action_type="defense_triage",     actor="defense-engine",           model_used="llama-3.1-8b-instant",    input_context="185.220.101.47 — 72 requests, 16 unique endpoints in 60s",             output_summary="AI Agent Scanner | conf=0.94 | action=block",                                                     confidence=94, approval_status="pending",               timestamp=now - timedelta(minutes=5)),
        ProvenanceLedger(action_type="ai_case_analysis",   actor="llama-3.3-70b-versatile", model_used="llama-3.3-70b-versatile", input_context="Malware analysis case — suspicious process tree, Mimikatz YARA match",  output_summary="Severity 89/100. Confirmed Mimikatz credential dumping. Recommended immediate endpoint isolation.", confidence=89, approval_status="rejected",  approved_by="prasanna80564@gmail.com", timestamp=now - timedelta(hours=8)),
    ]
    for r in records:
        db.add(r)

    db.commit()
    return {"seeded": len(records)}


# ══════════════════════════════════════════════════════════════════════════════
# API ENDPOINTS
# ══════════════════════════════════════════════════════════════════════════════

@router.post("/seed")
def seed_all_demo_data(
    db: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    """Seed demo data for all major features. Safe to call multiple times (idempotent)."""
    results = {
        "identity":      _seed_identity(db),
        "itdr":          _seed_itdr(db),
        "shadow_ai":     _seed_shadow_ai(db),
        "defense":       _seed_defense(db),
        "agent_security": _seed_agent_security(db),
    }
    skipped = sum(1 for v in results.values() if isinstance(v, dict) and v.get("skipped"))
    db.add(AuditLog(
        action="demo_seeded", entity_type="demo", entity_id="all",
        user_id=user.id, user_email=user.email,
        new_value=f"Demo data seeded by {user.email}",
    ))
    db.commit()
    return {
        "status": "ok",
        "seeded": results,
        "message": f"Demo data ready. {skipped} section(s) already had data.",
    }


@router.post("/seed/defense")
def seed_defense_demo(
    db: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    """Seed Defense Console demo events only."""
    return _seed_defense(db)


@router.post("/seed/identity")
def seed_identity_demo(
    db: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    """Seed Identity Graph + ITDR + Trust demo data."""
    return {
        "identity": _seed_identity(db),
        "itdr":     _seed_itdr(db),
    }


@router.delete("/clear")
def clear_demo_data(
    db: Session = Depends(get_session),
    admin: User = Depends(require_admin),
):
    """Remove all demo-seeded data. Admin only."""
    deleted = 0
    for Model in [DefenseEvent, ITDRAlert, ShadowAIEvent, ProvenanceLedger]:
        items = db.exec(select(Model)).all()
        for item in items:
            db.delete(item)
            deleted += 1

    # Remove demo identity nodes (those with demo:true in metadata)
    nodes = db.exec(select(IdentityNode)).all()
    for n in nodes:
        try:
            meta = json.loads(n.metadata_json or "{}")
            if meta.get("demo"):
                db.delete(n)
                deleted += 1
        except Exception:
            pass

    db.commit()
    return {"ok": True, "deleted": deleted}
