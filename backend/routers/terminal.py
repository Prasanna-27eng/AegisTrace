import os, json
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from sqlalchemy import or_ as _or
from models import ToolRun, AuditLog, User, Case
from database import get_session
from ai_router import call_ai_json
from routers.auth import get_current_user

router = APIRouter(prefix="/api/terminal", tags=["terminal"])


def _org_case_ids(session: Session, user: User) -> set:
    """Case IDs visible to the caller's org (for scoping nullable case_id rows)."""
    return set(session.exec(select(Case.id).where(Case.org_id == user.org_id)).all())

TOOLS = [
    "nmap", "whois", "dig", "host", "curl", "netstat", "ss", "ps",
    "lsof", "tcpdump", "tshark", "volatility", "strings", "file",
    "xxd", "objdump", "strace", "ltrace", "custom"
]


@router.post("/analyse")
async def analyse_terminal(data: dict, session: Session = Depends(get_session),
                            _user: User = Depends(get_current_user)):
    case_id = data.get("case_id")
    tool_name = data.get("tool_name", "custom")
    command = data.get("command", "")
    output = data.get("output", "")

    if not output:
        raise HTTPException(400, "Output required")

    if case_id is not None:
        case = session.get(Case, case_id)
        if not case or case.org_id != _user.org_id:
            raise HTTPException(404, "Case not found")

    # Use extraction model (gemma2-9b-it) — fastest for structured parsing
    prompt = f"""Tool: {tool_name}
Command: {command}
Output:
{output[:3000]}

Respond ONLY with valid JSON:
{{
  "key_findings": ["finding 1", "finding 2"],
  "iocs_found": [{{"ioc": "value", "type": "ip|domain|hash|url|email"}}],
  "severity_indicators": ["indicator 1"],
  "mitre_techniques": [{{"id": "T####", "name": "...", "tactic": "..."}}],
  "summary": "2-3 sentence summary of what this output reveals",
  "recommended_actions": ["action 1", "action 2"]
}}"""
    ai_parsed = call_ai_json("extraction", prompt, temperature=0.15, max_tokens=900)
    if ai_parsed.get("parse_error"):
        ai_parsed = {"key_findings": [], "iocs_found": [], "severity_indicators": [],
                     "mitre_techniques": [], "summary": "AI parsing unavailable", "recommended_actions": []}

    run = ToolRun(
        case_id=case_id,
        tool_name=tool_name,
        command=command,
        output=output,
        ai_parsed_result=json.dumps(ai_parsed),
    )
    session.add(run)
    log = AuditLog(action="terminal_analysed", entity_type="tool_run", entity_id=tool_name)
    session.add(log)
    session.commit()
    session.refresh(run)
    return {"id": run.id, "ai_parsed": ai_parsed, "created_at": run.created_at}


@router.get("/history")
def list_runs(case_id: int = None, session: Session = Depends(get_session),
              _user: User = Depends(get_current_user)):
    if case_id:
        case = session.get(Case, case_id)
        if not case or case.org_id != _user.org_id:
            raise HTTPException(404, "Case not found")
        query = select(ToolRun).where(ToolRun.case_id == case_id)
    else:
        org_case_ids = _org_case_ids(session, _user)
        query = select(ToolRun).where(
            _or(ToolRun.case_id == None, ToolRun.case_id.in_(org_case_ids))  # noqa: E711
        )
    return session.exec(query.order_by(ToolRun.created_at.desc())).all()


@router.get("/tools")
def list_tools(_user: User = Depends(get_current_user)):
    return {"tools": TOOLS}
