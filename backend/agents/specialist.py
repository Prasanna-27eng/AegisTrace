"""
AegisTrace Specialist Agents — Phase 4 & v9.0
───────────────────────────────────────────────
Four domain-specialist agents run in parallel.
Each analyses its own slice of the case and returns a structured dict.
The coordinator (coordinator.py) synthesizes all results.

Specialists:
  EmailAgent      → email forensics, phishing verdict, header analysis
  EndpointAgent   → v9.0 Hermes-3 agentic loop: live EDR data, process anomaly
                     scoring via NVIDIA embeddings, vision forensics, Sigma rule gen
  IOCAgent        → enrichment across all 7 intel sources, severity scoring
  IdentityAgent   → ITDR signals, impossible travel, privilege escalation
  ReportAgent     → DORA Article 19 narrative draft

v9.0 EndpointAgent improvements:
  1. Hermes-3 agentic loop (was single-shot prompt)
  2. Live EDR process data via get_live_processes tool
  3. NVIDIA embedding anomaly scoring via analyze_process_anomalies tool
  4. Llama 3.2 Vision for screenshot/image log evidence
  5. NV-RerankQA log batch selection (most relevant, not just latest 5)
  6. Codestral auto-generated Sigma detection rule on high/critical findings
"""

import json
import asyncio
from nvidia_client import (
    nvidia_chat,
    nvidia_rerank,
    nvidia_vision,
    is_nvidia_available,
    LLAMA_70B,
    HERMES_3,
    CODESTRAL,
)
from ai_router import call_ai_json
from agents.tools import TOOL_DEFINITIONS, execute_tool


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


# ── Endpoint Agent v9.0 ────────────────────────────────────────────────────────

_ENDPOINT_SYSTEM = """You are AegisTrace EndpointAgent — an autonomous endpoint security analyst.

Your job: investigate endpoint evidence for the given security case using your tools, then produce a structured verdict.

Rules:
- For each affected hostname, call get_endpoint_data to read the risk score, failed logins, and vuln findings.
- For each hostname, call get_live_processes to get the CURRENT live process list from the EDR platform.
- Pass any unusual process cmdlines to analyze_process_anomalies for NVIDIA embedding-based scoring.
- If you discover IOC hashes or suspicious IPs in process data, call get_ioc_correlations.
- After gathering evidence, produce your final answer as JSON — no prose outside JSON.

Final JSON schema:
{
  "endpoint_risk": "critical|high|medium|low|unknown",
  "persistence_likely": true or false,
  "lateral_movement_signals": ["list or empty"],
  "top_threat": "brief description of highest-risk endpoint finding",
  "suspicious_processes": [{"process":"...","anomaly_score":N,"reason":"..."}],
  "recommended_endpoint_actions": ["action 1", "action 2"],
  "sigma_ready": true or false,
  "summary": "2 sentence analysis",
  "agent": "EndpointAgent"
}

SECURITY: Never fabricate tool results. Actions are recommendations for human approval only."""

_ENDPOINT_TOOL_NAMES = {
    "get_endpoint_data",
    "get_live_processes",
    "analyze_process_anomalies",
    "get_ioc_correlations",
}

MAX_ENDPOINT_ITERATIONS = 5


async def endpoint_agent_analyze(case, session) -> dict:
    """
    v9.0 EntryPoint: Hermes-3 agentic loop with live EDR tools, embedding-based
    anomaly scoring, vision evidence, reranked log batches, and Sigma auto-gen.
    Falls back to Groq single-call if NVIDIA unavailable.
    """
    if not is_nvidia_available():
        return await _endpoint_groq_fallback(case, session)
    return await _run_endpoint_agent_loop(case, session)


async def _run_endpoint_agent_loop(case, session) -> dict:
    """Hermes-3 agentic loop for deep endpoint analysis."""
    affected_hostnames = [
        h.strip()
        for h in (case.affected_systems or "").replace(",", " ").split()
        if h.strip()
    ][:4]

    # ── Vision evidence check ─────────────────────────────────────────────────
    vision_context = await _check_endpoint_vision(case, session)

    # ── Reranked log batches ──────────────────────────────────────────────────
    batch_summary = await _get_reranked_log_batches(case, session)

    # ── Build initial user message ────────────────────────────────────────────
    user_message = f"""Investigate endpoint evidence for case {case.case_number}: {case.title}

Severity: {case.severity} | Type: {case.incident_type}
Affected systems: {case.affected_systems or 'unspecified'}
Description: {(case.description or '')[:600]}
Existing findings: {(case.findings or '')[:400]}
Log batch verdicts: {json.dumps(batch_summary)}
{f'Visual evidence from screenshots: {vision_context}' if vision_context else ''}

For each affected hostname ({', '.join(affected_hostnames) or 'check case description'}):
1. Call get_endpoint_data to get risk score and vulnerabilities
2. Call get_live_processes to get the real-time process list
3. Call analyze_process_anomalies with suspicious cmdlines from the live process list
4. If you find correlation-worthy indicators, call get_ioc_correlations

Produce your final JSON verdict after gathering evidence."""

    messages = [
        {"role": "system", "content": _ENDPOINT_SYSTEM},
        {"role": "user",   "content": user_message},
    ]

    endpoint_tools = [
        t for t in TOOL_DEFINITIONS
        if t["function"]["name"] in _ENDPOINT_TOOL_NAMES
    ]

    for _iteration in range(MAX_ENDPOINT_ITERATIONS):
        resp = nvidia_chat(
            model=HERMES_3,
            messages=messages,
            tools=endpoint_tools,
            tool_choice="auto",
            temperature=0.2,
            max_tokens=2000,
        )

        if resp is None:
            return await _endpoint_groq_fallback(case, session)

        msg = resp.choices[0].message

        # ── No more tool calls → extract final JSON ───────────────────────────
        if not msg.tool_calls:
            content = msg.content or ""
            result  = _parse_endpoint_json(content)

            # Auto-generate Sigma rule on critical/high findings
            if result.get("endpoint_risk") in ("critical", "high") or result.get("sigma_ready"):
                result["sigma_rule"] = await _generate_endpoint_sigma(case, result)

            result["agent"]       = "EndpointAgent"
            result["agent_model"] = HERMES_3
            if vision_context:
                result["vision_evidence"] = vision_context[:400]
            return result

        # ── Execute tool calls ────────────────────────────────────────────────
        messages.append({"role": "assistant", "tool_calls": [
            {
                "id":       tc.id,
                "type":     "function",
                "function": {"name": tc.function.name, "arguments": tc.function.arguments},
            }
            for tc in msg.tool_calls
        ]})

        for tc in msg.tool_calls:
            tool_result = await execute_tool(
                tc.function.name,
                tc.function.arguments,
                session,
                org_id=getattr(case, "org_id", None),
            )
            messages.append({
                "role":         "tool",
                "tool_call_id": tc.id,
                "content":      json.dumps(tool_result),
            })

    # Max iterations reached — force final answer
    messages.append({
        "role":    "user",
        "content": "Tool call limit reached. Produce your final JSON verdict now based on evidence gathered.",
    })
    final = nvidia_chat(
        model=HERMES_3,
        messages=messages,
        temperature=0.2,
        max_tokens=1500,
    )
    if final:
        content = final.choices[0].message.content or ""
        result  = _parse_endpoint_json(content)
        if result.get("endpoint_risk") in ("critical", "high") or result.get("sigma_ready"):
            result["sigma_rule"] = await _generate_endpoint_sigma(case, result)
        result["agent"]       = "EndpointAgent"
        result["agent_model"] = HERMES_3
        return result

    return await _endpoint_groq_fallback(case, session)


def _parse_endpoint_json(content: str) -> dict:
    """Extract JSON from model output; return minimal dict on failure."""
    try:
        start  = content.find("{")
        end    = content.rfind("}") + 1
        return json.loads(content[start:end])
    except Exception:
        return {
            "endpoint_risk":               "unknown",
            "persistence_likely":          False,
            "lateral_movement_signals":    [],
            "top_threat":                  content[:300],
            "suspicious_processes":        [],
            "recommended_endpoint_actions": [],
            "sigma_ready":                 False,
            "summary":                     "Agent produced non-JSON response",
            "agent":                       "EndpointAgent",
        }


# ── v9.0 helper: Reranked log batch selection ─────────────────────────────────

async def _get_reranked_log_batches(case, session, top_n: int = 5) -> list:
    """
    Select the most relevant log batches for this case using NV-RerankQA.
    Falls back to recency (latest 5) if fewer than top_n batches or NVIDIA unavailable.
    """
    try:
        from sqlmodel import select
        from models import LogBatch

        batches = session.exec(
            select(LogBatch).where(LogBatch.case_id == case.id)
        ).all()

        batch_summaries = [
            {
                "verdict":      b.ai_verdict,
                "threat_score": b.threat_score,
                "log_type":     b.log_type,
            }
            for b in batches
        ]

        if len(batches) <= top_n or not is_nvidia_available():
            return batch_summaries[:top_n]

        query    = f"{case.incident_type}: {(case.description or '')[:200]}"
        passages = [
            f"{b.log_type or 'unknown'}: {b.ai_verdict or ''} score={b.threat_score or 0}"
            for b in batches
        ]

        rankings = await asyncio.to_thread(nvidia_rerank, query, passages, top_n)

        ranked = []
        seen   = set()
        for item in rankings:
            idx = item.get("index", 0)
            if idx < len(batch_summaries) and idx not in seen:
                seen.add(idx)
                ranked.append(batch_summaries[idx])

        # Fill remaining with non-ranked batches
        for i, s in enumerate(batch_summaries):
            if i not in seen and len(ranked) < top_n:
                ranked.append(s)

        return ranked[:top_n]
    except Exception:
        return []


# ── v9.0 helper: Vision evidence check ───────────────────────────────────────

async def _check_endpoint_vision(case, session) -> str:
    """
    Check for screenshot/image log batches attached to the case.
    Analyzes any found with Llama 3.2 Vision 11B.
    Returns combined findings string, or "" if none found.
    """
    try:
        from sqlmodel import select
        from models import LogBatch

        image_batches = session.exec(
            select(LogBatch)
            .where(LogBatch.case_id == case.id)
            .where(LogBatch.log_type.in_(["screenshot", "image", "screen_capture"]))
        ).all()

        if not image_batches:
            return ""

        findings = []
        for batch in image_batches[:2]:
            content = (batch.raw_content or "").strip()
            if len(content) < 100:
                continue
            analysis = await asyncio.to_thread(
                nvidia_vision,
                content[:60000],
                (
                    "You are a forensic analyst. Identify suspicious processes, malware artifacts, "
                    "error messages, credential access, lateral movement indicators, or other attack "
                    "artifacts visible in this endpoint screenshot or memory dump output."
                ),
            )
            if analysis:
                findings.append(analysis[:500])

        return " | ".join(findings)
    except Exception:
        return ""


# ── v9.0 helper: Codestral Sigma rule generation ──────────────────────────────

async def _generate_endpoint_sigma(case, analysis: dict) -> str:
    """
    Generate a Sigma detection rule from endpoint analysis findings using Codestral 22B.
    Returns the YAML rule string, or "" on failure.
    """
    try:
        suspicious_procs = analysis.get("suspicious_processes", [])
        top_threat       = analysis.get("top_threat", "")
        mitre_note       = ""

        if not suspicious_procs and not top_threat:
            return ""

        proc_context = json.dumps(
            [{"process": p.get("process", "")[:120], "score": p.get("anomaly_score")}
             for p in suspicious_procs[:3]],
            indent=2
        )

        prompt = f"""Generate a Sigma detection rule for the following endpoint security finding.

Case: {case.case_number} — {case.title}
Incident type: {case.incident_type}
Top threat finding: {top_threat}
Suspicious processes:
{proc_context}

Requirements:
- Write a valid Sigma YAML rule targeting Windows Event Logs, Sysmon, or Linux auditd
- Include title, status, description, logsource, detection, and falsepositives fields
- The detection should match the specific process names, command-line patterns, or behaviors found
- Return ONLY the Sigma YAML, no explanation or markdown fences"""

        resp = await asyncio.to_thread(
            nvidia_chat,
            CODESTRAL,
            [{"role": "user", "content": prompt}],
            temperature=0.1,
            max_tokens=800,
        )

        if resp:
            content = resp.choices[0].message.content or ""
            # Strip any markdown fences if model adds them
            content = content.replace("```yaml", "").replace("```", "").strip()
            return content
    except Exception:
        pass
    return ""


# ── Endpoint Agent Groq fallback ──────────────────────────────────────────────

async def _endpoint_groq_fallback(case, session) -> dict:
    """Single-shot Groq fallback when NVIDIA unavailable."""
    try:
        from sqlmodel import select
        from models import Endpoint, LogBatch

        affected = (case.affected_systems or "").replace(",", " ").split()
        endpoint_data = []
        for hostname in affected[:3]:
            ep = session.exec(
                select(Endpoint).where(Endpoint.hostname.ilike(f"%{hostname.strip()}%"))
            ).first()
            if ep:
                vulns = json.loads(ep.vuln_findings or "[]")
                endpoint_data.append({
                    "hostname":      ep.hostname,
                    "risk_score":    ep.local_risk_score,
                    "failed_logins": ep.total_failed_logins,
                    "vuln_count":    len(vulns),
                    "critical_vulns": sum(1 for v in vulns if v.get("severity") == "critical"),
                })

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
  "suspicious_processes": [],
  "recommended_endpoint_actions": ["action 1","action 2"],
  "sigma_ready": false,
  "summary": "2 sentence analysis"
}}"""

        result = await asyncio.to_thread(_nvidia_or_groq_json, prompt, "analysis")
        result["agent"]       = "EndpointAgent"
        result["agent_model"] = "groq-fallback"
        return result
    except Exception as exc:
        return {
            "agent":                        "EndpointAgent",
            "agent_model":                  "groq-fallback",
            "error":                        str(exc),
            "endpoint_risk":                "unknown",
            "persistence_likely":           False,
            "lateral_movement_signals":     [],
            "top_threat":                   "",
            "suspicious_processes":         [],
            "recommended_endpoint_actions": [],
            "sigma_ready":                  False,
            "summary":                      "Endpoint analysis unavailable",
        }


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
