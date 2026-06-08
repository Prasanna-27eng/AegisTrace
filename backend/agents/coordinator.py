"""
AegisTrace Multi-Agent Coordinator — Phase 4
──────────────────────────────────────────────
Orchestrates all specialist agents in parallel, then synthesizes results
into a unified case analysis verdict using NVIDIA Llama-70B.

Flow:
  1. Launch EmailAgent, EndpointAgent, IOCAgent, IdentityAgent in parallel
  2. Await all results (each has its own try/except — one failure doesn't block others)
  3. Run coordinator synthesis (NVIDIA or Groq fallback)
  4. Run ReportAgent on the synthesis
  5. Return combined verdict with per-agent breakdowns

The coordinator result is a superset of the triage agent result — it includes
all per-agent data plus the synthesis. Route handlers can pick what to store.
"""

import json
import asyncio
from datetime import datetime

from nvidia_client import nvidia_chat, NEMOTRON_70B, is_nvidia_available
from ai_router import call_ai_json
from agents.specialist import (
    email_agent_analyze,
    endpoint_agent_analyze,
    ioc_agent_analyze,
    identity_agent_analyze,
    report_agent_draft,
)

_COORDINATOR_SYSTEM = """You are the AegisTrace Multi-Agent Coordinator.

You have received analysis results from four specialist agents:
  EmailAgent, EndpointAgent, IOCAgent, IdentityAgent

Synthesize their findings into a unified incident verdict. Rules:
- Weight specialist findings by relevance to the incident type.
- If agents disagree on severity, use the highest credible assessment.
- Produce MITRE ATT&CK mappings grounded in the specialist findings.
- Recommended actions must be specific and ordered by priority.
- Never fabricate data not present in the specialist results.

Output ONLY valid JSON matching the schema provided."""


async def run_coordinator(case, session) -> dict:
    """
    Run all 5 agents and synthesize. Returns the full multi-agent verdict.
    """
    started_at = datetime.utcnow()

    # ── Phase 1: Run specialists in parallel ──────────────────────────────────
    email_res, endpoint_res, ioc_res, identity_res = await asyncio.gather(
        email_agent_analyze(case, session),
        endpoint_agent_analyze(case, session),
        ioc_agent_analyze(case, session),
        identity_agent_analyze(case, session),
        return_exceptions=True,
    )

    # Normalize any exceptions
    def _safe(r):
        if isinstance(r, Exception):
            return {"error": str(r)}
        return r or {}

    email_res    = _safe(email_res)
    endpoint_res = _safe(endpoint_res)
    ioc_res      = _safe(ioc_res)
    identity_res = _safe(identity_res)

    # ── Phase 2: Coordinator synthesis ───────────────────────────────────────
    specialist_context = json.dumps({
        "case_number":   case.case_number,
        "incident_type": case.incident_type,
        "severity":      case.severity,
        "email_agent":   email_res,
        "endpoint_agent": endpoint_res,
        "ioc_agent":     ioc_res,
        "identity_agent": identity_res,
    }, indent=2)[:4000]

    synthesis_prompt = f"""{specialist_context}

Based on all specialist agent results above, produce the unified verdict:
{{
  "executive_summary": "2-3 sentences for leadership, referencing specialist findings",
  "technical_summary": "4-6 sentences grounded in specific agent findings",
  "severity_score": <0-100>,
  "severity_reasoning": "evidence from specialist agents driving this score",
  "mitre_techniques": [{{"id":"T####","name":"...","tactic":"..."}}],
  "recommended_actions": ["highest priority first"],
  "ioc_verdicts": [],
  "agent_confidence": <0-100>,
  "attack_stage": "initial_access|execution|persistence|privilege_escalation|lateral_movement|exfiltration|impact|unknown"
}}"""

    synthesis = {}
    if is_nvidia_available():
        resp = nvidia_chat(
            model=NEMOTRON_70B,
            messages=[
                {"role": "system", "content": _COORDINATOR_SYSTEM},
                {"role": "user",   "content": synthesis_prompt},
            ],
            temperature=0.2,
            max_tokens=1500,
        )
        if resp:
            content = resp.choices[0].message.content or ""
            try:
                s = content.find("{")
                e = content.rfind("}") + 1
                synthesis = json.loads(content[s:e])
            except Exception:
                synthesis = {}

    if not synthesis:
        synthesis = call_ai_json("analysis", synthesis_prompt, 0.2, 1500)

    synthesis["coordinator_model"] = NEMOTRON_70B if is_nvidia_available() else "groq-fallback"

    # ── Phase 3: Report agent (sequential — needs synthesis) ──────────────────
    report_res = await report_agent_draft(case, synthesis)

    elapsed_ms = int((datetime.utcnow() - started_at).total_seconds() * 1000)

    return {
        **synthesis,
        "specialist_results": {
            "email":    email_res,
            "endpoint": endpoint_res,
            "ioc":      ioc_res,
            "identity": identity_res,
        },
        "dora_report_draft": report_res,
        "pipeline": "multi-agent-coordinator",
        "elapsed_ms": elapsed_ms,
    }
