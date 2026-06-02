import os, json, re
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from models import VTHistory, AuditLog
from database import get_session
import httpx

router = APIRouter(prefix="/api/vt", tags=["virustotal"])

VT_BASE = "https://www.virustotal.com/api/v3"


def get_vt_key():
    k = os.getenv("VIRUSTOTAL_API_KEY")
    if not k:
        raise HTTPException(503, "VIRUSTOTAL_API_KEY not configured")
    return k


def detect_ioc_type(ioc: str) -> str:
    ioc = ioc.strip()
    ip_re = re.compile(r"^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$")
    hash_re = re.compile(r"^[a-fA-F0-9]{32,64}$")
    url_re = re.compile(r"^https?://")
    if ip_re.match(ioc):
        return "ip"
    if hash_re.match(ioc):
        return "hash"
    if url_re.match(ioc):
        return "url"
    return "domain"


def parse_vt_response(data: dict, ioc_type: str):
    attrs = data.get("data", {}).get("attributes", {})
    stats = attrs.get("last_analysis_stats", {})
    malicious = stats.get("malicious", 0)
    suspicious = stats.get("suspicious", 0)
    total = sum(stats.values()) if stats else 0

    if malicious > 5:
        verdict = "malicious"
    elif malicious > 0 or suspicious > 3:
        verdict = "suspicious"
    elif total > 0:
        verdict = "clean"
    else:
        verdict = "unknown"

    return {
        "verdict": verdict,
        "malicious_count": malicious,
        "suspicious_count": suspicious,
        "total_engines": total,
        "stats": stats,
        "tags": attrs.get("tags", []),
        "country": attrs.get("country", ""),
        "network": attrs.get("network", ""),
        "as_owner": attrs.get("as_owner", ""),
        "reputation": attrs.get("reputation", 0),
        "last_analysis_date": attrs.get("last_analysis_date", 0),
        "engines": {k: v for k, v in (attrs.get("last_analysis_results") or {}).items()
                    if v.get("category") in ("malicious", "suspicious")},
    }


async def do_vt_lookup(ioc: str, key: str) -> dict:
    ioc_type = detect_ioc_type(ioc)
    endpoints = {
        "ip": f"/ip_addresses/{ioc}",
        "domain": f"/domains/{ioc}",
        "hash": f"/files/{ioc}",
        "url": f"/urls/{httpx.URL(ioc).__str__()}"
    }
    if ioc_type == "url":
        import base64
        encoded = base64.urlsafe_b64encode(ioc.encode()).decode().rstrip("=")
        endpoint = f"/urls/{encoded}"
    else:
        endpoint = endpoints[ioc_type]

    async with httpx.AsyncClient(timeout=20) as client:
        resp = await client.get(
            VT_BASE + endpoint,
            headers={"x-apikey": key}
        )
        if resp.status_code == 404:
            return {"verdict": "unknown", "malicious_count": 0, "total_engines": 0, "raw": {}}
        resp.raise_for_status()
        raw = resp.json()

    parsed = parse_vt_response(raw, ioc_type)
    parsed["ioc_type"] = ioc_type
    parsed["ioc"] = ioc
    parsed["raw"] = raw
    return parsed


@router.post("/lookup")
async def lookup(data: dict, session: Session = Depends(get_session)):
    ioc = data.get("ioc", "").strip()
    if not ioc:
        raise HTTPException(400, "IOC required")

    key = get_vt_key()
    result = await do_vt_lookup(ioc, key)

    # Save to history
    record = VTHistory(
        ioc=ioc,
        ioc_type=result.get("ioc_type", ""),
        verdict=result["verdict"],
        malicious_count=result.get("malicious_count", 0),
        total_engines=result.get("total_engines", 0),
        full_result=json.dumps(result.get("raw", {})),
        notes=data.get("notes", ""),
    )
    session.add(record)
    log = AuditLog(action="vt_lookup", entity_type="ioc", entity_id=ioc)
    session.add(log)
    session.commit()
    session.refresh(record)
    return {"id": record.id, **result}


@router.get("/history")
def list_history(
    verdict: str = None,
    q: str = None,
    session: Session = Depends(get_session)
):
    query = select(VTHistory).order_by(VTHistory.looked_up_at.desc())
    results = session.exec(query).all()
    if verdict:
        results = [r for r in results if r.verdict == verdict]
    if q:
        results = [r for r in results if q.lower() in r.ioc.lower()]
    return results


@router.get("/history/{record_id}")
def get_history(record_id: int, session: Session = Depends(get_session)):
    r = session.get(VTHistory, record_id)
    if not r:
        raise HTTPException(404)
    return r


@router.delete("/history/{record_id}")
def delete_history(record_id: int, session: Session = Depends(get_session)):
    r = session.get(VTHistory, record_id)
    if not r:
        raise HTTPException(404)
    session.delete(r)
    session.commit()
    return {"ok": True}


@router.post("/bulk")
async def bulk_lookup(data: dict, session: Session = Depends(get_session)):
    iocs = data.get("iocs", [])
    if not iocs:
        raise HTTPException(400, "No IOCs provided")
    key = get_vt_key()
    results = []
    for ioc in iocs[:20]:
        try:
            result = await do_vt_lookup(ioc, key)
            record = VTHistory(
                ioc=ioc,
                ioc_type=result.get("ioc_type", ""),
                verdict=result["verdict"],
                malicious_count=result.get("malicious_count", 0),
                total_engines=result.get("total_engines", 0),
                full_result=json.dumps(result.get("raw", {})),
            )
            session.add(record)
            results.append({"ioc": ioc, **result})
        except Exception as e:
            results.append({"ioc": ioc, "verdict": "error", "error": str(e)})
    session.commit()
    return results
