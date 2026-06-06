"""
AegisTrace Terminal Lab Router — v3.0
──────────────────────────────────────
Standalone Linux-style analysis workspace.

Simulated mode: command interpreter returns realistic analyst output.
Sandbox mode: (stub) whitelisted commands in a controlled container.

Endpoints:
  GET  /api/terminal/sessions
  POST /api/terminal/sessions
  GET  /api/terminal/sessions/{id}
  DELETE /api/terminal/sessions/{id}
  POST /api/terminal/sessions/{id}/run
  POST /api/terminal/sessions/{id}/save-to-case
  GET  /api/terminal/tools
  POST /api/terminal/parse-output
  POST /api/terminal/extract-iocs
"""
import json, re, hashlib, random
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from models import TerminalSession, TerminalCommand, AuditLog, User, Case, TimelineEvent
from database import get_session
from ai_router import call_ai_json
from routers.auth import get_current_user

router = APIRouter(prefix="/api/terminal", tags=["terminal-lab"])

# ── Supported tools ──────────────────────────────────────────────────────────
TOOLS = [
    {"name": "pwd",         "category": "filesystem",  "desc": "Print working directory"},
    {"name": "ls",          "category": "filesystem",  "desc": "List directory contents"},
    {"name": "cat",         "category": "filesystem",  "desc": "Display file contents"},
    {"name": "head",        "category": "filesystem",  "desc": "Show first N lines of file"},
    {"name": "tail",        "category": "filesystem",  "desc": "Show last N lines of file"},
    {"name": "grep",        "category": "text",        "desc": "Search for patterns in text"},
    {"name": "strings",     "category": "forensics",   "desc": "Extract printable strings from binary"},
    {"name": "file",        "category": "forensics",   "desc": "Determine file type"},
    {"name": "sha256sum",   "category": "hashing",     "desc": "Compute SHA-256 hash"},
    {"name": "md5sum",      "category": "hashing",     "desc": "Compute MD5 hash"},
    {"name": "whois",       "category": "recon",       "desc": "Query WHOIS database"},
    {"name": "dig",         "category": "dns",         "desc": "DNS lookup utility"},
    {"name": "nslookup",    "category": "dns",         "desc": "DNS name server query"},
    {"name": "curl",        "category": "http",        "desc": "Transfer data from URLs"},
    {"name": "netstat",     "category": "network",     "desc": "Network statistics"},
    {"name": "ss",          "category": "network",     "desc": "Socket statistics"},
    {"name": "ps",          "category": "process",     "desc": "Process status"},
    {"name": "nmap",        "category": "recon",       "desc": "Network port scanner"},
    {"name": "ioc-extract", "category": "analysis",    "desc": "Extract IOCs from text"},
    {"name": "defang",      "category": "analysis",    "desc": "Defang IPs and domains"},
    {"name": "refang",      "category": "analysis",    "desc": "Refang defanged indicators"},
    {"name": "yara-match",  "category": "malware",     "desc": "Match YARA rules against data"},
    {"name": "log-parse",   "category": "analysis",    "desc": "Parse and structure log data"},
    {"name": "custom",      "category": "general",     "desc": "Custom command / paste output"},
]

TOOL_NAMES = {t["name"] for t in TOOLS}

# ── Simulated command output ─────────────────────────────────────────────────

def _simulate(command: str, tool_name: str) -> str:
    cmd = command.strip().lower()
    parts = cmd.split()
    base = parts[0] if parts else tool_name

    if base == "pwd":
        return "/home/analyst/investigations"

    if base == "ls":
        return ("total 48\n"
                "drwxr-xr-x  2 analyst analyst 4096 Jun  4 09:12 .\n"
                "drwxr-xr-x 18 analyst analyst 4096 Jun  4 08:44 ..\n"
                "-rw-r--r--  1 analyst analyst 8421 Jun  4 09:11 sample.exe\n"
                "-rw-r--r--  1 analyst analyst 2048 Jun  4 09:10 auth.log\n"
                "-rw-r--r--  1 analyst analyst 1024 Jun  4 09:08 network.pcap\n"
                "-rw-r--r--  1 analyst analyst  512 Jun  4 09:05 iocs.txt")

    if base == "ps":
        return ("  PID TTY          TIME CMD\n"
                "  932 ?        00:00:01 sshd\n"
                " 1204 ?        00:00:00 cron\n"
                " 2819 pts/0    00:00:00 bash\n"
                " 2847 pts/0    00:00:00 ps\n"
                " 8821 ?        00:00:12 python3  [aegistrace_agent]\n"
                " 9012 ?        00:00:00 nc -lnvp 4444  [SUSPICIOUS]")

    if base == "netstat" or base == "ss":
        return ("Active Internet connections (only servers)\n"
                "Proto Recv-Q Send-Q Local Address     Foreign Address  State\n"
                "tcp        0      0 0.0.0.0:22        0.0.0.0:*        LISTEN\n"
                "tcp        0      0 0.0.0.0:4444      0.0.0.0:*        LISTEN   [SUSPICIOUS]\n"
                "tcp        0    256 192.168.1.5:443   185.220.101.34:443  ESTABLISHED\n"
                "udp        0      0 0.0.0.0:53        0.0.0.0:*")

    if base == "dig" or base == "nslookup":
        target = parts[-1] if len(parts) > 1 else "example.com"
        return (f"; <<>> DiG 9.16.1 <<>> {target}\n"
                f";; QUESTION SECTION:\n;{target}.  IN  A\n\n"
                f";; ANSWER SECTION:\n"
                f"{target}.  300  IN  A  185.220.101.34\n"
                f"{target}.  300  IN  A  185.220.101.35\n\n"
                f";; Query time: 23 msec\n;; SERVER: 8.8.8.8#53\n;; WHEN: Wed Jun  4 09:15:22 UTC 2026")

    if base == "whois":
        target = parts[-1] if len(parts) > 1 else "example.com"
        return (f"Domain Name: {target.upper()}\n"
                f"Registry Domain ID: 2336799_DOMAIN_COM-VRSN\n"
                f"Registrar: NameCheap, Inc.\n"
                f"Creation Date: 2023-01-15\n"
                f"Updated Date: 2025-11-02\n"
                f"Registrar Abuse Contact: abuse@namecheap.com\n"
                f"Name Server: NS1.SUSPICIOUSDNS.COM\n"
                f"DNSSEC: unsigned\n"
                f"Registrant Country: RU")

    if base == "sha256sum":
        target = parts[-1] if len(parts) > 1 else "sample.exe"
        h = hashlib.sha256(target.encode()).hexdigest()
        return f"{h}  {target}"

    if base == "md5sum":
        target = parts[-1] if len(parts) > 1 else "sample.exe"
        h = hashlib.md5(target.encode()).hexdigest()
        return f"{h}  {target}"

    if base == "strings":
        return ("cmd.exe\nCreateRemoteThread\nVirtualAllocEx\nWriteProcessMemory\n"
                "KERNEL32.DLL\nntdll.dll\nhttp://185.220.101.34/c2/beacon\n"
                "Mozilla/5.0 (compatible; MSIE 10.0)\n"
                "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run\n"
                "AdobeUpdate\nC:\\Users\\Public\\update.exe\n"
                "base64_encoded_payload_follows:\n"
                "TVqQAAMAAAAEAAAA//8AALgAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA")

    if base == "file":
        target = parts[-1] if len(parts) > 1 else "sample.exe"
        return f"{target}: PE32+ executable (GUI) x86-64, for MS Windows"

    if base == "curl":
        return ("HTTP/1.1 200 OK\nServer: nginx/1.18.0\nContent-Type: text/html\n"
                "X-Powered-By: PHP/7.4.3\nSet-Cookie: session=abc123; HttpOnly\n"
                "Content-Length: 4821\n\n<!DOCTYPE html>...")

    if base in ("ioc-extract", "ioc_extract"):
        return ("Extracted IOCs:\n"
                "IPs:      185.220.101.34, 10.0.0.15\n"
                "Domains:  evil-c2.example.com, update-service[.]net\n"
                "Hashes:   4a7f2b3cd91e8f05 (MD5), a3b2c1d0e9f87654321 (SHA256)\n"
                "URLs:     http://185.220.101.34/c2/beacon\n"
                "Emails:   attacker@protonmail.com\n"
                "Ports:    4444, 443")

    if base == "defang":
        target = parts[-1] if len(parts) > 1 else "185.220.101.34"
        defanged = target.replace(".", "[.]").replace("http://", "hxxp://").replace("https://", "hxxps://")
        return f"Defanged: {defanged}"

    if base == "refang":
        target = parts[-1] if len(parts) > 1 else "185[.]220[.]101[.]34"
        refanged = target.replace("[.]", ".").replace("hxxp://", "http://").replace("hxxps://", "https://")
        return f"Refanged: {refanged}"

    if base == "nmap":
        target = parts[-1] if len(parts) > 1 else "192.168.1.1"
        return (f"Starting Nmap 7.94 ( https://nmap.org )\n"
                f"Nmap scan report for {target}\n"
                f"Host is up (0.0012s latency).\n\n"
                f"PORT     STATE  SERVICE  VERSION\n"
                f"22/tcp   open   ssh      OpenSSH 8.4\n"
                f"80/tcp   open   http     nginx 1.18.0\n"
                f"443/tcp  open   ssl/http nginx 1.18.0\n"
                f"4444/tcp open   krb524?  [SUSPICIOUS — common RAT port]\n\n"
                f"Nmap done: 1 IP address (1 host up) scanned in 2.14 seconds")

    if base in ("log-parse", "log_parse"):
        return ("Parsed 847 log lines:\n"
                "  ✗ 23 FAILED authentication attempts from 185.220.101.34\n"
                "  ✓ 1  SUCCESS after failures (brute force pattern)\n"
                "  ⚠  3  Privilege escalation events (sudo -i)\n"
                "  ⚠  1  Cron job added: * * * * * /tmp/update.sh\n"
                "  ⚠  2  Outbound connections to 185.220.101.34:4444\n\n"
                "Severity: HIGH\nMITRE: T1110 Brute Force, T1053 Scheduled Task")

    return f"aegistrace@lab:~$ {command}\n[Simulated mode — output for '{base}' not available]\nUse custom mode to paste real tool output for AI analysis."


def _extract_iocs_from_output(text: str) -> list:
    iocs = []
    ip_re = re.compile(r'\b(?:\d{1,3}\.){3}\d{1,3}\b')
    domain_re = re.compile(r'\b(?:[a-z0-9-]+\.)+(?:com|net|org|io|ru|xyz|info|biz|co)\b', re.I)
    hash_re = re.compile(r'\b[0-9a-f]{32,64}\b', re.I)
    url_re = re.compile(r'https?://[^\s<>"]+', re.I)

    for m in ip_re.findall(text):
        parts = m.split('.')
        if all(0 <= int(p) <= 255 for p in parts) and m not in ('0.0.0.0', '127.0.0.1', '255.255.255.255'):
            iocs.append({"ioc": m, "type": "ip"})
    for m in domain_re.findall(text):
        if len(m) > 4:
            iocs.append({"ioc": m, "type": "domain"})
    for m in hash_re.findall(text):
        if len(m) in (32, 40, 64):
            iocs.append({"ioc": m, "type": "hash"})
    for m in url_re.findall(text):
        iocs.append({"ioc": m, "type": "url"})

    # Deduplicate
    seen = set()
    result = []
    for i in iocs:
        key = i["ioc"].lower()
        if key not in seen:
            seen.add(key)
            result.append(i)
    return result[:30]


# ── API Endpoints ─────────────────────────────────────────────────────────────

@router.get("/tools")
def list_tools(_user: User = Depends(get_current_user)):
    return TOOLS


@router.get("/sessions")
def list_sessions(
    case_id: Optional[int] = None,
    session: Session = Depends(get_session),
    _user: User = Depends(get_current_user),
):
    q = select(TerminalSession).order_by(TerminalSession.created_at.desc())
    if case_id:
        q = q.where(TerminalSession.case_id == case_id)
    sessions = session.exec(q).all()
    result = []
    for s in sessions:
        cmds = session.exec(select(TerminalCommand).where(TerminalCommand.session_id == s.id)).all()
        result.append({
            **s.dict(),
            "command_count": len(cmds),
            "last_command": cmds[-1].command if cmds else None,
        })
    return result


@router.post("/sessions")
def create_session(
    data: dict,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    ts = TerminalSession(
        session_name=data.get("session_name", f"Session {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}"),
        case_id=data.get("case_id"),
        mode=data.get("mode", "simulated"),
        created_by_id=user.id,   # ownership tracking
    )
    session.add(ts)
    session.add(AuditLog(action="terminal_session_created", entity_type="terminal_session",
                         user_email=user.email, user_id=user.id))
    session.commit()
    session.refresh(ts)
    return ts


@router.get("/sessions/{session_id}")
def get_session_detail(
    session_id: int,
    db: Session = Depends(get_session),
    _user: User = Depends(get_current_user),
):
    ts = db.get(TerminalSession, session_id)
    if not ts or (ts.created_by_id and ts.created_by_id != _user.id):
        raise HTTPException(404, "Session not found")
    commands = db.exec(
        select(TerminalCommand).where(TerminalCommand.session_id == session_id)
        .order_by(TerminalCommand.created_at.asc())
    ).all()
    return {**ts.dict(), "commands": [c.dict() for c in commands]}


@router.post("/sessions/{session_id}/run")
def run_command(
    session_id: int,
    data: dict,
    db: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    ts = db.get(TerminalSession, session_id)
    if not ts or (ts.created_by_id and ts.created_by_id != user.id):
        raise HTTPException(404, "Session not found")

    command = (data.get("command") or "").strip()
    tool_name = data.get("tool_name", "custom")
    mode = data.get("mode", ts.mode)
    user_output = data.get("output", "")  # pre-pasted output (custom mode)

    # Generate or use provided output
    if user_output:
        raw_output = user_output
    else:
        raw_output = _simulate(command, tool_name)

    # Auto-extract IOCs
    iocs = _extract_iocs_from_output(raw_output)

    # AI parse if output is substantial
    ai_summary = ""
    parsed_output = {}
    if len(raw_output) > 80:
        prompt = f"""Terminal command: {command}
Tool: {tool_name}
Output:
{raw_output[:2500]}

Respond ONLY with valid JSON:
{{
  "key_findings": ["finding 1"],
  "iocs_found": [{{"ioc":"value","type":"ip|domain|hash|url"}}],
  "severity_indicators": ["indicator"],
  "mitre_techniques": [{{"id":"T####","name":"...","tactic":"..."}}],
  "summary": "2-3 sentence analyst summary",
  "recommended_actions": ["action 1"]
}}"""
        parsed_output = call_ai_json("extraction", prompt, temperature=0.15, max_tokens=700)
        ai_summary = parsed_output.get("summary", "")
        if parsed_output.get("iocs_found"):
            for ioc_item in parsed_output["iocs_found"]:
                if {"ioc": ioc_item.get("ioc"), "type": ioc_item.get("type")} not in iocs:
                    iocs.append({"ioc": ioc_item.get("ioc", ""), "type": ioc_item.get("type", "")})

    cmd = TerminalCommand(
        session_id=session_id,
        case_id=ts.case_id,
        command=command,
        tool_name=tool_name,
        mode=mode,
        status="completed",
        raw_output=raw_output,
        parsed_output=json.dumps(parsed_output),
        extracted_iocs=json.dumps(iocs),
        ai_summary=ai_summary,
        completed_at=datetime.utcnow(),
    )
    db.add(cmd)
    db.add(AuditLog(action="terminal_command_run", entity_type="terminal_command",
                    entity_id=tool_name, user_id=user.id, user_email=user.email))
    db.commit()
    db.refresh(cmd)
    return {
        **cmd.dict(),
        "parsed_output": parsed_output,
        "extracted_iocs": iocs,
    }


@router.post("/sessions/{session_id}/save-to-case")
def save_to_case(
    session_id: int,
    data: dict,
    db: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    ts = db.get(TerminalSession, session_id)
    if not ts or (ts.created_by_id and ts.created_by_id != user.id):
        raise HTTPException(404, "Session not found")
    case_id = data.get("case_id") or ts.case_id
    if not case_id:
        raise HTTPException(400, "case_id required")

    case = db.get(Case, case_id)
    if not case or case.org_id != user.org_id:
        raise HTTPException(404, "Case not found")

    # Get all commands for this session
    commands = db.exec(
        select(TerminalCommand).where(TerminalCommand.session_id == session_id)
        .order_by(TerminalCommand.created_at.asc())
    ).all()

    # Append to case findings
    summary_lines = [f"\n\n## Terminal Lab Session — {ts.session_name}"]
    for cmd in commands:
        summary_lines.append(f"\n**Command:** `{cmd.command}`")
        parsed = {}
        try:
            parsed = json.loads(cmd.parsed_output or "{}")
        except Exception:
            pass
        if parsed.get("summary"):
            summary_lines.append(f"**AI Summary:** {parsed['summary']}")
        if parsed.get("key_findings"):
            summary_lines.append("**Findings:** " + " · ".join(parsed["key_findings"][:3]))

    case.findings = (case.findings or "") + "\n".join(summary_lines)
    case.updated_at = datetime.utcnow()
    ts.case_id = case_id
    db.add(case)
    db.add(ts)

    # Timeline event
    db.add(TimelineEvent(
        case_id=case_id,
        event_type="terminal_session",
        description=f"Terminal Lab session '{ts.session_name}' saved — {len(commands)} commands run",
    ))
    db.commit()
    return {"ok": True, "case_id": case_id, "commands_saved": len(commands)}


@router.delete("/sessions/{session_id}")
def delete_session(
    session_id: int,
    db: Session = Depends(get_session),
    _user: User = Depends(get_current_user),
):
    ts = db.get(TerminalSession, session_id)
    if not ts or (ts.created_by_id and ts.created_by_id != _user.id):
        raise HTTPException(404, "Session not found")
    # Delete commands first
    commands = db.exec(select(TerminalCommand).where(TerminalCommand.session_id == session_id)).all()
    for cmd in commands:
        db.delete(cmd)
    db.delete(ts)
    db.commit()
    return {"ok": True}


@router.post("/parse-output")
def parse_output(
    data: dict,
    _user: User = Depends(get_current_user),
):
    output = (data.get("output") or "").strip()
    tool = data.get("tool_name", "custom")
    command = data.get("command", "")
    if not output:
        raise HTTPException(400, "output required")

    iocs = _extract_iocs_from_output(output)
    prompt = f"""Tool: {tool}
Command: {command}
Output:
{output[:3000]}

Return ONLY valid JSON:
{{
  "key_findings": [],
  "iocs_found": [],
  "severity_indicators": [],
  "mitre_techniques": [],
  "summary": "",
  "recommended_actions": []
}}"""
    parsed = call_ai_json("extraction", prompt, temperature=0.1, max_tokens=800)
    return {"parsed": parsed, "extracted_iocs": iocs}


@router.post("/extract-iocs")
def extract_iocs_endpoint(
    data: dict,
    _user: User = Depends(get_current_user),
):
    text = (data.get("text") or "").strip()
    if not text:
        raise HTTPException(400, "text required")
    return {"iocs": _extract_iocs_from_output(text)}
