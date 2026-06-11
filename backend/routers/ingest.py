"""
AegisTrace Ingest API
─────────────────────
Receives log batches from remote endpoint agents.
Auth: X-AegisTrace-Key header (set INGEST_API_KEY env var).
If not set, defaults to sha256 of ADMIN_PIN so no extra config needed.
"""
import os, json, hashlib, hmac, asyncio, time as _time_mod
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Header, Request
from fastapi.responses import StreamingResponse
from sqlmodel import Session, select, func
from typing import Optional
from models import Endpoint, LogBatch, Case, TimelineEvent, AuditLog, IOCCorrelation, ShadowAIEvent, AgentCommand, ITDRAlert, RawLogEvent, AgentAction
from database import get_session
from routers.auth import get_current_user
from models import User
from ai_router import call_ai_json
from core.events import event_bus, Events

# ── In-memory command queue (per agent_id) ────────────────────────────────────
_SUSPICIOUS_PROCESSES = {
    # credential dumping
    "mimikatz", "lazagne", "pwdump", "fgdump", "wce",
    # post-exploitation / C2
    "meterpreter", "powersploit", "empire", "cobalt", "covenant",
    "metasploit", "havoc", "sliver", "brute-ratel",
    # recon / lateral movement
    "procdump", "sharphound", "bloodhound", "rubeus",
    "kerbrute", "crackmapexec", "impacket",
    # network tunnelling / reverse shells
    "netcat", "ncat", "nmap", "masscan",
    "chisel", "ligolo", "plink",
    # ransomware / destructive
    "wannacry", "notpetya", "lockbit", "blackcat",
}
_SUSPICIOUS_PORTS = {
    # Common C2
    4444, 1337, 31337, 8888, 9999,
    # Metasploit / Cobalt Strike defaults
    443, 80,   # only flagged when paired with a suspicious process
    4445, 4450, 5555, 6666, 7777,
    # RATs & backdoors
    1080, 1234, 5900, 6200, 8443, 9001, 12345, 54321,
    # Known malware
    2222, 3333, 6667, 6697, 6660,
}

router = APIRouter(prefix="/api/ingest", tags=["ingest"])

# ── API Key ───────────────────────────────────────────────────────────────────
def _get_ingest_key() -> str:
    """
    Return the ingest API key. Must be set explicitly via INGEST_API_KEY env var.
    main.py startup auto-generates one if absent and logs it to console.
    Removed the ADMIN_PIN sha256 derivation — a predictable key is no key at all.
    """
    key = os.getenv("INGEST_API_KEY")
    if not key:
        raise HTTPException(
            503,
            "Ingest service not configured — INGEST_API_KEY env var is not set. "
            "Check startup logs for the auto-generated key or set it explicitly.",
        )
    return key


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
            "is_active": (datetime.utcnow() - ep.last_seen).total_seconds() < 120,
            "tags": json.loads(ep.tags or "[]"),
            "created_at": ep.created_at,
            "last_verdict": recent_batch.ai_verdict if recent_batch else None,
            "last_threat_score": recent_batch.threat_score if recent_batch else 0,
        })
    return result


@router.get("/endpoints/{ep_id}/detail")
def endpoint_detail(
    ep_id: int,
    _user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Rich endpoint detail — processes, connections, system info, recent alerts, stats."""
    ep = session.get(Endpoint, ep_id)
    if not ep:
        raise HTTPException(404, "Endpoint not found")

    # Recent ITDR alerts for this host
    recent_alerts = session.exec(
        select(ITDRAlert)
        .where(ITDRAlert.identity_label == ep.hostname)
        .order_by(ITDRAlert.detected_at.desc())
        .limit(20)
    ).all()

    # Alert counts by severity
    open_critical = sum(1 for a in recent_alerts if a.severity == "critical" and a.status == "open")
    open_high     = sum(1 for a in recent_alerts if a.severity == "high"     and a.status == "open")

    # Recent failed logins count
    cutoff_day = datetime.utcnow() - timedelta(hours=24)
    failed_logins_24h = session.exec(
        select(RawLogEvent)
        .where(RawLogEvent.endpoint_id == ep.id)
        .where(RawLogEvent.event_type == "failed_login")
        .where(RawLogEvent.ts >= cutoff_day)
    ).all()

    # Recent sudo commands
    sudo_cmds = session.exec(
        select(RawLogEvent)
        .where(RawLogEvent.endpoint_id == ep.id)
        .where(RawLogEvent.event_type == "sudo_command")
        .order_by(RawLogEvent.ts.desc())
        .limit(10)
    ).all()

    sys_info    = json.loads(ep.last_system_info  or "{}")
    processes   = json.loads(ep.last_processes    or "[]")
    connections = json.loads(ep.last_connections  or "[]")

    # Mark suspicious processes/ports
    for p in processes:
        pname = (p.get("name") or "").lower()
        p["suspicious"] = any(s in pname for s in _SUSPICIOUS_PROCESSES)
    for c in connections:
        rport = c.get("remote_port", 0)
        try: c["suspicious"] = int(rport) in _SUSPICIOUS_PORTS
        except (ValueError, TypeError): c["suspicious"] = False

    return {
        "id":              ep.id,
        "hostname":        ep.hostname,
        "os_type":         ep.os_type,
        "ip_address":      ep.ip_address,
        "agent_version":   ep.agent_version,
        "last_seen":       ep.last_seen,
        "is_active":       (datetime.utcnow() - ep.last_seen).total_seconds() < 120,
        "local_risk_score": ep.local_risk_score,
        "system_info":     sys_info,
        "processes":       processes,
        "connections":     connections,
        "open_critical":   open_critical,
        "open_high":       open_high,
        "failed_logins_24h": len(failed_logins_24h),
        "sudo_commands_24h": len(sudo_cmds),
        "recent_alerts":   [
            {
                "id":          a.id,
                "alert_type":  a.alert_type,
                "severity":    a.severity,
                "description": a.description,
                "status":      a.status,
                "detected_at": a.detected_at,
                "evidence":    a.evidence,
            } for a in recent_alerts
        ],
        "recent_sudo": [
            {
                "ts":       s.ts,
                "username": s.username,
                "raw":      s.raw,
            } for s in sudo_cmds
        ],
    }


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


# ═══════════════════════════════════════════════════════════════════════════════
# v4.3 — New telemetry endpoint for rebuilt agent (psutil-based)
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/{agent_id}")
async def ingest_telemetry(
    agent_id: str,
    data: dict,
    session: Session = Depends(get_session),
    x_agent_token: Optional[str] = Header(None),
    x_agent_version: Optional[str] = Header(None),
):
    """
    Receive structured telemetry from the rebuilt psutil-based agent.
    Payload: {system_info, processes, network_connections, login_events, file_events, alerts}
    """
    # Validate agent token
    expected_key = _get_ingest_key()
    if not x_agent_token or not hmac.compare_digest(x_agent_token, expected_key):
        raise HTTPException(401, "Invalid agent token")

    hostname = data.get("system_info", {}).get("hostname", agent_id)
    ip_addr  = data.get("system_info", {}).get("ip_address", "")
    os_type  = data.get("system_info", {}).get("os_type", "unknown")
    version  = x_agent_version or "3.0"
    alerts   = data.get("alerts", [])

    # ── Upsert endpoint ───────────────────────────────────────────────────────
    endpoint = session.exec(
        select(Endpoint).where(Endpoint.hostname == hostname)
    ).first()
    processes     = data.get("processes", [])
    connections   = data.get("network_connections", [])
    risk_score    = data.get("local_anomaly_score", 0)
    vuln_findings = data.get("vuln_findings", [])

    if endpoint:
        endpoint.last_seen        = datetime.utcnow()
        endpoint.is_active        = True
        endpoint.agent_version    = version
        if ip_addr: endpoint.ip_address  = ip_addr
        if os_type != "unknown": endpoint.os_type = os_type
        endpoint.total_batches   += 1
        endpoint.last_processes   = json.dumps(processes[:100])
        endpoint.last_connections = json.dumps(connections[:50])
        endpoint.last_system_info = json.dumps(data.get("system_info", {}))
        endpoint.local_risk_score = int(risk_score) if risk_score else 0
        if vuln_findings:
            endpoint.vuln_findings  = json.dumps(vuln_findings)
            endpoint.last_vuln_scan = datetime.utcnow()
    else:
        endpoint = Endpoint(
            hostname=hostname, os_type=os_type, ip_address=ip_addr,
            agent_version=version, total_batches=1, is_active=True,
            last_processes=json.dumps(processes[:100]),
            last_connections=json.dumps(connections[:50]),
            last_system_info=json.dumps(data.get("system_info", {})),
            local_risk_score=int(risk_score) if risk_score else 0,
        )
        session.add(endpoint)
        session.flush()
        event_bus.emit(Events.ENDPOINT_CONNECTED, {
            "agent_id": agent_id, "hostname": hostname, "ip": ip_addr
        })
    session.add(endpoint)
    session.commit()
    session.refresh(endpoint)

    # ── Process shadow AI alerts ──────────────────────────────────────────────
    shadow_ai_count = 0
    itdr_alerts = []
    for alert in alerts:
        alert_type = alert.get("type", "")

        if alert_type == "shadow_ai":
            shadow_event = ShadowAIEvent(
                agent_id=endpoint.id,
                process_name=alert.get("process_name", ""),
                process_pid=alert.get("process_pid", 0),
                destination_domain=alert.get("destination_domain", ""),
                destination_ip=alert.get("destination_ip"),
                detected_at=datetime.utcnow(),
            )
            session.add(shadow_event)
            shadow_ai_count += 1
            event_bus.emit(Events.SHADOW_AI_DETECTED, {
                "process_name": alert.get("process_name"),
                "destination": alert.get("destination_domain"),
                "agent_id": endpoint.id,
            })

        elif alert_type in (
            "suspicious_process", "suspicious_port", "honey_token_access",
            "yara_match", "dga_domain", "suspicious_lineage", "usb_inserted",
            "registry_change", "fim_change", "privilege_escalation",
            "new_destination", "behavioural_anomaly",
        ):
            # Dedup window per alert_type per host (longer for noisy types)
            dedup_minutes = {
                "honey_token_access": 10,
                "suspicious_process": 10,
                "suspicious_port":    10,
                "yara_match":         30,
                "fim_change":         30,
                "new_destination":    60,
                "behavioural_anomaly": 60,
            }.get(alert_type, 5)

            cutoff = datetime.utcnow() - timedelta(minutes=dedup_minutes)
            already = session.exec(
                select(ITDRAlert)
                .where(ITDRAlert.alert_type == alert_type)
                .where(ITDRAlert.identity_label == hostname)
                .where(ITDRAlert.detected_at >= cutoff)
            ).first()
            if already:
                continue   # skip duplicate within window

            sev_map = {
                "honey_token_access": "critical",
                "yara_match":         "critical",
                "suspicious_process": "high",
                "suspicious_lineage": "high",
                "fim_change":         "high",
                "dga_domain":         "high",
                "registry_change":    "high",
                "suspicious_port":    "medium",
                "usb_inserted":       "medium",
                "new_destination":    "medium",
                "behavioural_anomaly":"medium",
                "privilege_escalation":"critical",
            }
            itdr_alerts.append(ITDRAlert(
                alert_type=alert_type,
                severity=sev_map.get(alert_type, "medium"),
                identity_label=hostname,
                description=alert.get("description", f"{alert_type.replace('_',' ').title()} on {hostname}"),
                evidence=json.dumps(alert),
            ))

    # ── Check processes against suspicious list ───────────────────────────────
    processes = data.get("processes", [])
    for proc in processes:
        pname = (proc.get("name") or "").lower()
        if any(s in pname for s in _SUSPICIOUS_PROCESSES):
            cutoff_p = datetime.utcnow() - timedelta(minutes=10)
            already_p = session.exec(
                select(ITDRAlert)
                .where(ITDRAlert.alert_type == "suspicious_process")
                .where(ITDRAlert.identity_label == hostname)
                .where(ITDRAlert.detected_at >= cutoff_p)
            ).first()
            if not already_p:
                itdr_alerts.append(ITDRAlert(
                    alert_type="suspicious_process",
                    severity="high",
                    identity_label=hostname,
                    description=f"Known malicious process '{proc.get('name')}' (PID {proc.get('pid')}) detected on {hostname}",
                    evidence=json.dumps(proc),
                ))

    # ── Check network connections for suspicious ports ────────────────────────
    connections = data.get("network_connections", [])
    for conn in connections:
        rport = conn.get("remote_port", 0)
        if rport and int(rport) in _SUSPICIOUS_PORTS:
            cutoff_c = datetime.utcnow() - timedelta(minutes=10)
            already_c = session.exec(
                select(ITDRAlert)
                .where(ITDRAlert.alert_type == "suspicious_port")
                .where(ITDRAlert.identity_label == hostname)
                .where(ITDRAlert.detected_at >= cutoff_c)
            ).first()
            if not already_c:
                itdr_alerts.append(ITDRAlert(
                    alert_type="suspicious_port",
                    severity="high",
                    identity_label=hostname,
                    description=f"Connection to suspicious port {rport} from {hostname} (process: {conn.get('process_name', 'unknown')})",
                    evidence=json.dumps(conn),
                ))

    # ── Save ITDR alerts ──────────────────────────────────────────────────────
    for alert_obj in itdr_alerts:
        session.add(alert_obj)
        event_bus.emit(Events.ITDR_ALERT_FIRED, {
            "alert_type": alert_obj.alert_type,
            "severity": alert_obj.severity,
            "identity_id": None,
            "details": {"hostname": hostname},
        })

    # ── Store raw log events (comprehensive system logs from agent) ────────────
    raw_logs = data.get("raw_logs", [])
    for rl in raw_logs[:300]:
        try:
            extra = {k: v for k, v in rl.items()
                     if k not in ("raw","category","event_type","source","severity",
                                  "username","source_ip","success","timestamp","ts")}
            session.add(RawLogEvent(
                endpoint_id = endpoint.id,
                hostname    = hostname,
                category    = rl.get("category", "system"),
                event_type  = rl.get("event_type", "log"),
                source      = rl.get("source", ""),
                severity    = rl.get("severity", "info"),
                raw         = rl.get("raw", "")[:800],
                username    = rl.get("username"),
                source_ip   = rl.get("source_ip"),
                success     = bool(rl.get("success", True)),
                extra       = json.dumps(extra),
                ts          = datetime.utcnow(),
            ))
        except Exception:
            pass

    # ── Forward login events to ITDR — alert on EVERY failed login ─────────
    login_events = data.get("login_events", [])
    for ev in login_events:
        # Store ALL login events as RawLogEvent
        try:
            session.add(RawLogEvent(
                endpoint_id = endpoint.id,
                hostname    = hostname,
                category    = ev.get("category", "auth"),
                event_type  = ev.get("event_type", "login"),
                source      = ev.get("source", "sshd"),
                severity    = ev.get("severity", "info"),
                raw         = ev.get("raw", "")[:800],
                username    = ev.get("username"),
                source_ip   = ev.get("source_ip"),
                success     = bool(ev.get("success", True)),
                extra       = json.dumps({k: v for k, v in ev.items()
                                          if k not in ("raw","category","event_type",
                                                        "source","severity","username",
                                                        "source_ip","success")}),
                ts          = datetime.utcnow(),
            ))
        except Exception:
            pass

        # Deduplicate failed logins — check if same user+ip+host already alerted in last 5 min
        if not ev.get("success"):
            src_ip   = ev.get("source_ip") or "local"
            username = ev.get("username") or "unknown"
            cutoff   = datetime.utcnow() - timedelta(minutes=5)
            existing = session.exec(
                select(ITDRAlert)
                .where(ITDRAlert.alert_type == "failed_login")
                .where(ITDRAlert.identity_label == hostname)
                .where(ITDRAlert.detected_at >= cutoff)
            ).first()
            if not existing:
                itdr_alerts.append(ITDRAlert(
                    alert_type     = "failed_login",
                    severity       = "medium",
                    identity_label = hostname,
                    description    = f"Failed login attempt on {hostname}: user='{username}' from {src_ip} via {ev.get('source','ssh')}",
                    evidence       = json.dumps(ev),
                ))

        # Deduplicate AuthEvent — same username+ip within last 2 min
        if not ev.get("success"):
            try:
                from models import AuthEvent
                cutoff2 = datetime.utcnow() - timedelta(minutes=2)
                existing_auth = session.exec(
                    select(AuthEvent)
                    .where(AuthEvent.identity_label == ev.get("username", hostname))
                    .where(AuthEvent.source_ip == (ev.get("source_ip") or "127.0.0.1"))
                    .where(AuthEvent.timestamp >= cutoff2)
                ).first()
                if not existing_auth:
                    session.add(AuthEvent(
                        identity_label = ev.get("username", hostname),
                        event_type     = "failed_login",
                        success        = False,
                        source_ip      = ev.get("source_ip") or "127.0.0.1",
                        user_agent     = ev.get("event_type"),
                        timestamp      = datetime.utcnow(),
                    ))
            except Exception:
                pass

        # Alert on sudo commands — deduplicate by command within 1 min
        if ev.get("event_type") == "sudo_command":
            cutoff3 = datetime.utcnow() - timedelta(minutes=1)
            existing_sudo = session.exec(
                select(ITDRAlert)
                .where(ITDRAlert.alert_type == "privilege_escalation")
                .where(ITDRAlert.identity_label == hostname)
                .where(ITDRAlert.detected_at >= cutoff3)
            ).first()
            if not existing_sudo:
                itdr_alerts.append(ITDRAlert(
                    alert_type     = "privilege_escalation",
                    severity       = "medium",
                    identity_label = hostname,
                    description    = f"sudo on {hostname}: user='{ev.get('username','?')}' ran: {ev.get('sudo_command', ev.get('raw',''))[:200]}",
                    evidence       = json.dumps(ev),
                ))

        # Alert on user management events — deduplicate within 5 min
        if ev.get("event_type") == "user_management":
            cutoff4 = datetime.utcnow() - timedelta(minutes=5)
            existing_usermgmt = session.exec(
                select(ITDRAlert)
                .where(ITDRAlert.alert_type == "user_management")
                .where(ITDRAlert.identity_label == hostname)
                .where(ITDRAlert.detected_at >= cutoff4)
            ).first()
            if not existing_usermgmt:
                itdr_alerts.append(ITDRAlert(
                    alert_type     = "user_management",
                    severity       = "high",
                    identity_label = hostname,
                    description    = f"User account change on {hostname}: {ev.get('raw','')[:200]}",
                    evidence       = json.dumps(ev),
                ))

    session.commit()

    return {
        "ok": True,
        "endpoint_id": endpoint.id,
        "alerts_processed": len(alerts),
        "shadow_ai_events": shadow_ai_count,
        "itdr_alerts_created": len(itdr_alerts),
    }


# ── Command channel ────────────────────────────────────────────────────────────

@router.get("/agent/commands/{agent_id}")
async def get_commands(
    agent_id: str,
    session: Session = Depends(get_session),
    x_agent_token: Optional[str] = Header(None),
):
    """Agent polls this every 10 seconds for pending commands."""
    expected_key = _get_ingest_key()
    if not x_agent_token or not hmac.compare_digest(x_agent_token, expected_key):
        raise HTTPException(401, "Invalid agent token")

    endpoint = session.exec(
        select(Endpoint).where(Endpoint.hostname == agent_id)
    ).first()
    if not endpoint:
        return {"commands": []}

    pending = session.exec(
        select(AgentCommand)
        .where(AgentCommand.agent_id == endpoint.id)
        .where(AgentCommand.status == "pending")
    ).all()

    commands = []
    for cmd in pending:
        cmd.status = "sent"
        session.add(cmd)
        commands.append({
            "id": cmd.id,
            "command": cmd.command_type,
            "payload": json.loads(cmd.payload or "{}"),
        })
    session.commit()
    return {"commands": commands}


@router.post("/agent/commands/{agent_id}/result")
async def command_result(
    agent_id: str,
    data: dict,
    session: Session = Depends(get_session),
    x_agent_token: Optional[str] = Header(None),
):
    """Agent posts command execution results here."""
    expected_key = _get_ingest_key()
    if not x_agent_token or not hmac.compare_digest(x_agent_token, expected_key):
        raise HTTPException(401, "Invalid agent token")

    command_id = data.get("command_id")
    result     = data.get("result", {})
    success    = data.get("success", True)

    if command_id:
        cmd = session.get(AgentCommand, command_id)
        if cmd:
            cmd.status     = "completed" if success else "failed"
            cmd.result     = json.dumps(result)
            cmd.executed_at = datetime.utcnow()
            session.add(cmd)
            session.commit()

    return {"ok": True}


@router.post("/agent/command/dispatch")
def dispatch_command(
    data: dict,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Dispatch a command to an agent from the AegisTrace UI."""
    agent_id     = data.get("agent_id")
    command_type = data.get("command", "ping")
    payload      = data.get("payload", {})

    if not agent_id:
        raise HTTPException(400, "agent_id required")

    # Accept both integer primary-key ID and hostname string
    endpoint = None
    try:
        endpoint = session.get(Endpoint, int(agent_id))
    except (ValueError, TypeError):
        pass
    if not endpoint:
        endpoint = session.exec(select(Endpoint).where(Endpoint.hostname == str(agent_id))).first()
    if not endpoint:
        raise HTTPException(404, f"Endpoint not found: {agent_id}")

    cmd = AgentCommand(
        agent_id=endpoint.id,
        command_type=command_type,
        payload=json.dumps(payload),
        status="pending",
        created_by=user.id,
    )
    session.add(cmd)
    session.commit()
    session.refresh(cmd)
    return {"ok": True, "command_id": cmd.id}


def _do_delete_endpoint(ep_id: int, hostname: str):
    """
    Background cleanup — runs 30s after delete request so agent has
    time to pick up the uninstall command and self-destruct first.
    """
    import time as _time
    _time.sleep(30)

    from database import engine as _engine
    from sqlmodel import Session as _S
    from models import (LogBatch as _LB, RawLogEvent as _RL,
                        ShadowAIEvent as _SA, AgentCommand as _AC,
                        ITDRAlert as _IA, Endpoint as _EP)

    with _S(_engine) as s:
        for model, field in [
            (_LB, _LB.endpoint_id),
            (_RL, _RL.endpoint_id),
            (_SA, _SA.agent_id),
            (_AC, _AC.agent_id),
        ]:
            rows = s.exec(select(model).where(field == ep_id)).all()
            for row in rows:
                s.delete(row)
        alerts = s.exec(select(_IA).where(_IA.identity_label == hostname)).all()
        for a in alerts:
            s.delete(a)
        ep = s.get(_EP, ep_id)
        if ep:
            s.delete(ep)
        s.commit()


@router.delete("/endpoints/{ep_id}")
def delete_endpoint(
    ep_id: int,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Delete an endpoint.
    Step 1 (immediate): queue uninstall_agent command + mark endpoint offline.
    Step 2 (30s later):  background thread wipes all data after agent self-destructs.
    The 30s gap lets the agent pick up and execute the command before its records vanish.
    """
    ep = session.get(Endpoint, ep_id)
    if not ep:
        raise HTTPException(404, "Endpoint not found")

    hostname = ep.hostname

    # 1. Queue uninstall command FIRST — keep it alive so agent can pick it up
    cmd = AgentCommand(
        agent_id     = ep.id,
        command_type = "uninstall_agent",
        payload      = json.dumps({"reason": f"Deleted from dashboard by {user.email}"}),
        status       = "pending",
        created_by   = user.id,
    )
    session.add(cmd)

    # 2. Mark offline so it disappears from the dashboard immediately
    ep.is_active = False
    ep.last_seen = datetime.utcnow() - timedelta(hours=1)
    session.add(ep)
    session.commit()

    # 3. Background thread deletes all data 30s later (after agent self-destructs)
    import threading as _threading
    t = _threading.Thread(
        target=_do_delete_endpoint,
        args=(ep_id, hostname),
        daemon=True,
        name=f"ep-delete-{ep_id}",
    )
    t.start()

    return {
        "ok":      True,
        "message": f"Uninstall command sent to agent on '{hostname}'. All data will be wiped in 30 seconds.",
    }


@router.post("/offline/{agent_id}")
async def mark_offline(
    agent_id: str,
    data: dict,
    session: Session = Depends(get_session),
    x_agent_token: Optional[str] = Header(None),
):
    """Agent calls this before stopping so dashboard shows it offline immediately."""
    expected_key = _get_ingest_key()
    if not x_agent_token or not hmac.compare_digest(x_agent_token, expected_key):
        raise HTTPException(401, "Invalid agent token")
    endpoint = session.exec(select(Endpoint).where(Endpoint.hostname == agent_id)).first()
    if endpoint:
        endpoint.is_active    = False
        endpoint.last_seen    = datetime.utcnow() - timedelta(minutes=10)  # force offline
        session.add(endpoint)
        session.commit()
    return {"ok": True, "reason": data.get("reason", "stopped")}


@router.get("/raw-logs/{endpoint_id}")
def get_raw_logs(
    endpoint_id: int,
    category: Optional[str] = None,
    severity: Optional[str] = None,
    limit: int = 200,
    user: "User" = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Get raw log events for an endpoint — SSH, sudo, kernel, service, auth, etc."""
    q = select(RawLogEvent).where(RawLogEvent.endpoint_id == endpoint_id)
    if category:
        q = q.where(RawLogEvent.category == category)
    if severity:
        q = q.where(RawLogEvent.severity == severity)
    q = q.order_by(RawLogEvent.ts.desc()).limit(limit)
    rows = session.exec(q).all()
    return [
        {
            "id":         r.id,
            "category":   r.category,
            "event_type": r.event_type,
            "source":     r.source,
            "severity":   r.severity,
            "raw":        r.raw,
            "username":   r.username,
            "source_ip":  r.source_ip,
            "success":    r.success,
            "ts":         r.ts.isoformat() if r.ts else None,
        }
        for r in reversed(rows)   # chronological order
    ]


@router.get("/shadow-ai")
def list_shadow_ai(
    limit: int = 50,
    offset: int = 0,
    reviewed: Optional[bool] = None,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """List all shadow AI events."""
    query = select(ShadowAIEvent)
    if reviewed is not None:
        query = query.where(ShadowAIEvent.is_reviewed == reviewed)
    total = len(session.exec(query).all())
    items = session.exec(query.order_by(ShadowAIEvent.detected_at.desc()).offset(offset).limit(limit)).all()
    return {
        "items": [
            {
                "id": e.id,
                "agent_id": e.agent_id,
                "process_name": e.process_name,
                "process_pid": e.process_pid,
                "destination_domain": e.destination_domain,
                "destination_ip": e.destination_ip,
                "detected_at": e.detected_at,
                "is_reviewed": e.is_reviewed,
            }
            for e in items
        ],
        "total": total, "limit": limit, "offset": offset,
    }


@router.patch("/shadow-ai/{event_id}/review")
def review_shadow_ai(
    event_id: int,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    ev = session.get(ShadowAIEvent, event_id)
    if not ev:
        raise HTTPException(404)
    ev.is_reviewed = True
    ev.reviewed_by = user.id
    session.add(ev)
    session.commit()
    return {"ok": True}


# ── Vulnerability Findings ────────────────────────────────────────────────────

@router.get("/vulns/{ep_id}")
async def get_vuln_findings(
    ep_id: int,
    _user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Return the latest vulnerability scan results for an endpoint."""
    ep = session.get(Endpoint, ep_id)
    if not ep:
        raise HTTPException(404, "Endpoint not found")
    findings = json.loads(ep.vuln_findings or "[]")
    return {
        "endpoint_id":   ep_id,
        "hostname":      ep.hostname,
        "findings":      findings,
        "total":         len(findings),
        "critical":      sum(1 for f in findings if f.get("severity") == "CRITICAL"),
        "high":          sum(1 for f in findings if f.get("severity") == "HIGH"),
        "medium":        sum(1 for f in findings if f.get("severity") == "MEDIUM"),
        "low":           sum(1 for f in findings if f.get("severity") == "LOW"),
        "last_scan":     ep.last_vuln_scan.isoformat() + "Z" if ep.last_vuln_scan else None,
    }


@router.post("/vulns/{ep_id}/scan")
async def trigger_vuln_scan(
    ep_id: int,
    _user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Queue an on-demand vulnerability scan on the agent."""
    ep = session.get(Endpoint, ep_id)
    if not ep:
        raise HTTPException(404, "Endpoint not found")
    from models import AgentCommand
    cmd = AgentCommand(
        agent_id=ep.hostname,
        command="vuln_scan_now",
        payload="{}",
        status="pending",
    )
    session.add(cmd)
    session.commit()
    return {"queued": True, "command_id": cmd.id}


# ── Real-time SSE streams ─────────────────────────────────────────────────────

from database import engine as _db_engine


@router.get("/stream/global-alerts")
async def global_alert_stream(
    request: Request,
    _user: User = Depends(get_current_user),
):
    """
    SSE: streams new critical/high ITDR alerts from ALL endpoints.
    AppShell subscribes to this so analysts see incident toasts immediately.
    """
    with Session(_db_engine) as s:
        last_id_val = s.exec(select(func.max(ITDRAlert.id))).first() or 0
    last_id = [last_id_val]

    async def generator():
        yield "retry: 3000\n\n"
        while True:
            if await request.is_disconnected():
                break
            try:
                with Session(_db_engine) as s:
                    new_alerts = s.exec(
                        select(ITDRAlert)
                        .where(ITDRAlert.id > last_id[0])
                        .where(ITDRAlert.severity.in_(["critical", "high", "medium"]))
                        .order_by(ITDRAlert.id.asc())
                        .limit(10)
                    ).all()
                    for a in new_alerts:
                        last_id[0] = a.id
                        payload = json.dumps({
                            "id":          a.id,
                            "alert_type":  a.alert_type,
                            "severity":    a.severity,
                            "hostname":    a.identity_label,
                            "description": a.description,
                            "detected_at": a.detected_at.isoformat() if a.detected_at else None,
                        })
                        yield f"data: {payload}\n\n"
            except Exception:
                pass
            await asyncio.sleep(3)

    return StreamingResponse(
        generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no", "Connection": "keep-alive"},
    )


@router.get("/stream/{ep_id}")
async def endpoint_stream(
    ep_id: int,
    request: Request,
    _user: User = Depends(get_current_user),
):
    """
    SSE: real-time stream for a specific endpoint.
      type: logs    → new RawLogEvents (appended live)
      type: alerts  → new ITDRAlerts for this host
      type: status  → processes, connections, system_info, risk_score (every 5s)
    """
    with Session(_db_engine) as s:
        ep = s.get(Endpoint, ep_id)
        if not ep:
            raise HTTPException(404, "Endpoint not found")
        hostname      = ep.hostname
        last_log_id   = [s.exec(select(func.max(RawLogEvent.id)).where(RawLogEvent.endpoint_id == ep_id)).first() or 0]
        last_alert_id = [s.exec(select(func.max(ITDRAlert.id)).where(ITDRAlert.identity_label == hostname)).first() or 0]

    last_status_ts = [0.0]

    async def generator():
        yield "retry: 2000\n\n"
        while True:
            if await request.is_disconnected():
                break
            try:
                with Session(_db_engine) as s:
                    # ── New raw log events ──────────────────────────────────
                    new_logs = s.exec(
                        select(RawLogEvent)
                        .where(RawLogEvent.endpoint_id == ep_id)
                        .where(RawLogEvent.id > last_log_id[0])
                        .order_by(RawLogEvent.id.asc())
                        .limit(50)
                    ).all()
                    if new_logs:
                        last_log_id[0] = new_logs[-1].id
                        events = [
                            {
                                "id":         l.id,
                                "ts":         l.ts.isoformat() if l.ts else None,
                                "event_type": l.event_type,
                                "category":   l.category,
                                "severity":   l.severity,
                                "source":     l.source,
                                "username":   l.username,
                                "source_ip":  l.source_ip,
                                "raw":        l.raw,
                            }
                            for l in new_logs
                        ]
                        yield f"data: {json.dumps({'type':'logs','events':events})}\n\n"

                    # ── New ITDR alerts ─────────────────────────────────────
                    new_alerts = s.exec(
                        select(ITDRAlert)
                        .where(ITDRAlert.identity_label == hostname)
                        .where(ITDRAlert.id > last_alert_id[0])
                        .order_by(ITDRAlert.id.asc())
                        .limit(20)
                    ).all()
                    if new_alerts:
                        last_alert_id[0] = new_alerts[-1].id
                        alerts = [
                            {
                                "id":          a.id,
                                "alert_type":  a.alert_type,
                                "severity":    a.severity,
                                "description": a.description,
                                "status":      a.status,
                                "detected_at": a.detected_at.isoformat() if a.detected_at else None,
                                "evidence":    a.evidence,
                            }
                            for a in new_alerts
                        ]
                        yield f"data: {json.dumps({'type':'alerts','alerts':alerts})}\n\n"

                    # ── Endpoint status snapshot (every 5s) ─────────────────
                    now = _time_mod.time()
                    if now - last_status_ts[0] >= 5:
                        last_status_ts[0] = now
                        ep_fresh = s.get(Endpoint, ep_id)
                        if ep_fresh:
                            procs = json.loads(ep_fresh.last_processes    or "[]")
                            conns = json.loads(ep_fresh.last_connections  or "[]")
                            sys_i = json.loads(ep_fresh.last_system_info  or "{}")
                            for p in procs:
                                pname = (p.get("name") or "").lower()
                                p["suspicious"] = any(sus in pname for sus in _SUSPICIOUS_PROCESSES)
                            for c in conns:
                                rport = c.get("remote_port", 0)
                                try: c["suspicious"] = int(rport) in _SUSPICIOUS_PORTS
                                except: c["suspicious"] = False
                            age = (datetime.utcnow() - ep_fresh.last_seen).total_seconds() if ep_fresh.last_seen else 9999
                            yield f"data: {json.dumps({'type':'status','is_active':age<120,'local_risk_score':ep_fresh.local_risk_score or 0,'last_seen':ep_fresh.last_seen.isoformat() if ep_fresh.last_seen else None,'processes':procs,'connections':conns,'system_info':sys_i,'agent_version':ep_fresh.agent_version})}\n\n"
            except Exception:
                pass
            await asyncio.sleep(2)

    return StreamingResponse(
        generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no", "Connection": "keep-alive"},
    )


# ── mcp-aegis Gateway Events ─────────────────────────────────────────────────

@router.post("/mcp-event")
async def ingest_mcp_event(
    request: Request,
    session: Session = Depends(get_session),
    x_aegistrace_key: Optional[str] = Header(None),
):
    """
    Receive BLOCK / REQUIRE_APPROVAL events from mcp-aegis gateway.
    Creates an AgentAction entry so events appear in the AI Action Approval Queue.
    Auth: X-AegisTrace-Key header (same INGEST_API_KEY used by endpoint agents).
    """
    _verify_key(x_aegistrace_key)

    try:
        data = await request.json()
    except Exception:
        raise HTTPException(400, "Invalid JSON payload")

    decision   = data.get("decision", "BLOCK")
    tool_name  = data.get("tool_name") or data.get("resource_uri") or "unknown"
    method     = data.get("method", "tools/call")
    rule_name  = data.get("rule_name", "")
    reason     = data.get("reason", "")
    session_id = data.get("session_id", "")
    preview    = data.get("payload_preview", "")

    action_type = "mcp_require_approval" if decision == "REQUIRE_APPROVAL" else "mcp_block"
    approval_status = "pending" if decision == "REQUIRE_APPROVAL" else "auto"

    action = AgentAction(
        agent_name="mcp-aegis",
        task_scope=f"{method}: {tool_name}",
        action_type=action_type,
        input_data=json.dumps({
            "session_id": session_id,
            "method": method,
            "tool_name": tool_name,
            "rule_name": rule_name,
            "payload_preview": preview,
        }),
        output_data=reason,
        confidence=100,
        approval_required=(decision == "REQUIRE_APPROVAL"),
        approval_status=approval_status,
    )
    session.add(action)
    session.commit()

    return {"status": "ok", "action_id": action.id, "action_type": action_type}


# ── prompt-fuzz Jailbreak/Bypass Events ─────────────────────────────────────

@router.post("/promptfuzz-event")
async def ingest_promptfuzz_event(
    request: Request,
    session: Session = Depends(get_session),
    x_aegistrace_key: Optional[str] = Header(None),
):
    """
    Receive a bypassed-payload finding from a prompt-fuzz scan.
    Creates an AgentAction entry so jailbreak bypasses appear in the
    AI Action Approval Queue alongside mcp-aegis events.
    Auth: X-AegisTrace-Key header (same INGEST_API_KEY used by endpoint agents).
    """
    _verify_key(x_aegistrace_key)

    try:
        data = await request.json()
    except Exception:
        raise HTTPException(400, "Invalid JSON payload")

    target       = data.get("target", "unknown")
    payload_id   = data.get("payload_id", "unknown")
    payload_name = data.get("payload_name", payload_id)
    category     = data.get("category", "")
    severity     = data.get("severity", "medium")
    prompt       = data.get("prompt", "")
    response_preview = data.get("response_preview", "")
    reasons      = data.get("reasons", [])

    action = AgentAction(
        agent_name="prompt-fuzz",
        task_scope=f"jailbreak bypass [{category}]: {payload_name}",
        action_type="prompt_fuzz_bypass",
        input_data=json.dumps({
            "target": target,
            "payload_id": payload_id,
            "category": category,
            "severity": severity,
            "prompt": prompt,
            "reasons": reasons,
        }),
        output_data=response_preview,
        confidence=100,
        approval_required=False,
        approval_status="auto",
    )
    session.add(action)
    session.commit()

    return {"status": "ok", "action_id": action.id, "action_type": "prompt_fuzz_bypass"}

