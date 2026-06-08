"""
AegisTrace Vision Analysis — Phase 8
──────────────────────────────────────
Llama 3.2 Vision 11B screenshot analysis.
Analysts upload images (malware UIs, phishing pages, terminal output,
network diagrams) and the model returns a structured security verdict.

Endpoints:
  POST /api/vision/analyze          — analyze image, no case attachment
  POST /api/vision/cases/{id}/analyze — analyze image + attach findings to case
"""

import base64
import json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlmodel import Session

from database import get_session
from routers.auth import get_current_user, _audit
from models import User, Case
from nvidia_client import nvidia_vision, is_nvidia_available

router = APIRouter(tags=["vision"])

ALLOWED_MIME = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_SIZE_MB   = 5

_VISION_PROMPT = """You are a cybersecurity analyst examining this screenshot. Analyse it for security threats.

Return ONLY valid JSON:
{
  "verdict": "Malicious | Suspicious | Phishing | Malware | Benign | Unknown",
  "confidence": <0-100>,
  "threat_type": "brief threat category or null",
  "iocs_detected": [{"value":"...","type":"ip|domain|hash|url|filename|registry_key"}],
  "mitre_techniques": [{"id":"T####","name":"...","tactic":"..."}],
  "key_indicators": ["specific observable indicator 1","indicator 2"],
  "summary": "2-3 sentence technical analysis of what this image shows",
  "recommended_actions": ["action 1","action 2"]
}"""


def _encode_image(data: bytes, content_type: str) -> str:
    return base64.b64encode(data).decode("utf-8")


async def _analyse_image(image_data: bytes, content_type: str, extra_context: str = "") -> dict:
    if not is_nvidia_available():
        raise HTTPException(503, "NVIDIA_API_KEY not configured — vision analysis unavailable")

    b64 = _encode_image(image_data, content_type)
    prompt = _VISION_PROMPT
    if extra_context:
        prompt = f"Case context: {extra_context[:300]}\n\n{_VISION_PROMPT}"

    raw = nvidia_vision(b64, prompt, mime=content_type)
    if not raw:
        raise HTTPException(502, "Vision model returned no response")

    try:
        start  = raw.find("{")
        end    = raw.rfind("}") + 1
        result = json.loads(raw[start:end])
    except Exception:
        result = {
            "verdict":            "Unknown",
            "confidence":         0,
            "summary":            raw[:500],
            "iocs_detected":      [],
            "mitre_techniques":   [],
            "key_indicators":     [],
            "recommended_actions": [],
        }

    result["analyzed_at"] = datetime.utcnow().isoformat()
    result["model"]       = "meta/llama-3.2-11b-vision-instruct"
    return result


@router.post("/api/vision/analyze")
async def analyze_image(
    file: UploadFile = File(...),
    context: str = Form(default=""),
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if file.content_type not in ALLOWED_MIME:
        raise HTTPException(400, f"Unsupported file type. Allowed: {', '.join(ALLOWED_MIME)}")

    data = await file.read()
    if len(data) > MAX_SIZE_MB * 1024 * 1024:
        raise HTTPException(400, f"Image too large. Max {MAX_SIZE_MB}MB.")

    return await _analyse_image(data, file.content_type, context)


@router.post("/api/vision/cases/{case_id}/analyze")
async def analyze_image_for_case(
    case_id: int,
    file: UploadFile = File(...),
    context: str = Form(default=""),
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    case = session.get(Case, case_id)
    if not case or case.org_id != user.org_id:
        raise HTTPException(404, "Case not found")

    if file.content_type not in ALLOWED_MIME:
        raise HTTPException(400, f"Unsupported file type. Allowed: {', '.join(ALLOWED_MIME)}")

    data = await file.read()
    if len(data) > MAX_SIZE_MB * 1024 * 1024:
        raise HTTPException(400, f"Image too large. Max {MAX_SIZE_MB}MB.")

    extra = f"Case {case.case_number}: {case.title}. {context}"
    result = await _analyse_image(data, file.content_type, extra)

    # Append vision findings to case findings
    if result.get("verdict") not in ("Benign", "Unknown"):
        findings_append = f"\n\n[Vision Analysis — {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}]\n"
        findings_append += f"Verdict: {result['verdict']} ({result['confidence']}% confidence)\n"
        findings_append += f"Summary: {result['summary']}\n"
        if result.get("iocs_detected"):
            findings_append += f"IOCs detected: {', '.join(i['value'] for i in result['iocs_detected'][:5])}"
        case.findings  = (case.findings or "") + findings_append
        case.updated_at = datetime.utcnow()
        session.add(case)
        _audit(session, "vision_analysis", "case", str(case.id), user.id, user.email, result["verdict"])
        session.commit()

    result["case_id"] = case_id
    return result
