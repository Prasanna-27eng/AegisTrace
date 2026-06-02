import re, json, os
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from models import EmailAnalysisRecord, AuditLog
from database import get_session
from ai_router import call_ai_json

router = APIRouter(prefix="/api/email", tags=["email"])

IOC_PATTERNS = {
    "ip": re.compile(r"\b(?:\d{1,3}\.){3}\d{1,3}\b"),
    "domain": re.compile(r"\b(?:[a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+(?:com|net|org|io|ru|tk|xyz|info|biz|co|uk|de|fr|cn|top|online|site|club|live|app|dev)\b"),
    "url": re.compile(r"https?://[^\s\"\'<>]+"),
    "email_addr": re.compile(r"\b[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}\b"),
    "sha256": re.compile(r"\b[a-fA-F0-9]{64}\b"),
    "md5": re.compile(r"\b[a-fA-F0-9]{32}\b"),
}


def extract_iocs_from_text(text: str) -> list:
    found = []
    seen = set()
    for ioc_type, pattern in IOC_PATTERNS.items():
        for match in pattern.finditer(text):
            val = match.group()
            if val not in seen:
                seen.add(val)
                found.append({"ioc": val, "type": ioc_type})
    return found


def parse_received_chain(headers: str) -> list:
    hops = []
    lines = headers.split("\n")
    current = ""
    for line in lines:
        if line.lower().startswith("received:"):
            if current:
                hops.append(current.strip())
            current = line
        elif current and line.startswith(" "):
            current += " " + line.strip()
    if current:
        hops.append(current.strip())
    return [h for h in hops if h]


def check_auth(headers: str):
    lower = headers.lower()
    spf = "pass" if "spf=pass" in lower else ("fail" if "spf=fail" in lower else "none")
    dkim = "pass" if "dkim=pass" in lower else ("fail" if "dkim=fail" in lower else "none")
    dmarc = "pass" if "dmarc=pass" in lower else ("fail" if "dmarc=fail" in lower else "none")
    return spf, dkim, dmarc


def extract_sender_ip(headers: str) -> str:
    ip_re = re.compile(r"Received:.*?\[(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\]", re.IGNORECASE)
    matches = ip_re.findall(headers)
    private_prefixes = ("10.", "192.168.", "172.", "127.")
    for ip in reversed(matches):
        if not any(ip.startswith(p) for p in private_prefixes):
            return ip
    return matches[0] if matches else ""


def extract_field(headers: str, field: str) -> str:
    pattern = re.compile(rf"^{field}:\s*(.+?)(?=\n\S|\Z)", re.MULTILINE | re.IGNORECASE | re.DOTALL)
    m = pattern.search(headers)
    return m.group(1).strip() if m else ""


@router.post("/analyse")
async def analyse_email(data: dict, session: Session = Depends(get_session)):
    raw_headers = data.get("headers", "")
    raw_body = data.get("body", "")
    case_id = data.get("case_id")
    full_text = raw_headers + "\n\n" + raw_body

    sender_ip = extract_sender_ip(raw_headers)
    sender_domain = ""
    from_field = extract_field(raw_headers, "From")
    dm = re.search(r"@([\w.\-]+)", from_field)
    if dm:
        sender_domain = dm.group(1)

    spf, dkim, dmarc = check_auth(raw_headers)
    hops = parse_received_chain(raw_headers)
    iocs = extract_iocs_from_text(full_text)

    # AI analysis — uses classification model (mixtral) for best phishing detection
    ai_verdict = "Suspicious"
    ai_analysis = ""
    try:
        prompt = f"""Analyse this email for security threats. Respond ONLY with valid JSON.

From: {from_field}
Subject: {extract_field(raw_headers, 'Subject')}
Sender IP: {sender_ip}
SPF: {spf} | DKIM: {dkim} | DMARC: {dmarc}
Routing hops: {len(hops)}
IOCs found: {len(iocs)}
Body preview: {raw_body[:800]}

JSON format:
{{
  "verdict": "Phishing|BEC|Spam|Legitimate|Suspicious",
  "confidence": <0-100>,
  "analysis": "detailed technical analysis",
  "indicators": ["indicator 1", "indicator 2"],
  "mitre_techniques": ["T####"],
  "impersonation_detected": true/false,
  "urgency_detected": true/false,
  "brand_abuse": true/false
}}"""
        parsed = call_ai_json("classification", prompt, temperature=0.2, max_tokens=800)
        ai_verdict = parsed.get("verdict", "Suspicious")
        ai_analysis = json.dumps(parsed)
    except Exception:
        ai_analysis = json.dumps({"verdict": "Suspicious", "confidence": 50, "analysis": "AI analysis unavailable"})

    record = EmailAnalysisRecord(
        raw_headers=raw_headers,
        raw_body=raw_body,
        sender_ip=sender_ip,
        sender_domain=sender_domain,
        spf_result=spf,
        dkim_result=dkim,
        dmarc_result=dmarc,
        routing_hops=json.dumps(hops),
        extracted_iocs=json.dumps(iocs),
        ai_verdict=ai_verdict,
        ai_analysis=ai_analysis,
        case_id=case_id,
    )
    session.add(record)
    log = AuditLog(action="email_analysed", entity_type="email", entity_id=sender_ip)
    session.add(log)
    session.commit()
    session.refresh(record)
    return record


@router.get("/history")
def list_history(session: Session = Depends(get_session)):
    return session.exec(select(EmailAnalysisRecord).order_by(EmailAnalysisRecord.created_at.desc())).all()


@router.get("/history/{record_id}")
def get_history(record_id: int, session: Session = Depends(get_session)):
    r = session.get(EmailAnalysisRecord, record_id)
    if not r:
        raise HTTPException(404)
    return r
