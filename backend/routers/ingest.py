"""
AegisTrace Ingest API
─────────────────────
Receives log batches from remote endpoint agents.
Auth: X-AegisTrace-Key header (set INGEST_API_KEY env var).
If not set, defaults to sha256 of ADMIN_PIN so no extra config needed.
"""
import os, json, hashlib, hmac
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Header, Request
from sqlmodel import Session, select, func
from typing import Optional
from models import Endpoint, LogBatch, Case, TimelineEvent, AuditLog, IOCCorrelation
from database import get_session
from routers.auth import get_current_user
from models import User
from ai_router import call_ai_json

router = APIRouter(prefix="/api/ingest", tags=["ingest"])

# ── API Key ───────────────────────────────────────────────────────────────────
def _get_ingest_key() -> str:
    key = os.getenv("INGEST_API_KEY")
    if key:
        return key
    # Derive from ADMIN_PIN if not explicitly set
    pin = os.getenv("ADMIN_PIN", "aegis2025")
    return hashlib.sha256(f"ingest-{pin}".encode()).hexdigest()


def _verify_key(x_aegistrace_key: Optional[str] = Header(None)):
    if not x_aegistrace_key:
        raise HTTPException(401, "X-AegisTrace-Key header required")
    expected = _get_ingest_key()
    if not hmac.compare_digest(x_aegistrace_key, expected):
        raise HTTPException(401, "Invalid ingest key")


# ── IOC helpers ───────────────────────────────────────────────────────────────
import re as _re

_IOC_PATS = {
    "ip":     _re.compile(r"\b(?:\d{1,3}\.){3}\d{1,3}\b"),
    "domain": _re.compile(r"\b(?:[a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+(?:com|net|org|io|ru|tk|xyz|info|biz|co|uk|de|fr|cn|top|online|site|club|live|app|dev)\b"),
    "sha256": _re.compile(r"\b[a-fA-F0-9]{64}\b"),
    "md5":    _re.compile(r"\b[a-fA-F0-9]{32}\b"),
    "url":    _re.compile(r"https?://[^\s\"\'<>]+"),
}

def _extract_iocs(text: str) -> list:
    found, seen = [], set()
    for ioc_type, pat in _IOC_PATS.items():
        for m in pat.finditer(text):
            v = m.group()
            if v not in seen:
                seen.add(v)
                found.append({"ioc": v, "type": ioc_type})
    return found[:50]  # cap at 50


def _correlate(session: Session, iocs: list, batch_id: int, case_id: int = None):
    for item in iocs:
        val = item.get("ioc", "")
        if not val:
            continue
        existing = session.exec(
            select(IOCCorrelation).where(IOCCorrelation.ioc == val)
        ).first()
        if existing:
            ids = json.loads(existing.case_ids or "[]")
            ref = case_id or f"batch:{batch_id}"
            if ref not in ids:
                ids.append(ref)
                existing.case_ids = json.dumps(ids)
                existing.case_count = len(ids)
                existing.last_seen = datetime.utcnow()
                session.add(existing)
        else:
            session.add(IOCCorrelation(
                ioc=val, ioc_type=item.get("type",""),
                case_ids=json.dumps([case_id or f"batch:{batch_id}"]),
                case_count=1
            ))


# ── Main ingest endpoint ──────────────────────────────────────────────────────
@router.post("/logs")
async def ingest_logs(
    data: dict,
    session: Session = Depends(get_session),
    _key: None = Depends(_verify_key),
):
    """
    Receive a log batch from an endpoint agent.

    Required fields: hostname, content
    Optional: os_type, ip_address, log_file, log_type, auto_analyse, auto_case, tags
    """
    hostname  = (data.get("hostname") or "unknown").strip()
    content   = (data.get("content") or "").strip()
    log_file  = data.get("log_file", "")
    log_type  = data.get("log_type", "generic")
    os_type   = data.get("os_type", "unknown")
    ip_addr   = data.get("ip_address", "")
    tags      = data.get("tags", [])
    auto_analyse = data.get("auto_analyse", True)
    auto_case    = data.get("auto_case", False)
    threshold    = int(data.get("threat_threshold", 60))

    if not content:
        raise HTTPException(400, "content is required")
    if len(content) > 500_000:
        content = content[:500_000]  # cap at 500KB

    lines = [l for l in content.splitlines() if l.strip()]
    line_count = len(lines)

    # ── Upsert endpoint ───────────────────────────────────────────────────────
    endpoint = session.exec(
        select(Endpoint).where(Endpoint.hostname == hostname)
    ).first()

    if endpoint:
        endpoint.last_seen   = datetime.utcnow()
        endpoint.ip_address  = ip_addr or endpoint.ip_address
        endpoint.os_type     = os_type if os_type != "unknown" else endpoint.os_type
        endpoint.total_batches += 1
        endpoint.is_active   = True
        if tags:
            endpoint.tags = json.dumps(tags)
        session.add(endpoint)
        session.commit()
        session.refresh(endpoint)
    else:
        endpoint = Endpoint(
            hostname=hostname, os_type=os_type,
            ip_address=ip_addr, total_batches=1,
            tags=json.dumps(tags),
        )
        session.add(endpoint)
        session.commit()
        session.refresh(endpoint)

    # ── Create log batch ──────────────────────────────────────────────────────
    iocs = _extract_iocs(content)
    batch = LogBatch(
        endpoint_id=endpoint.id,
        log_file=log_file,
        log_type=log_type,
        raw_content=content,
        line_count=line_count,
        extracted_iocs=json.dumps(iocs),
    )
    session.add(batch)
    session.commit()
    session.refresh(batch)

    # ── AI Analysis ───────────────────────────────────────────────────────────
    threat_score = 0
    ai_verdict   = "Unknown"
    ai_summary   = ""
    ai_findings  = ""
    mitre        = []

    if auto_analyse and content:
        sample = "\n".join(lines[:200])  # first 200 lines for AI
        prompt = f"""You are a SOC analyst. Analyse these logs from endpoint '{hostname}'.

Log source: {log_file or log_type}
OS: {os_type}
Total lines: {line_count}
Sample:
{sample}

Respond ONLY with valid JSON:
{{
  "verdict": "Clean|Suspicious|Malicious|Unknown",
  "threat_score": <0-100>,
  "summary": "1-2 sentence plain-English summary",
  "key_findings": ["finding 1", "finding 2", "finding 3"],
  "suspicious_indicators": ["indicator 1", "indicator 2"],
  "iocs": [{{"ioc": "value", "type": "ip|domain|hash|url"}}],
  "mitre_techniques": [{{"id": "T####", "name": "...", "tactic": "..."}}],
  "recommended_action": "What the analyst should do next"
}}"""
        result = call_ai_json("extraction", prompt, temperature=0.2, max_tokens=1000)
        if not result.get("parse_error"):
            threat_score = min(100, max(0, int(result.get("threat_score", 0))))
            ai_verdict   = result.get("verdict", "Unknown")
            ai_summary   = result.get("summary", "")
            ai_findings  = json.dumps({
                "key_findings":          result.get("key_findings", []),
                "suspicious_indicators": result.get("suspicious_indicators", []),
                "recommended_action":    result.get("recommended_action", ""),
            })
            mitre = result.get("mitre_techniques", [])
            # Merge AI IOCs with regex IOCs
            ai_iocs = result.get("iocs", [])
            seen = {i["ioc"] for i in iocs}
            for ai_ioc in ai_iocs:
                if ai_ioc.get("ioc") and ai_ioc["ioc"] not in seen:
                    iocs.append(ai_ioc)
                    seen.add(ai_ioc["ioc"])

    # Update batch with AI results
    batch.threat_score      = threat_score
    batch.ai_verdict        = ai_verdict
    batch.ai_summary        = ai_summary
    batch.ai_findings       = ai_findings
    batch.extracted_iocs    = json.dumps(iocs)
    batch.mitre_techniques  = json.dumps(mitre)
    session.add(batch)

    # Update endpoint threat score average
    all_scores = session.exec(
        select(LogBatch.threat_score).where(LogBatch.endpoint_id == endpoint.id)
    ).all()
    if all_scores:
        endpoint.threat_score_avg = sum(all_scores) / len(all_scores)
        session.add(endpoint)

    session.commit()

    # ── Correlate IOCs ────────────────────────────────────────────────────────
    if iocs:
        _correlate(session, iocs, batch.id)
        session.commit()

    # ── Auto-create case if threat threshold exceeded ─────────────────────────
    case_id = None
    if auto_case and threat_score >= threshold:
        from routers.cases import next_case_number
        case_title = f"Auto-detected threat on {hostname} — {ai_verdict}"
        ioc_count  = len(iocs)

        case = Case(
            case_number=next_case_number(session),
            title=case_title,
            severity="high" if threat_score >= 80 else "medium",
            status="open",
            incident_type="endpoint_alert",
            analyst_name="AegisTrace Agent",
            affected_systems=hostname,
            description=f"Automatically created from log batch on {hostname}.\n\n{ai_summary}",
            iocs=json.dumps(iocs),
            mitre_techniques=json.dumps(mitre),
            ai_executive_summary=ai_summary,
            ai_severity_score=threat_score,
            ai_severity_reasoning=f"AI threat score {threat_score}/100 exceeded auto-case threshold of {threshold}.",
        )
        session.add(case)
        session.commit()
        session.refresh(case)
        case_id = case.id

        # Link batch to case
        batch.case_id = case_id
        session.add(batch)

        # Add timeline event
        session.add(TimelineEvent(
            case_id=case_id,
            event_type="detection",
            description=f"Auto-detected by AegisTrace Agent on {hostname}. Threat score: {threat_score}/100. {len(iocs)} IOCs found.",
        ))

        session.commit()

        # Fire webhook
        try:
            from routers.webhooks import fire_event
            fire_event("critical_case", {
                "case_number": case.case_number,
                "title": case_title,
                "severity": case.severity,
                "hostname": hostname,
                "threat_score": threat_score,
            })
        except Exception:
            pass

    # Audit log
    session.add(AuditLog(
        action="log_ingested", entity_type="endpoint",
        entity_id=hostname,
        new_value=f"threat_score={threat_score}, lines={line_count}, iocs={len(iocs)}",
    ))
    session.commit()

    return {
        "ok": True,
        "batch_id": batch.id,
        "endpoint_id": endpoint.id,
        "lines_received": line_count,
        "iocs_found": len(iocs),
        "threat_score": threat_score,
        "verdict": ai_verdict,
        "message": f"Ingested {line_count} lines. Threat score: {threat_score}/100.",
        "case_created": case_id,
    }


# ── Endpoint management (admin only) ─────────────────────────────────────────
@router.get("/endpoints")
def list_endpoints(
    _user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    endpoints = session.exec(
        select(Endpoint).order_by(Endpoint.last_seen.desc())
    ).all()
    result = []
    for ep in endpoints:
        recent_batch = session.exec(
            select(LogBatch)
            .where(LogBatch.endpoint_id == ep.id)
            .order_by(LogBatch.created_at.desc())
        ).first()
        result.append({
            "id": ep.id,
            "hostname": ep.hostname,
            "os_type": ep.os_type,
            "ip_address": ep.ip_address,
            "agent_version": ep.agent_version,
            "last_seen": ep.last_seen,
            "total_batches": ep.total_batches,
            "threat_score_avg": round(ep.threat_score_avg, 1),
            "is_active": ep.is_active,
            "tags": json.loads(ep.tags or "[]"),
            "created_at": ep.created_at,
            "last_verdict": recent_batch.ai_verdict if recent_batch else None,
            "last_threat_score": recent_batch.threat_score if recent_batch else 0,
        })
    return result


@router.get("/endpoints/{ep_id}/batches")
def list_batches(
    ep_id: int,
    limit: int = 20,
    _user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    batches = session.exec(
        select(LogBatch)
        .where(LogBatch.endpoint_id == ep_id)
        .order_by(LogBatch.created_at.desc())
        .limit(limit)
    ).all()
    return [{
        "id": b.id,
        "log_file": b.log_file,
        "log_type": b.log_type,
        "line_count": b.line_count,
        "threat_score": b.threat_score,
        "ai_verdict": b.ai_verdict,
        "ai_summary": b.ai_summary,
        "ioc_count": len(json.loads(b.extracted_iocs or "[]")),
        "case_id": b.case_id,
        "created_at": b.created_at,
    } for b in batches]


@router.get("/endpoints/{ep_id}/batches/{batch_id}")
def get_batch(
    ep_id: int, batch_id: int,
    _user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    batch = session.get(LogBatch, batch_id)
    if not batch or batch.endpoint_id != ep_id:
        raise HTTPException(404)
    findings = {}
    try:
        findings = json.loads(batch.ai_findings or "{}")
    except Exception:
        pass
    return {
        "id": batch.id,
        "endpoint_id": batch.endpoint_id,
        "log_file": batch.log_file,
        "log_type": batch.log_type,
        "line_count": batch.line_count,
        "threat_score": batch.threat_score,
        "ai_verdict": batch.ai_verdict,
        "ai_summary": batch.ai_summary,
        "key_findings": findings.get("key_findings", []),
        "suspicious_indicators": findings.get("suspicious_indicators", []),
        "recommended_action": findings.get("recommended_action", ""),
        "extracted_iocs": json.loads(batch.extracted_iocs or "[]"),
        "mitre_techniques": json.loads(batch.mitre_techniques or "[]"),
        "case_id": batch.case_id,
        "created_at": batch.created_at,
        "raw_content": batch.raw_content,
    }


@router.get("/key")
def get_ingest_key(_user: User = Depends(get_current_user)):
    """Returns the ingest API key for configuring agents."""
    return {"ingest_key": _get_ingest_key(), "note": "Use as X-AegisTrace-Key header in agent config"}


# ── Heartbeat — v2.0 agent keepalive ─────────────────────────────────────────
@router.post("/heartbeat")
async def agent_heartbeat(
    data: dict,
    session: Session = Depends(get_session),
    _key: None = Depends(_verify_key),
):
    """
    Lightweight ping from endpoint agent. Updates last_seen even when
    no new logs exist. Agent v2.0 calls this every 60 seconds.
    Also accepts system metrics (cpu/mem/disk) for display in Endpoints page.
    """
    hostname = (data.get("hostname") or "unknown").strip()
    ip_addr  = data.get("ip_address", "")
    os_type  = data.get("os_type", "unknown")
    version  = data.get("agent_version", "")
    tags     = data.get("tags", [])
    # metrics stored in tags field as JSON for now (no schema change needed)

    endpoint = session.exec(
        select(Endpoint).where(Endpoint.hostname == hostname)
    ).first()

    if endpoint:
        endpoint.last_seen  = datetime.utcnow()
        endpoint.is_active  = True
        if ip_addr:              endpoint.ip_address   = ip_addr
        if os_type != "unknown": endpoint.os_type      = os_type
        if version:              endpoint.agent_version = version
        if tags:                 endpoint.tags         = json.dumps(tags)
        session.add(endpoint)
        session.commit()
        return {"ok": True, "known": True, "hostname": hostname,
                "endpoint_id": endpoint.id}
    else:
        # First-ever heartbeat — register the endpoint automatically
        endpoint = Endpoint(
            hostname=hostname, os_type=os_type, ip_address=ip_addr,
            total_batches=0, agent_version=version or "2.0",
            tags=json.dumps(tags), is_active=True,
        )
        session.add(endpoint)
        session.commit()
        session.refresh(endpoint)
        return {"ok": True, "known": False, "hostname": hostname,
                "endpoint_id": endpoint.id}


# ── Manual log analysis (paste in UI) ────────────────────────────────────────
@router.post("/analyse")
async def analyse_log(
    data: dict,
    _user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Analyse a manually pasted log in the UI (no agent needed)."""
    from models import LogAnalysis
    content    = (data.get("content") or "").strip()
    log_type   = data.get("log_type", "auto")
    source_label = data.get("source_label", "Manual paste")
    case_id    = data.get("case_id")

    if not content:
        raise HTTPException(400, "content required")

    lines = [l for l in content.splitlines() if l.strip()]

    # Auto-detect format if requested
    if log_type == "auto":
        detect_prompt = f"""Detect this log format from the first 10 lines:

{chr(10).join(lines[:10])}

Reply with ONLY ONE word: syslog | windows_event | apache_access | nginx_access | firewall | cloudtrail | auth_log | generic"""
        from ai_router import call_ai
        detected = call_ai("fast", detect_prompt, max_tokens=10).strip().lower()
        log_type = detected if detected in ["syslog","windows_event","apache_access","nginx_access","firewall","cloudtrail","auth_log"] else "generic"

    iocs = _extract_iocs(content)
    sample = "\n".join(lines[:300])

    prompt = f"""SOC analyst — analyse these {log_type} log entries for security threats.

{sample}

Respond ONLY with valid JSON:
{{
  "verdict": "Clean|Suspicious|Malicious|Unknown",
  "threat_score": <0-100>,
  "summary": "2-3 sentence analysis",
  "key_findings": ["finding 1","finding 2","finding 3","finding 4","finding 5"],
  "suspicious_entries": [
    {{"line": "raw log line", "reason": "why suspicious", "severity": "high|medium|low"}}
  ],
  "attack_type": "brute_force|privilege_escalation|lateral_movement|exfiltration|web_attack|malware|unknown",
  "iocs": [{{"ioc":"value","type":"ip|domain|hash|url"}}],
  "mitre_techniques": [{{"id":"T####","name":"...","tactic":"..."}}],
  "timeline_summary": "Chronological summary of suspicious events",
  "recommended_actions": ["action 1","action 2"]
}}"""

    result = call_ai_json("analysis", prompt, temperature=0.2, max_tokens=1500)

    threat_score = int(result.get("threat_score", 0)) if not result.get("parse_error") else 0
    ai_verdict   = result.get("verdict", "Unknown")
    ai_iocs      = result.get("iocs", [])
    merged_iocs  = iocs + [i for i in ai_iocs if i.get("ioc") and i["ioc"] not in {x["ioc"] for x in iocs}]

    analysis = LogAnalysis(
        case_id=case_id,
        log_type=log_type,
        raw_content=content,
        extracted_iocs=json.dumps(merged_iocs),
        ai_verdict=ai_verdict,
        ai_summary=result.get("summary",""),
        ai_findings=json.dumps(result),
        mitre_techniques=json.dumps(result.get("mitre_techniques",[])),
        threat_score=threat_score,
        total_entries=len(lines),
        suspicious_entries=len(result.get("suspicious_entries",[])),
        source_label=source_label,
    )
    session.add(analysis)
    session.commit()
    session.refresh(analysis)

    return {
        "id": analysis.id,
        "log_type": log_type,
        "verdict": ai_verdict,
        "threat_score": threat_score,
        "summary": result.get("summary",""),
        "key_findings": result.get("key_findings",[]),
        "suspicious_entries": result.get("suspicious_entries",[])[:20],
        "attack_type": result.get("attack_type","unknown"),
        "iocs": merged_iocs,
        "mitre_techniques": result.get("mitre_techniques",[]),
        "timeline_summary": result.get("timeline_summary",""),
        "recommended_actions": result.get("recommended_actions",[]),
        "total_entries": len(lines),
        "created_at": analysis.created_at,
    }


@router.get("/analyses")
def list_analyses(
    _user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    from models import LogAnalysis
    analyses = session.exec(
        select(LogAnalysis).order_by(LogAnalysis.created_at.desc()).limit(50)
    ).all()
    return [{
        "id": a.id, "log_type": a.log_type, "source_label": a.source_label,
        "ai_verdict": a.ai_verdict, "threat_score": a.threat_score,
        "ai_summary": a.ai_summary, "total_entries": a.total_entries,
        "suspicious_entries": a.suspicious_entries, "case_id": a.case_id,
        "created_at": a.created_at,
    } for a in analyses]
