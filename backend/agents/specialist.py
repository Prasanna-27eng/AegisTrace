"""
AegisTrace Specialist Agents — Phase 4
────────────────────────────────────────
Four domain-specialist agents run in parallel.
Each analyses its own slice of the case and returns a structured dict.
The coordinator (coordinator.py) synthesizes all results.

Specialists:
  EmailAgent      → email forensics, phishing verdict, header analysis
  EndpointAgent   → telemetry, vuln findings, process anomalies
  IOCAgent        → enrichment across all 7 intel sources, severity scoring
  IdentityAgent   → ITDR signals, impossible travel, privilege escalation
  ReportAgent     → DORA Article 19 narrative draft
"""

import json
import asyncio
from nvidia_client import nvidia_chat, LLAMA_70B, is_nvidia_available
from ai_router import call_ai_json


# ── Shared helper ─────────────────────────────────────────────────────────────

def _nvidia_or_groq_json(prompt: str, groq_task: str = "analysis") -> dict:
    """Try NVIDIA first, fall back to Groq. Always returns a dict."""
    if is_nvidia_available():
        resp = nvidia_chat(
            model=LLAMA_70B,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
            max_tokens=1200,
        )
        if resp:
            content = resp.choices[0].message.content or ""
            try:
                s = content.find("{")
                e = content.rfind("}") + 1
                return json.loads(content[s:e])
            except Exception:
                pass
    return call_ai_json(groq_task, prompt, 0.2, 1200)


# ── Email Agent ───────────────────────────────────────────────────────────────

async def email_agent_analyze(case, session) -> dict:
    """Analyse email-related evidence in the case."""
    try:
        from sqlmodel import select
        from models import LogAnalysis
        email_logs = session.exec(
            select(LogAnalysis)
            .where(LogAnalysis.case_id == case.id)
            .where(LogAnalysis.log_type == "email")
        ).all()

        email_context = ""
        for log in email_logs[:3]:
            email_context += f"\n---\n{log.raw_content[:600]}"

        if not email_context:
            email_context = "No email logs attached to this case."

        prompt = f"""You are an email security analyst. Analyse email evidence for case {case.case_number}.

Case description: {(case.description or '')[:400]}
Email evidence: {email_context[:800]}

Respond ONLY with valid JSON:
{{
  "email_verdict": "Phishing|BEC|Malware|Spam|Legitimate|Suspicious|Unknown",
  "confidence": <0-100>,
  "phishing_signals": ["list of detected signals"],
  "sender_legitimacy": "legitimate|spoofed|unknown",
  "mitre_technique": "T#### — name if applicable or null",
  "summary": "2 sentence analysis"
}}"""

        result = await asyncio.to_thread(_nvidia_or_groq_json, prompt, "classification")
        result["agent"] = "EmailAgent"
        return result
    except Exception as exc:
        return {"agent": "EmailAgent", "error": str(exc), "email_verdict": "Unknown", "confidence": 0}


# ── Endpoint Agent ─────────────────────────────────────────────────────────────

async def endpoint_agent_analyze(case, session) -> dict:
    """Analyse endpoint telemetry and vulnerability data."""
    try:
        from sqlmodel import select
        from models import Endpoint, LogBatch

        # Find endpoints referenced in this case
        affected = (case.affected_systems or "").replace(",", " ").split()
        endpoint_data = []
        for hostname in affected[:3]:
            ep = session.exec(
                select(Endpoint).where(Endpoint.hostname.ilike(f"%{hostname.strip()}%"))
            ).first()
            if ep:
                vulns = json.loads(ep.vuln_findings or "[]")
                endpoint_data.append({
                    "hostname":     ep.hostname,
                    "risk_score":   ep.local_risk_score,
                    "failed_logins": ep.total_failed_logins,
                    "vuln_count":   len(vulns),
                    "critical_vulns": sum(1 for v in vulns if v.get("severity") == "critical"),
                })

        # Log batches from this case
        batches = session.exec(
            select(LogBatch).where(LogBatch.case_id == case.id)
        ).all()
        batch_summary = [
            {"verdict": b.ai_verdict, "threat_score": b.threat_score, "log_type": b.log_type}
            for b in batches[:5]
        ]

        prompt = f"""You are an endpoint security analyst. Analyse endpoint evidence for case {case.case_number}.

Affected systems: {case.affected_systems or 'unspecified'}
Endpoint data: {json.dumps(endpoint_data)}
Log batch verdicts: {json.dumps(batch_summary)}
Case findings: {(case.findings or '')[:400]}

Respond ONLY with valid JSON:
{{
  "endpoint_risk": "critical|high|medium|low|unknown",
  "persistence_likely": true or false,
  "lateral_movement_signals": ["list or empty"],
  "top_threat": "brief description of highest-risk endpoint finding",
  "recommended_endpoint_actions": ["action 1","action 2"],
  "summary": "2 sentence analysis"
}}"""

        result = await asyncio.to_thread(_nvidia_or_groq_json, prompt, "analysis")
        result["agent"] = "EndpointAgent"
        return result
    except Exception as exc:
        return {"agent": "EndpointAgent", "error": str(exc), "endpoint_risk": "unknown"}


# ── IOC Agent ─────────────────────────────────────────────────────────────────

async def ioc_agent_analyze(case, session) -> dict:
    """Score and categorize all IOCs in the case."""
    try:
        iocs = json.loads(case.iocs or "[]")
        if not iocs:
            return {"agent": "IOCAgent", "ioc_count": 0, "malicious_count": 0, "summary": "No IOCs in this case."}

        prompt = f"""You are an IOC analyst. Evaluate the indicators of compromise for case {case.case_number}.

IOCs ({len(iocs)}): {json.dumps(iocs[:15])}
Case context: {(case.description or '')[:300]}

Respond ONLY with valid JSON:
{{
  "ioc_count": {len(iocs)},
  "malicious_count": <number>,
  "suspicious_count": <number>,
  "clean_count": <number>,
  "highest_risk_ioc": "the most dangerous IOC value",
  "highest_risk_reason": "why",
  "ioc_categories": ["IP","domain","hash","url"] present,
  "campaign_indicator": true or false,
  "summary": "2 sentence IOC analysis"
}}"""

        result = await asyncio.to_thread(_nvidia_or_groq_json, prompt, "extraction")
        result["agent"] = "IOCAgent"
        return result
    except Exception as exc:
        return {"agent": "IOCAgent", "error": str(exc), "malicious_count": 0}


# ── Identity Agent ─────────────────────────────────────────────────────────────

async def identity_agent_analyze(case, session) -> dict:
    """Detect identity-related signals: impossible travel, privilege escalation, account takeover."""
    try:
        from sqlmodel import select
        from models import ITDRAlert

        itdr_alerts = session.exec(
            select(ITDRAlert)
            .where(ITDRAlert.case_id == case.id)
            .order_by(ITDRAlert.created_at.desc())
        ).all()

        alert_summary = [
            {"type": a.alert_type, "severity": a.severity, "identity": a.identity_id, "description": (a.description or '')[:200]}
            for a in itdr_alerts[:8]
        ]

        prompt = f"""You are an identity security analyst specializing in ITDR (Identity Threat Detection & Response).
Analyse identity risk for case {case.case_number}.

ITDR alerts ({len(itdr_alerts)}): {json.dumps(alert_summary)}
Case type: {case.incident_type}
Description: {(case.description or '')[:400]}

Respond ONLY with valid JSON:
{{
  "identity_risk": "critical|high|medium|low|none",
  "attack_patterns": ["impossible_travel","credential_stuffing","token_replay","privilege_escalation","account_takeover","mfa_bypass"],
  "compromised_identities": ["list of affected identity IDs or empty"],
  "blast_radius": "individual|team|organization|unknown",
  "containment_priority": "immediate|high|normal|low",
  "summary": "2 sentence identity risk analysis"
}}"""

        result = await asyncio.to_thread(_nvidia_or_groq_json, prompt, "analysis")
        result["agent"] = "IdentityAgent"
        return result
    except Exception as exc:
        return {"agent": "IdentityAgent", "error": str(exc), "identity_risk": "unknown"}


# ── Report Agent ──────────────────────────────────────────────────────────────

async def report_agent_draft(case, synthesis: dict) -> dict:
    """Draft a DORA Article 19 compliant incident report narrative."""
    try:
        prompt = f"""You are a senior security analyst writing a DORA Article 19 incident report.

Case: {case.case_number} — {case.title}
Severity: {case.severity} | Type: {case.incident_type}
Affected: {case.affected_systems or 'unspecified'}
Analysis summary: {json.dumps(synthesis)[:600]}

Write a formal incident report. Respond ONLY with valid JSON:
{{
  "executive_summary": "3-4 sentence non-technical summary for leadership",
  "incident_classification": "DORA Article 19 incident classification",
  "timeline_summary": "key events in sequence (2-3 sentences)",
  "impact_assessment": "affected systems, data, users, services",
  "root_cause": "brief root cause analysis",
  "containment_actions": ["action taken or recommended"],
  "regulatory_notification_required": true or false,
  "notification_deadline": "24h|72h|none|TBD",
  "report_status": "draft"
}}"""

        result = await asyncio.to_thread(_nvidia_or_groq_json, prompt, "report")
        result["agent"] = "ReportAgent"
        return result
    except Exception as exc:
        return {"agent": "ReportAgent", "error": str(exc), "report_status": "failed"}
