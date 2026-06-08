"""
AegisTrace Detection Rule Generator — Phase 9
───────────────────────────────────────────────
Codestral 22B generates deployable detection rules from case IOCs and MITRE techniques.

Endpoints:
  POST /api/rules/cases/{id}/generate   — generate YARA + Sigma + KQL + Splunk SPL
  GET  /api/rules/cases/{id}            — get previously generated rules
"""

import json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from database import get_session
from routers.auth import get_current_user, _audit
from models import User, Case
from nvidia_client import nvidia_chat, CODESTRAL, is_nvidia_available
from ai_router import call_ai

router = APIRouter(tags=["rules"])

_CODESTRAL_SYSTEM = """You are a cybersecurity detection engineer.
Generate production-grade detection rules in exactly the formats requested.
Rules must be syntactically correct and deployable without modification.
Output ONLY the JSON object requested — no prose, no markdown fences outside the JSON."""


def _build_rules_prompt(case, iocs: list, mitre: list) -> str:
    ioc_summary = ", ".join(
        f"{i.get('ioc', '')} ({i.get('type', '')})"
        for i in iocs[:8]
    )
    mitre_summary = ", ".join(
        f"{t.get('id', '')} {t.get('name', '')}"
        for t in mitre[:5]
    )

    return f"""Generate detection rules for this security incident:

Case: {case.case_number} — {case.title}
Incident type: {case.incident_type}
Severity: {case.severity}
IOCs: {ioc_summary or 'none specified'}
MITRE techniques: {mitre_summary or 'none specified'}
Description: {(case.description or '')[:400]}

Generate these 4 rule types and return as JSON:
{{
  "yara": "complete valid YARA rule as a string",
  "sigma": "complete valid Sigma rule in YAML format as a string",
  "kql": "complete valid KQL query for Microsoft Sentinel as a string",
  "splunk_spl": "complete valid Splunk SPL query as a string",
  "rule_name": "short alphanumeric rule identifier",
  "description": "one sentence describing what these rules detect",
  "platforms": ["windows","linux","macos"],
  "generated_at": "{datetime.utcnow().isoformat()}"
}}

Rules must:
- Use real IOC values from the case where present
- Include meta/description fields in YARA and Sigma
- Be immediately deployable in the target platform
- Cover the MITRE techniques listed"""


async def _generate_with_codestral(prompt: str) -> dict:
    """Try Codestral first, fall back to Groq code task."""
    if is_nvidia_available():
        resp = nvidia_chat(
            model=CODESTRAL,
            messages=[
                {"role": "system", "content": _CODESTRAL_SYSTEM},
                {"role": "user",   "content": prompt},
            ],
            temperature=0.1,
            max_tokens=2500,
        )
        if resp:
            content = resp.choices[0].message.content or ""
            try:
                s = content.find("{")
                e = content.rfind("}") + 1
                return json.loads(content[s:e])
            except Exception:
                pass

    # Groq fallback
    import asyncio
    raw = await asyncio.to_thread(call_ai, "code", prompt, 0.1, 2000)
    try:
        s = raw.find("{")
        e = raw.rfind("}") + 1
        return json.loads(raw[s:e])
    except Exception:
        return {
            "yara":        raw[:500] if "rule" in raw else "// Generation failed",
            "sigma":       "// Generation failed",
            "kql":         "// Generation failed",
            "splunk_spl":  "// Generation failed",
            "rule_name":   f"AEGIS_{case.case_number.replace('-', '_')}",
            "description": "Rule generation partially failed — see raw output",
            "platforms":   ["windows", "linux", "macos"],
            "error":       "Parse failed",
        }


@router.post("/api/rules/cases/{case_id}/generate")
async def generate_rules(
    case_id: int,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    case = session.get(Case, case_id)
    if not case or case.org_id != user.org_id:
        raise HTTPException(404, "Case not found")

    iocs  = []
    mitre = []
    try:
        iocs  = json.loads(case.iocs or "[]")
        mitre = json.loads(case.mitre_techniques or "[]")
    except Exception:
        pass

    if not iocs and not mitre and not case.description:
        raise HTTPException(400, "Case needs IOCs, MITRE techniques, or a description before rules can be generated")

    prompt = _build_rules_prompt(case, iocs, mitre)
    result = await _generate_with_codestral(prompt)

    result["case_id"]     = case_id
    result["case_number"] = case.case_number
    result["model"]       = CODESTRAL if is_nvidia_available() else "groq-fallback"

    _audit(session, "rules_generated", "case", str(case.id), user.id, user.email,
           result.get("rule_name", ""))
    session.commit()

    return result
