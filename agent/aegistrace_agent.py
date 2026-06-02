#!/usr/bin/env python3
"""
AegisTrace Endpoint Agent v1.0
────────────────────────────────────────────────────────────────
Silently collects local logs and ships them to your AegisTrace instance.
Zero external dependencies — uses only Python 3.8+ standard library.

QUICK SETUP:
  1. Edit the CONFIG section below (URL + key)
  2. Run:  python3 aegistrace_agent.py
  3. Logs appear in AegisTrace at /app/endpoints

INSTALL AS SERVICE:
  Linux (systemd):   sudo python3 aegistrace_agent.py --install-service
  Windows:           Run as Scheduled Task (see README below)
  Mac:               python3 aegistrace_agent.py --install-launchd

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""

# ══ CONFIG — EDIT THESE ══════════════════════════════════════════════════════
AEGISTRACE_URL   = "https://aegistrace-7qvn.onrender.com"   # Your AegisTrace URL
INGEST_KEY       = "REPLACE_WITH_YOUR_INGEST_KEY"           # Get from Admin → System in AegisTrace
INTERVAL_SECONDS = 300          # Ship every 5 minutes
MAX_LINES        = 500          # Max log lines per file per run
AUTO_ANALYSE     = True         # AI analysis on arrival
AUTO_CASE        = True         # Create case if threat score > threshold
THREAT_THRESHOLD = 60           # Score 0–100; above this creates a case
AGENT_VERSION    = "1.0"
TAGS             = []           # e.g. ["production", "finance-server"]
# ═════════════════════════════════════════════════════════════════════════════

import os, sys, json, time, socket, platform, subprocess, logging
from datetime import datetime
from pathlib import Path
from urllib import request, error
from urllib.parse import urlencode

# ── Logging ──────────────────────────────────────────────────────────────────
LOG_FILE = Path(__file__).parent / "aegistrace_agent.log"
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(LOG_FILE),
        logging.StreamHandler(sys.stdout),
    ],
)
log = logging.getLogger("aegistrace_agent")

# ── State tracking (remembers position in log files) ─────────────────────────
STATE_FILE = Path(__file__).parent / "aegistrace_agent_state.json"

def load_state() -> dict:
    try:
        return json.loads(STATE_FILE.read_text()) if STATE_FILE.exists() else {}
    except Exception:
        return {}

def save_state(state: dict):
    try:
        STATE_FILE.write_text(json.dumps(state, indent=2))
    except Exception:
        pass

# ── Platform detection ────────────────────────────────────────────────────────
OS = platform.system().lower()   # windows / linux / darwin

def get_hostname() -> str:
    return socket.gethostname()

def get_ip() -> str:
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return ""

def get_os_type() -> str:
    return {"windows": "windows", "linux": "linux", "darwin": "mac"}.get(OS, "unknown")


# ══ LOG COLLECTORS ══════════════════════════════════════════════════════════

def read_file_tail(path: str, max_lines: int, state: dict) -> tuple[str, int]:
    """Read up to max_lines new lines from a file since last position."""
    try:
        p = Path(path)
        if not p.exists():
            return "", 0
        size = p.stat().st_size
        last_pos = state.get(path, 0)
        if size < last_pos:
            last_pos = 0  # file was rotated
        with open(p, "r", errors="replace") as f:
            f.seek(last_pos)
            lines = []
            for line in f:
                lines.append(line)
                if len(lines) >= max_lines:
                    break
            new_pos = f.tell()
        return "".join(lines), new_pos
    except Exception as e:
        log.warning(f"Cannot read {path}: {e}")
        return "", state.get(path, 0)


def collect_linux(state: dict) -> list[dict]:
    """Collect logs from Linux system."""
    batches = []

    # auth.log / secure
    for path in ["/var/log/auth.log", "/var/log/secure"]:
        content, new_pos = read_file_tail(path, MAX_LINES, state)
        if content.strip():
            batches.append({"log_file": path, "log_type": "auth_log", "content": content, "new_pos": new_pos, "path_key": path})

    # syslog
    for path in ["/var/log/syslog", "/var/log/messages"]:
        content, new_pos = read_file_tail(path, MAX_LINES, state)
        if content.strip():
            batches.append({"log_file": path, "log_type": "syslog", "content": content, "new_pos": new_pos, "path_key": path})

    # nginx access log
    for path in ["/var/log/nginx/access.log", "/var/log/nginx/error.log"]:
        content, new_pos = read_file_tail(path, MAX_LINES, state)
        if content.strip():
            batches.append({"log_file": path, "log_type": "nginx_access", "content": content, "new_pos": new_pos, "path_key": path})

    # Apache
    for path in ["/var/log/apache2/access.log", "/var/log/apache2/error.log", "/var/log/httpd/access_log"]:
        content, new_pos = read_file_tail(path, MAX_LINES, state)
        if content.strip():
            batches.append({"log_file": path, "log_type": "apache_access", "content": content, "new_pos": new_pos, "path_key": path})

    # journalctl (last N lines, not file-based)
    try:
        last_ts = state.get("journalctl_since", "")
        cmd = ["journalctl", "-n", str(MAX_LINES), "--no-pager", "-o", "short"]
        if last_ts:
            cmd += ["--since", last_ts]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
        if result.stdout.strip():
            now_ts = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
            batches.append({"log_file": "journalctl", "log_type": "syslog", "content": result.stdout, "new_pos": None, "path_key": "journalctl", "new_ts": now_ts})
    except Exception:
        pass

    # Running processes snapshot
    try:
        result = subprocess.run(["ps", "aux"], capture_output=True, text=True, timeout=5)
        if result.stdout:
            batches.append({"log_file": "process_list", "log_type": "process_snapshot", "content": result.stdout, "new_pos": None, "path_key": None})
    except Exception:
        pass

    # Network connections
    try:
        result = subprocess.run(["ss", "-tunp"], capture_output=True, text=True, timeout=5)
        if not result.stdout:
            result = subprocess.run(["netstat", "-tunp"], capture_output=True, text=True, timeout=5)
        if result.stdout:
            batches.append({"log_file": "network_connections", "log_type": "netstat", "content": result.stdout, "new_pos": None, "path_key": None})
    except Exception:
        pass

    return batches


def collect_windows(state: dict) -> list[dict]:
    """Collect logs from Windows system using PowerShell."""
    batches = []

    # Windows Event Logs via PowerShell
    event_queries = [
        # Security: logins, failures, account changes
        {"name": "Security", "log_type": "windows_event", "ids": "4624,4625,4634,4648,4720,4726,4732,4756"},
        # System: service installs, driver loads
        {"name": "System",   "log_type": "windows_event", "ids": "7045,7040"},
        # Application
        {"name": "Application", "log_type": "windows_event", "ids": ""},
    ]

    for eq in event_queries:
        try:
            last_run = state.get(f"win_{eq['name']}", "")
            after_clause = f'-After "{last_run}"' if last_run else f"-MaxEvents {MAX_LINES}"

            if eq["ids"]:
                id_filter = ",".join(eq["ids"].split(","))
                ps_filter = f"{{$_.Id -in @({id_filter})}}"
                cmd = f"Get-WinEvent -LogName {eq['name']} {after_clause} 2>$null | Where-Object {ps_filter} | Select-Object TimeCreated, Id, LevelDisplayName, Message | ConvertTo-Json"
            else:
                cmd = f"Get-WinEvent -LogName {eq['name']} {after_clause} 2>$null | Select-Object TimeCreated, Id, LevelDisplayName, Message | ConvertTo-Json"

            result = subprocess.run(
                ["powershell", "-NoProfile", "-NonInteractive", "-Command", cmd],
                capture_output=True, text=True, timeout=30,
            )
            if result.stdout.strip() and result.stdout.strip() != "null":
                batches.append({
                    "log_file": f"Windows {eq['name']} Events",
                    "log_type": eq["log_type"],
                    "content": result.stdout,
                    "new_pos": None,
                    "path_key": f"win_{eq['name']}",
                    "new_ts": datetime.utcnow().isoformat(),
                })
        except Exception as e:
            log.debug(f"Win event {eq['name']}: {e}")

    # PowerShell history
    try:
        ps_hist = os.path.expandvars(r"%APPDATA%\Microsoft\Windows\PowerShell\PSReadLine\ConsoleHost_history.txt")
        content, new_pos = read_file_tail(ps_hist, MAX_LINES, state)
        if content.strip():
            batches.append({"log_file": "PowerShell History", "log_type": "windows_event", "content": content, "new_pos": new_pos, "path_key": ps_hist})
    except Exception:
        pass

    # Running processes
    try:
        result = subprocess.run(
            ["powershell", "-NoProfile", "-Command", "Get-Process | Select-Object Name,Id,CPU,WorkingSet | ConvertTo-Json"],
            capture_output=True, text=True, timeout=15,
        )
        if result.stdout.strip():
            batches.append({"log_file": "process_list", "log_type": "process_snapshot", "content": result.stdout, "new_pos": None, "path_key": None})
    except Exception:
        pass

    # Network connections
    try:
        result = subprocess.run(
            ["powershell", "-NoProfile", "-Command", "Get-NetTCPConnection | Select-Object LocalAddress,LocalPort,RemoteAddress,RemotePort,State | ConvertTo-Json"],
            capture_output=True, text=True, timeout=10,
        )
        if result.stdout.strip():
            batches.append({"log_file": "network_connections", "log_type": "netstat", "content": result.stdout, "new_pos": None, "path_key": None})
    except Exception:
        pass

    return batches


def collect_mac(state: dict) -> list[dict]:
    """Collect logs from macOS."""
    batches = []

    for path in ["/var/log/system.log", "/var/log/secure.log"]:
        content, new_pos = read_file_tail(path, MAX_LINES, state)
        if content.strip():
            batches.append({"log_file": path, "log_type": "syslog", "content": content, "new_pos": new_pos, "path_key": path})

    # unified log (last hour)
    try:
        result = subprocess.run(
            ["log", "show", "--predicate", "eventMessage contains 'error' or eventMessage contains 'fail'",
             "--last", "1h", "--style", "compact"],
            capture_output=True, text=True, timeout=15,
        )
        if result.stdout.strip():
            batches.append({"log_file": "macos_unified_log", "log_type": "syslog", "content": result.stdout[:50000], "new_pos": None, "path_key": None})
    except Exception:
        pass

    try:
        result = subprocess.run(["ps", "aux"], capture_output=True, text=True, timeout=5)
        if result.stdout:
            batches.append({"log_file": "process_list", "log_type": "process_snapshot", "content": result.stdout, "new_pos": None, "path_key": None})
    except Exception:
        pass

    return batches


def collect_logs(state: dict) -> list[dict]:
    if OS == "windows":
        return collect_windows(state)
    elif OS == "darwin":
        return collect_mac(state)
    else:
        return collect_linux(state)


# ══ SHIP TO AEGISTRACE ══════════════════════════════════════════════════════

def ship_batch(hostname: str, ip: str, batch: dict) -> dict:
    """POST a single log batch to AegisTrace. Returns the API response dict."""
    payload = json.dumps({
        "hostname":        hostname,
        "os_type":         get_os_type(),
        "ip_address":      ip,
        "log_file":        batch["log_file"],
        "log_type":        batch["log_type"],
        "content":         batch["content"],
        "auto_analyse":    AUTO_ANALYSE,
        "auto_case":       AUTO_CASE,
        "threat_threshold": THREAT_THRESHOLD,
        "agent_version":   AGENT_VERSION,
        "tags":            TAGS,
    }).encode("utf-8")

    url = f"{AEGISTRACE_URL.rstrip('/')}/api/ingest/logs"
    req = request.Request(
        url,
        data=payload,
        headers={
            "Content-Type":      "application/json",
            "X-AegisTrace-Key":  INGEST_KEY,
        },
        method="POST",
    )
    try:
        with request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode())
    except error.HTTPError as e:
        body = e.read().decode()
        log.error(f"HTTP {e.code}: {body}")
        return {"error": f"HTTP {e.code}"}
    except Exception as e:
        log.error(f"Ship error: {e}")
        return {"error": str(e)}


# ══ MAIN LOOP ════════════════════════════════════════════════════════════════

def run_once():
    hostname = get_hostname()
    ip       = get_ip()
    state    = load_state()

    log.info(f"Collecting logs from {hostname} ({ip}) [{get_os_type()}]")
    batches = collect_logs(state)

    if not batches:
        log.info("No new log data to ship.")
        return

    shipped, skipped, total_lines, max_score = 0, 0, 0, 0

    for batch in batches:
        if not batch.get("content", "").strip():
            skipped += 1
            continue

        log.info(f"Shipping: {batch['log_file']} ({len(batch['content'].splitlines())} lines)")
        result = ship_batch(hostname, ip, batch)

        if result.get("ok"):
            shipped    += 1
            total_lines += result.get("lines_received", 0)
            score = result.get("threat_score", 0)
            if score > max_score:
                max_score = score

            if result.get("case_created"):
                log.warning(f"🚨 CASE CREATED: threat_score={score} → case #{result['case_created']}")
            else:
                log.info(f"✓ {result.get('message','OK')}")

            # Update state position
            key = batch.get("path_key")
            if key and batch.get("new_pos") is not None:
                state[key] = batch["new_pos"]
            elif key and batch.get("new_ts"):
                state[key] = batch["new_ts"]
        else:
            log.error(f"Failed to ship {batch['log_file']}: {result.get('error')}")

    save_state(state)
    log.info(f"Done: {shipped} batches shipped, {total_lines} lines, max threat score: {max_score}/100")


def main():
    if "--install-service" in sys.argv:
        _install_systemd_service()
        return
    if "--install-launchd" in sys.argv:
        _install_launchd()
        return
    if "--once" in sys.argv:
        run_once()
        return

    log.info(f"AegisTrace Agent v{AGENT_VERSION} starting — shipping every {INTERVAL_SECONDS}s to {AEGISTRACE_URL}")
    log.info(f"Host: {get_hostname()} | OS: {get_os_type()} | IP: {get_ip()}")

    while True:
        try:
            run_once()
        except KeyboardInterrupt:
            log.info("Agent stopped.")
            break
        except Exception as e:
            log.error(f"Run error: {e}")
        log.info(f"Sleeping {INTERVAL_SECONDS}s...")
        time.sleep(INTERVAL_SECONDS)


# ── Service installers ────────────────────────────────────────────────────────

def _install_systemd_service():
    agent_path = Path(__file__).resolve()
    python_path = sys.executable
    service = f"""[Unit]
Description=AegisTrace Endpoint Agent
After=network.target

[Service]
Type=simple
ExecStart={python_path} {agent_path}
Restart=always
RestartSec=30
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
"""
    svc_file = Path("/etc/systemd/system/aegistrace-agent.service")
    svc_file.write_text(service)
    os.system("systemctl daemon-reload && systemctl enable aegistrace-agent && systemctl start aegistrace-agent")
    print(f"Service installed. Check: systemctl status aegistrace-agent")


def _install_launchd():
    agent_path = Path(__file__).resolve()
    python_path = sys.executable
    plist = f"""<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.aegistrace.agent</string>
    <key>ProgramArguments</key>
    <array>
        <string>{python_path}</string>
        <string>{agent_path}</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StartInterval</key>
    <integer>{INTERVAL_SECONDS}</integer>
    <key>StandardOutPath</key>
    <string>/tmp/aegistrace_agent.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/aegistrace_agent_error.log</string>
</dict>
</plist>"""
    plist_path = Path.home() / "Library/LaunchAgents/com.aegistrace.agent.plist"
    plist_path.parent.mkdir(parents=True, exist_ok=True)
    plist_path.write_text(plist)
    os.system(f"launchctl load {plist_path}")
    print(f"LaunchAgent installed: {plist_path}")


if __name__ == "__main__":
    main()
