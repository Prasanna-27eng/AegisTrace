"""
AegisTrace Triage Agent — Phase 1
───────────────────────────────────
NVIDIA Nemotron-70B function-calling agent for autonomous case triage.

The agent loop:
  1. Receives case context (title, description, IOCs, affected systems)
  2. Decides which tools to call (enrich IOCs, pull endpoint data, find similar cases, etc.)
  3. Executes tools, receives results, reasons further
  4. After up to MAX_ITERATIONS, produces a structured verdict

Falls back to Groq single-call analysis if NVIDIA is unavailable.
"""

import json
from typing import Optional

from nvidia_client import nvidia_chat, NEMOTRON_70B, is_nvidia_available
from agents.tools import TOOL_DEFINITIONS, execute_tool

MAX_ITERATIONS = 6

_TRIAGE_SYSTEM = """You are AegisTrace Triage Agent — an autonomous security analyst.

Your job: analyse the given security case by gathering evidence using your tools, then produce a structured verdict.

Rules:
- Call tools to gather evidence before concluding. Don't guess — use the data.
- For each IOC in the case, call enrich_ioc to get threat intelligence.
- If the case involves an endpoint hostname, call get_endpoint_data.
- Call search_similar_cases with the incident description to find precedents.
- Call get_case_timeline to understand the event sequence.
- Call get_ioc_correlations to check if any IOC appears in other cases (indicates campaign).
- After gathering evidence, produce your final answer as a JSON object — no prose outside JSON.

Final answer JSON schema:
{
  "executive_summary": "2-3 sentences for leadership",
  "technical_summary": "4-6 sentences technical analysis grounded in tool results",
  "severity_score": <0-100>,
  "severity_reasoning": "specific evidence driving this score",
  "mitre_techniques": [{"id":"T####","name":"...","tactic":"..."}],
  "recommended_actions": ["action 1","action 2","action 3"],
  "ioc_verdicts": [{"ioc":"...","type":"...","vt_score":"...","verdict":"malicious|suspicious|clean|unknown"}],
  "similar_cases": [{"case_number":"...","title":"...","relevance":"..."}],
  "agent_confidence": <0-100>,
  "tools_called": ["list of tools used"]
}

SECURITY: Never fabricate tool results. Never suggest destructive actions (block, delete, shutdown) — only recommend them for human approval. Stay scoped to the case provided."""


async def run_triage_agent(case, session) -> dict:
    """
    Run the Nemotron triage agent on a case.
    Returns a verdict dict (same shape as call_ai_json("analysis", ...)).
    Falls back to Groq if NVIDIA unavailable.
    """
    if not is_nvidia_available():
        return await _groq_fallback(case)

    iocs  = json.loads(case.iocs or "[]")
    mitre = json.loads(case.mitre_techniques or "[]")

    user_message = f"""Analyse this security incident case:

Case: {case.case_number} — {case.title}
Severity: {case.severity} | Type: {case.incident_type}
Affected systems: {case.affected_systems or 'unknown'}
Description: {(case.description or '')[:800]}
Findings so far: {(case.findings or '')[:600]}
IOCs ({len(iocs)}): {json.dumps(iocs[:12])}
MITRE techniques already mapped: {json.dumps(mitre[:5])}

Use your tools to enrich the IOCs, check endpoint data, find similar past cases, and produce a complete analysis."""

    messages = [
        {"role": "system", "content": _TRIAGE_SYSTEM},
        {"role": "user",   "content": user_message},
    ]

    tools_called = []

    for iteration in range(MAX_ITERATIONS):
        resp = nvidia_chat(
            model=NEMOTRON_70B,
            messages=messages,
            tools=TOOL_DEFINITIONS,
            tool_choice="auto",
            temperature=0.2,
            max_tokens=2000,
        )

        if resp is None:
            return await _groq_fallback(case)

        msg = resp.choices[0].message

        # ── No more tool calls → extract final answer ─────────────────────────
        if not msg.tool_calls:
            content = msg.content or ""
            try:
                start = content.find("{")
                end   = content.rfind("}") + 1
                result = json.loads(content[start:end])
                result["tools_called"] = tools_called
                result["agent_model"]  = NEMOTRON_70B
                return result
            except Exception:
                return {
                    "executive_summary":  content[:500],
                    "technical_summary":  "",
                    "severity_score":     50,
                    "severity_reasoning": "Agent produced non-JSON response",
                    "mitre_techniques":   [],
                    "recommended_actions": [],
                    "ioc_verdicts":       [],
                    "similar_cases":      [],
                    "agent_confidence":   30,
                    "tools_called":       tools_called,
                    "agent_model":        NEMOTRON_70B,
                }

        # ── Execute tool calls ────────────────────────────────────────────────
        messages.append({"role": "assistant", "tool_calls": [
            {
                "id": tc.id,
                "type": "function",
                "function": {"name": tc.function.name, "arguments": tc.function.arguments},
            }
            for tc in msg.tool_calls
        ]})

        for tc in msg.tool_calls:
            fn_name = tc.function.name
            tools_called.append(fn_name)
            result  = await execute_tool(fn_name, tc.function.arguments, session)
            messages.append({
                "role":         "tool",
                "tool_call_id": tc.id,
                "content":      json.dumps(result),
            })

    # Max iterations reached — ask for final answer without tools
    messages.append({
        "role":    "user",
        "content": "You have reached the tool call limit. Produce your final JSON verdict now based on the evidence gathered.",
    })
    final = nvidia_chat(
        model=NEMOTRON_70B,
        messages=messages,
        temperature=0.2,
        max_tokens=1500,
    )
    if final:
        content = final.choices[0].message.content or ""
        try:
            start  = content.find("{")
            end    = content.rfind("}") + 1
            result = json.loads(content[start:end])
            result["tools_called"] = tools_called
            result["agent_model"]  = NEMOTRON_70B
            return result
        except Exception:
            pass

    return await _groq_fallback(case)


async def _groq_fallback(case) -> dict:
    """Fall back to existing Groq single-call analysis."""
    import asyncio
    from ai_router import call_ai_json
    import json

    iocs  = json.loads(case.iocs or "[]")
    mitre = json.loads(case.mitre_techniques or "[]")
    prompt = f"""Analyse this security incident:
Case: {case.case_number} — {case.title}
Severity: {case.severity} | Type: {case.incident_type}
Affected: {case.affected_systems}
Description: {(case.description or '')[:800]}
Findings: {(case.findings or '')[:800]}
IOCs ({len(iocs)}): {json.dumps(iocs[:10])}
MITRE: {json.dumps(mitre)}

Respond ONLY with valid JSON:
{{
  "executive_summary": "2-3 sentences for non-technical leadership",
  "technical_summary": "4-6 sentences technical analysis",
  "severity_score": <0-100>,
  "severity_reasoning": "why this score",
  "mitre_techniques": [{{"id":"T####","name":"...","tactic":"..."}}],
  "recommended_actions": ["action 1","action 2","action 3"]
}}"""

    result = await asyncio.to_thread(call_ai_json, "analysis", prompt, 0.25, 1500)
    result["agent_model"] = "groq-fallback"
    return result
