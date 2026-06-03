import re, json
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from models import IOCCorrelation, User
from database import get_session
from routers.auth import get_current_user

router = APIRouter(prefix="/api/ioc", tags=["ioc"])

IOC_PATTERNS = {
    "ip": re.compile(r"\b(?:\d{1,3}\.){3}\d{1,3}\b"),
    "domain": re.compile(r"\b(?:[a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+(?:com|net|org|io|ru|tk|xyz|info|biz|co|uk|de|fr|cn|top|online|site|club|live|app|dev)\b"),
    "url": re.compile(r"https?://[^\s\"\'<>]+"),
    "email": re.compile(r"\b[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}\b"),
    "sha256": re.compile(r"\b[a-fA-F0-9]{64}\b"),
    "md5": re.compile(r"\b[a-fA-F0-9]{32}\b"),
    "sha1": re.compile(r"\b[a-fA-F0-9]{40}\b"),
}

DEFANG_MAP = [
    (re.compile(r"https?://"), lambda m: m.group().replace("://", "[://]")),
    (re.compile(r"\b(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\b"), lambda m: m.group().replace(".", ".")),
]


@router.post("/extract")
def extract_iocs(data: dict, _user: User = Depends(get_current_user)):
    text = data.get("text", "")
    found = []
    seen = set()
    for ioc_type, pattern in IOC_PATTERNS.items():
        for match in pattern.finditer(text):
            val = match.group()
            if val not in seen:
                seen.add(val)
                found.append({"ioc": val, "type": ioc_type})
    return {"iocs": found, "count": len(found)}


@router.get("/correlate/{ioc}")
def correlate_ioc(ioc: str, session: Session = Depends(get_session),
                  _user: User = Depends(get_current_user)):
    record = session.exec(select(IOCCorrelation).where(IOCCorrelation.ioc == ioc)).first()
    if not record:
        return {"ioc": ioc, "found": False, "case_count": 0, "cases": []}
    return {
        "ioc": ioc,
        "found": True,
        "ioc_type": record.ioc_type,
        "case_count": record.case_count,
        "case_ids": json.loads(record.case_ids or "[]"),
        "first_seen": record.first_seen,
        "last_seen": record.last_seen,
    }


@router.get("/correlations")
def list_correlations(session: Session = Depends(get_session),
                      _user: User = Depends(get_current_user)):
    return session.exec(
        select(IOCCorrelation).where(IOCCorrelation.case_count > 1).order_by(IOCCorrelation.case_count.desc())
    ).all()


@router.post("/defang")
def defang(data: dict, _user: User = Depends(get_current_user)):
    ioc = data.get("ioc", "")
    result = ioc.replace("http://", "hxxp://").replace("https://", "hxxps://").replace(".", "[.]")
    return {"original": ioc, "defanged": result}


@router.post("/refang")
def refang(data: dict, _user: User = Depends(get_current_user)):
    ioc = data.get("ioc", "")
    result = ioc.replace("hxxp://", "http://").replace("hxxps://", "https://").replace("[.]", ".")
    return {"original": ioc, "refanged": result}
