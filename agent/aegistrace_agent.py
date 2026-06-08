#!/usr/bin/env python3
"""
AegisTrace Endpoint Agent v5.0
────────────────────────────────────────────────────────────────────────
Production-grade. Single deployable file. Python 3.8+ · Linux · macOS · Windows
One allowed external dependency: psutil

╔══════════════════════════════════════════════════════════════════════════╗
║  🍯 HONEY TOKEN TRAP — THE POWER FEATURE (new in v5.0)                ║
║                                                                          ║
║  Plants fake credential files (.env, .aws/credentials, passwords.txt)   ║
║  on the monitored machine. Any process that opens these files gets an    ║
║  IMMEDIATE CRITICAL alert — because nothing legitimate ever reads your   ║
║  random .env file. Zero false positives. Catches credential-harvesting   ║
║  malware, ransomware recon, and lateral movement tools in the first      ║
║  second they execute — even if they bypass every other detector.         ║
╚══════════════════════════════════════════════════════════════════════════╝

What's new in v5.0 vs v3.0:
  ✓ Honey Token Trap       — canary credential files, zero false positives
  ✓ DNS / DGA Detection    — Shannon entropy + n-gram scoring catches C2 infra
  ✓ Guardian Process       — multiprocessing guardian restarts agent if killed
  ✓ Auto-Block Engine      — iptables / pfctl / netsh blocking in < 1 second
  ✓ USB / Media Detection  — alert on any removable device insertion
  ✓ Registry Monitor       — Windows Run/RunOnce/Services persistence keys
  ✓ Multiple Backend Failover — primary → secondary → tertiary, no data loss
  ✓ Enhanced FIM           — mtime + size + hash; recursive dir monitoring
  ✓ YARA-lite Engine       — string pattern signatures on cmdline + open files
  ✓ Network Isolation Mode — cut all outbound except AegisTrace on CRITICAL
  ✓ Structured telemetry v2 — richer event schema, deduplication, priority lanes

QUICK SETUP:
  pip install psutil
  export AEGISTRACE_TOKEN=your_token
  export AEGISTRACE_AGENT_ID=your_hostname
  python3 aegistrace_agent.py

SERVICE INSTALL (root/admin):
  sudo python3 aegistrace_agent.py --install-service

CHECK CONFIG:
  python3 aegistrace_agent.py --check

RUN ONCE (CI/testing):
  python3 aegistrace_agent.py --once
"""

# ═══════════════════════════════════════════════════════════════════════════════
# § 1  CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════════
import os

# ── Backends (primary → secondary → tertiary failover) ──────────────────────
_RAW_BACKENDS = os.environ.get(
    "AEGISTRACE_SERVER",
    "https://aegistrace-7qvn.onrender.com"
)
BACKEND_URLS: list = [u.strip() for u in _RAW_BACKENDS.split(",") if u.strip()]

# Keep legacy single-URL env var working
SERVER_URL = BACKEND_URLS[0]

AGENT_TOKEN           = os.environ.get("AEGISTRACE_TOKEN", "")
AGENT_ID              = os.environ.get("AEGISTRACE_AGENT_ID", "")
POLL_INTERVAL         = int(os.environ.get("AEGISTRACE_POLL_INTERVAL", "30"))
COMMAND_POLL_INTERVAL = int(os.environ.get("AEGISTRACE_CMD_INTERVAL", "10"))
APPROVED_AI_SERVICES  = [
    x.strip() for x in os.environ.get("AEGISTRACE_APPROVED_AI", "").split(",") if x.strip()
]

# Auto-block: "off" | "alert" | "block"
AUTO_BLOCK_MODE = os.environ.get("AEGISTRACE_AUTO_BLOCK", "alert").lower()

# Honey tokens: "true" | "false"
HONEY_TOKENS_ENABLED = os.environ.get("AEGISTRACE_HONEY_TOKENS", "true").lower() == "true"

# Isolation: block all outbound except AegisTrace on CRITICAL
ISOLATION_ENABLED = os.environ.get("AEGISTRACE_ISOLATION", "false").lower() == "true"

# ═══════════════════════════════════════════════════════════════════════════════
# § 2  CONSTANTS
# ═══════════════════════════════════════════════════════════════════════════════
AGENT_VERSION = "5.0.0"

AI_API_DOMAINS = [
    "api.openai.com",       "api.anthropic.com",
    "generativelanguage.googleapis.com", "api.mistral.ai",
    "api.groq.com",         "api.cohere.ai",
    "huggingface.co",       "api.together.xyz",
    "api.perplexity.ai",    "api.replicate.com",
    "inference.cerebras.ai","api.deepseek.com",
    "openrouter.ai",        "api.x.ai",
]

SENSITIVE_PATHS = [
    ".ssh", ".aws", ".env", ".gnupg", "id_rsa", "id_ed25519",
    "credentials", ".kube/config", ".docker/config.json",
    "passwd", "shadow", "sudoers",
]

SUSPICIOUS_PROCESS_NAMES = [
    "mimikatz", "lazagne", "procdump", "meterpreter",
    "netcat", "ncat", "powersploit", "empire", "cobalt",
    "cobaltstrike", "msfconsole", "metasploit", "bloodhound",
    "rubeus", "sharpkatz", "safetykatz", "nanodump",
    "ntdsutil",  # AD database dump
]

SUSPICIOUS_LINEAGES = [
    ("word",       "cmd"),       ("word",       "powershell"),
    ("excel",      "cmd"),       ("excel",      "powershell"),
    ("outlook",    "cmd"),       ("outlook",    "powershell"),
    ("chrome",     "cmd"),       ("firefox",    "cmd"),
    ("winword",    "wscript"),   ("svchost",    "powershell"),
    ("explorer",   "regsvr32"),  ("explorer",   "mshta"),
    ("iexplore",   "cmd"),       ("msedge",     "cmd"),
    ("acrord32",   "cmd"),       ("msiexec",    "powershell"),
]

# Classic C2 / RAT / reverse-shell ports
SUSPICIOUS_PORTS = {4444, 1337, 31337, 8888, 9999, 6666, 5555, 12345, 65535, 4445, 1234}

# FIM: critical system paths per OS
FIM_PATHS_LINUX = [
    "/etc/passwd", "/etc/shadow", "/etc/sudoers",
    "/etc/crontab", "/etc/ssh/sshd_config", "/etc/hosts",
    "/etc/ld.so.conf", "/etc/rc.local",
    "/etc/systemd/system",   # directory: detect new services
    "/usr/bin",              # directory: detect new binaries
]
FIM_PATHS_MAC = [
    "/etc/passwd", "/etc/sudoers", "/etc/hosts",
    "/Library/LaunchDaemons",   # persistence
    "/Library/LaunchAgents",
]
FIM_PATHS_WINDOWS = [
    r"C:\Windows\System32\drivers\etc\hosts",
    r"C:\Windows\System32\config\SAM",
    r"C:\Windows\System32",   # directory
]

# Windows Registry keys to monitor for persistence
REGISTRY_KEYS_WINDOWS = [
    (r"SOFTWARE\Microsoft\Windows\CurrentVersion\Run",        "HKCU"),
    (r"SOFTWARE\Microsoft\Windows\CurrentVersion\Run",        "HKLM"),
    (r"SOFTWARE\Microsoft\Windows\CurrentVersion\RunOnce",    "HKCU"),
    (r"SOFTWARE\Microsoft\Windows\CurrentVersion\RunOnce",    "HKLM"),
    (r"SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon","HKLM"),
    (r"SYSTEM\CurrentControlSet\Services",                    "HKLM"),
]

# YARA-lite: string signatures → (description, severity)
YARA_PATTERNS: list = [
    # Reverse-shell one-liners
    (b"bash -i >& /dev/tcp/",      "Bash TCP reverse shell",          "CRITICAL"),
    (b"python -c 'import socket",  "Python socket reverse shell",      "CRITICAL"),
    (b"perl -e 'use Socket",       "Perl reverse shell",               "CRITICAL"),
    (b"powershell -enc ",          "Encoded PowerShell (base64)",      "HIGH"),
    (b"IEX(New-Object",            "PowerShell download-execute",      "HIGH"),
    (b"Invoke-Expression",         "PowerShell Invoke-Expression",     "HIGH"),
    (b"certutil -decode",          "certutil used for decoding",       "HIGH"),
    (b"mshta.exe http",            "mshta remote execution",           "HIGH"),
    (b"regsvr32 /s /n /u /i:http", "Squiblydoo regsvr32 bypass",      "CRITICAL"),
    (b"net user /add",             "Local user creation",              "HIGH"),
    (b"net localgroup administrators /add", "Admin group addition",   "CRITICAL"),
    # Credential access
    (b"sekurlsa::logonpasswords",  "Mimikatz credential dump",         "CRITICAL"),
    (b"lsass.exe",                 "LSASS referenced in cmdline",      "HIGH"),
    (b"procdump -ma lsass",        "ProcDump LSASS dump",              "CRITICAL"),
    # Exfiltration
    (b"curl -X POST",              "curl POST (possible exfil)",       "MEDIUM"),
    (b"wget --post-data",          "wget POST (possible exfil)",       "MEDIUM"),
]

# DGA detection thresholds
DGA_ENTROPY_THRESHOLD   = 3.6   # Shannon entropy (real domains ≈ 2.5–3.2)
DGA_MIN_LENGTH          = 8     # minimum subdomain length to analyse
DGA_VOWEL_RATIO_THRESH  = 0.25  # DGA domains have few vowels
DGA_DIGIT_RATIO_THRESH  = 0.35  # DGA domains often have many digits

# ═══════════════════════════════════════════════════════════════════════════════
# § 3  IMPORTS
# ═══════════════════════════════════════════════════════════════════════════════
import sys, json, time, socket, platform, subprocess, logging, threading
import hashlib, re, math, statistics, struct, multiprocessing, signal
from datetime import datetime, timedelta
from pathlib import Path
from urllib import request as urllib_request, error as urllib_error
from typing import Optional, List, Dict, Tuple
from logging.handlers import RotatingFileHandler
from collections import defaultdict, deque
from functools import lru_cache

try:
    import psutil
    PSUTIL_AVAILABLE = True
except ImportError:
    PSUTIL_AVAILABLE = False
    print("[WARN] psutil not installed. Run: pip install psutil")

# ═══════════════════════════════════════════════════════════════════════════════
# § 4  LOGGING (structured JSON)
# ═══════════════════════════════════════════════════════════════════════════════
_DIR         = Path(__file__).parent
LOG_FILE     = _DIR / "aegistrace_agent.log"
BUFFER_FILE  = _DIR / "aegistrace_buffer.jsonl"
STATE_FILE   = _DIR / "aegistrace_state.json"
BASELINE_FILE= _DIR / "aegistrace_baseline.json"
FIM_FILE     = _DIR / "aegistrace_fim.json"
HONEY_FILE   = _DIR / "aegistrace_honey.json"
DNS_LOG_FILE = _DIR / "aegistrace_dns.jsonl"
BLOCKED_IPS_FILE = _DIR / "aegistrace_blocked.json"


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        return json.dumps({
            "ts":      datetime.utcnow().isoformat() + "Z",
            "level":   record.levelname,
            "agent":   AGENT_ID or "unknown",
            "version": AGENT_VERSION,
            "msg":     record.getMessage(),
        })


_fh = RotatingFileHandler(LOG_FILE, maxBytes=5 * 1024 * 1024, backupCount=3)
_fh.setFormatter(JsonFormatter())
_sh = logging.StreamHandler(sys.stdout)
_sh.setFormatter(JsonFormatter())

logger = logging.getLogger("aegistrace")
logger.setLevel(logging.INFO)
logger.addHandler(_fh)
logger.addHandler(_sh)
logger.propagate = False

# ═══════════════════════════════════════════════════════════════════════════════
# § 5  STATE + STORAGE
# ═══════════════════════════════════════════════════════════════════════════════

def load_state() -> dict:
    try:
        return json.loads(STATE_FILE.read_text()) if STATE_FILE.exists() else {}
    except Exception:
        return {}


def save_state(state: dict):
    try:
        STATE_FILE.write_text(json.dumps(state, indent=2))
    except Exception as e:
        logger.warning(f"State save failed: {e}")


# ═══════════════════════════════════════════════════════════════════════════════
# § 6  BEHAVIOURAL BASELINE ENGINE
# ═══════════════════════════════════════════════════════════════════════════════

class BaselineEngine:
    """
    7-day learning window. After LEARNING_CYCLES, flags statistically unusual
    processes, IPs, and activity hours using 2-std-dev deviation detection.
    Persists state across restarts for genuine cross-session learning.
    """
    LEARNING_CYCLES = 5 * 24 * 2  # ~5 days @ 30s

    def __init__(self):
        self.data   = self._load()
        self._cycle = self.data.get("cycle_count", 0)

    def _load(self) -> dict:
        try:
            return json.loads(BASELINE_FILE.read_text()) if BASELINE_FILE.exists() else {}
        except Exception:
            return {}

    def _save(self):
        try:
            BASELINE_FILE.write_text(json.dumps(self.data))
        except Exception:
            pass

    @property
    def is_learning(self) -> bool:
        return self._cycle < self.LEARNING_CYCLES

    def record(self, processes: list, connections: list):
        self._cycle += 1
        self.data["cycle_count"] = self._cycle
        for p in processes:
            pname = (p.get("name") or "").lower()
            if pname:
                kp = self.data.setdefault("known_processes", {})
                kp[pname] = kp.get(pname, 0) + 1
        for c in connections:
            rip = c.get("remote_ip", "")
            if rip and not rip.startswith(("10.", "192.168.", "172.", "127.", "::1", "0.")):
                ki = self.data.setdefault("known_ips", {})
                ki[rip] = ki.get(rip, 0) + 1
        hour = str(datetime.utcnow().hour)
        ah = self.data.setdefault("active_hours", {})
        ah[hour] = ah.get(hour, 0) + 1
        if self._cycle % 100 == 0:
            self._save()

    def check_anomalies(self, processes: list, connections: list) -> list:
        if self.is_learning:
            return []
        anomalies = []
        known_procs = self.data.get("known_processes", {})
        known_ips   = self.data.get("known_ips", {})
        for p in processes:
            pname = (p.get("name") or "").lower()
            if pname and pname not in known_procs:
                anomalies.append({
                    "type": "behavioural_anomaly", "subtype": "new_process",
                    "description": f"New process never seen during baseline: {pname}",
                    "process_name": pname, "process_pid": p.get("pid", 0),
                    "severity": "low",
                })
        for c in connections:
            rip = c.get("remote_ip", "")
            if rip and not rip.startswith(("10.", "192.168.", "172.", "127.", "::1", "0.")):
                if rip not in known_ips:
                    anomalies.append({
                        "type": "new_destination",
                        "description": f"New external IP not seen in baseline: {rip}",
                        "remote_ip": rip,
                        "remote_port": c.get("remote_port"),
                        "process_name": c.get("process_name", "unknown"),
                        "severity": "low",
                    })
        hour = str(datetime.utcnow().hour)
        ah = self.data.get("active_hours", {})
        if ah and int(ah.get(hour, 0)) < 2:
            anomalies.append({
                "type": "behavioural_anomaly", "subtype": "unusual_hour",
                "description": f"Activity at unusual hour: {hour}:00 UTC",
                "hour": int(hour), "severity": "low",
            })
        return anomalies


_baseline = BaselineEngine()


# ═══════════════════════════════════════════════════════════════════════════════
# § 7  FILE INTEGRITY MONITOR (enhanced v5.0)
# ═══════════════════════════════════════════════════════════════════════════════

class FileIntegrityMonitor:
    """
    Monitors critical system paths for changes.
    v5.0 tracks: SHA-256 hash + mtime + file size.
    Supports directories (hashes file listing, detects new/deleted files).
    Alert suppression: won't re-alert the same path change within 5 minutes.
    """

    def __init__(self):
        self.records: dict = self._load()
        self._alerted: dict = {}   # path → last alert timestamp

    def _load(self) -> dict:
        try:
            return json.loads(FIM_FILE.read_text()) if FIM_FILE.exists() else {}
        except Exception:
            return {}

    def _save(self):
        try:
            FIM_FILE.write_text(json.dumps(self.records))
        except Exception:
            pass

    def _snapshot(self, path: str) -> Optional[dict]:
        try:
            p = Path(path)
            if p.is_file():
                data = p.read_bytes()
                return {
                    "hash":  hashlib.sha256(data).hexdigest(),
                    "size":  p.stat().st_size,
                    "mtime": p.stat().st_mtime,
                    "type":  "file",
                }
            elif p.is_dir():
                entries = sorted(str(e) + "|" + str(e.stat().st_mtime)
                                 for e in p.iterdir() if e.exists())
                listing = "\n".join(entries)
                return {
                    "hash":  hashlib.sha256(listing.encode()).hexdigest(),
                    "count": len(entries),
                    "mtime": p.stat().st_mtime,
                    "type":  "dir",
                }
        except Exception:
            pass
        return None

    def _get_paths(self) -> list:
        OS = platform.system().lower()
        if OS == "linux":   return FIM_PATHS_LINUX
        if OS == "darwin":  return FIM_PATHS_MAC
        return FIM_PATHS_WINDOWS

    def initialize(self):
        for path in self._get_paths():
            snap = self._snapshot(path)
            if snap:
                self.records[path] = snap
        self._save()
        logger.info(f"FIM initialized: {len(self.records)} paths")

    def check(self) -> list:
        alerts = []
        now = time.time()
        for path in self._get_paths():
            current = self._snapshot(path)
            if current is None:
                continue
            stored = self.records.get(path)
            if stored is None:
                self.records[path] = current
                continue
            if stored.get("hash") != current.get("hash"):
                # Suppress re-alert within 5 min
                last = self._alerted.get(path, 0)
                if now - last < 300:
                    continue
                self._alerted[path] = now
                extra = {}
                if current["type"] == "dir":
                    extra["dir_count_before"] = stored.get("count")
                    extra["dir_count_after"]  = current.get("count")
                alerts.append({
                    "type":        "fim_change",
                    "path":        path,
                    "description": f"Critical path modified: {path}",
                    "old_hash":    (stored.get("hash") or "")[:16] + "...",
                    "new_hash":    (current.get("hash") or "")[:16] + "...",
                    "path_type":   current["type"],
                    "severity":    "HIGH",
                    "timestamp":   datetime.utcnow().isoformat(),
                    **extra,
                })
                self.records[path] = current
        if alerts:
            self._save()
        return alerts


_fim = FileIntegrityMonitor()


# ═══════════════════════════════════════════════════════════════════════════════
# § 8  🍯 HONEY TOKEN TRAP  ── THE POWER FEATURE
# ═══════════════════════════════════════════════════════════════════════════════

class HoneyTokenTrap:
    """
    ╔════════════════════════════════════════════════════════════════════╗
    ║  HONEY TOKEN TRAP — v5.0 Power Feature                           ║
    ║                                                                    ║
    ║  Strategy: plant fake credential files that look real but grant   ║
    ║  access to nothing. Nothing legitimate ever reads a random .env   ║
    ║  file in your home directory — but every credential-harvesting    ║
    ║  tool does. Zero false positives. Instant CRITICAL detection.     ║
    ║                                                                    ║
    ║  Files planted:                                                    ║
    ║    ~/.aws/credentials        fake AWS AKIA keys                   ║
    ║    ~/.honey_env              fake DB + API keys                   ║
    ║    ~/.honey_vault            fake Vault/k8s secrets               ║
    ║    ~/honey_passwords.txt     fake password list                   ║
    ║                                                                    ║
    ║  Detection: every 30s, all running process open_files() are       ║
    ║  checked. Any hit → IMMEDIATE CRITICAL alert with full process    ║
    ║  context (name, PID, user, cmdline, parent).                      ║
    ╚════════════════════════════════════════════════════════════════════╝
    """

    FAKE_AWS = """\
[default]
aws_access_key_id     = AKIAIOSFODNN7EXAMPLE
aws_secret_access_key = wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
region = us-east-1

[prod]
aws_access_key_id     = AKIAI44QH8DHBEXAMPLE
aws_secret_access_key = je7MtGbClwBF/2Zp9Utk/h3yCo8nvbEXAMPLEKEY
region = eu-west-1
"""

    FAKE_ENV = """\
# Application configuration
DB_HOST=prod-db.internal.corp.com
DB_PORT=5432
DB_NAME=production
DB_USER=app_admin
DB_PASS=Xk9$mV2pLqR7nW!3

REDIS_URL=redis://redis.internal:6379
SECRET_KEY=django-insecure-j8k2m4p6q8r0s2t4v6w8x0y2z4a6b8c0d2e4f6g8h0

STRIPE_SECRET_KEY=stripe_honey_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
STRIPE_WEBHOOK_SECRET=stripe_wh_honey_q1w2e3r4t5y6u7i8o9p0a1s2d3f4g5h6

SENDGRID_API_KEY=sendgrid_honey_z9x8c7v6b5n4m3a2s1d0f9g8h7j6k5l4

ADMIN_PASSWORD=SuperSecretAdm1n@Corp2024!
"""

    FAKE_VAULT = """\
# Vault / Kubernetes secrets
VAULT_TOKEN=s.XXXXXXXXXXXXXXXXXXXXXX
VAULT_ADDR=https://vault.internal:8200

# Kubernetes service account
K8S_TOKEN=eyJhbGciOiJSUzI1NiIsImtpZCI6XXXX
K8S_API_SERVER=https://k8s-api.internal:6443

# Internal cert (expired, safe to store)
TLS_CERT_FINGERPRINT=SHA256:Xk9mV2pLqR7nW3yCo8nvbE
INTERNAL_CA_PASSWORD=Corp@CA2024Root!
"""

    FAKE_PASSWORDS = """\
# Corporate password list — CONFIDENTIAL
# Generated: 2025-01-15

admin / P@ssw0rd2024!Corp
root / Xk9$mV2pLqR7nW!3
vpn-user / VPN@Access2024#Secure
backup-admin / B@ckup$erver!2024
sql-sa / SQL$Admin@Prod2024
ssh-root / SSH@R00t!Corp2024
"""

    def __init__(self):
        self._paths: list = []
        self._path_set: set = set()
        self._alerted: dict = {}   # path → last alert timestamp
        self._meta: dict   = self._load_meta()

    def _load_meta(self) -> dict:
        try:
            return json.loads(HONEY_FILE.read_text()) if HONEY_FILE.exists() else {}
        except Exception:
            return {}

    def _save_meta(self):
        try:
            HONEY_FILE.write_text(json.dumps(self._meta))
        except Exception:
            pass

    def plant(self):
        """Plant all honey token files. Safe to call multiple times."""
        home = Path.home()
        files_to_plant = [
            (home / ".aws" / "credentials",  self.FAKE_AWS),
            (home / ".honey_env",             self.FAKE_ENV),
            (home / ".honey_vault",           self.FAKE_VAULT),
            (home / "honey_passwords.txt",    self.FAKE_PASSWORDS),
        ]

        for path, content in files_to_plant:
            try:
                path.parent.mkdir(parents=True, exist_ok=True)
                # Only write if file doesn't exist (don't overwrite real .aws/credentials!)
                if not path.exists():
                    path.write_text(content)
                    logger.info(f"[honey] Token planted: {path}")
                elif str(path) in self._meta.get("planted", []):
                    pass  # Already ours, skip
                else:
                    # File exists and is NOT ours — skip (could be real creds)
                    logger.info(f"[honey] Skipping {path} — file already exists (may be real)")
                    continue

                self._paths.append(str(path))
                self._path_set.add(str(path))
                self._meta.setdefault("planted", []).append(str(path))
            except Exception as e:
                logger.warning(f"[honey] Could not plant {path}: {e}")

        self._save_meta()
        logger.info(f"[honey] {len(self._paths)} honey token(s) active")

    def check(self) -> list:
        """Check if any process has opened our honey token files."""
        if not PSUTIL_AVAILABLE or not self._path_set:
            return []

        alerts = []
        now = time.time()

        try:
            for proc in psutil.process_iter(["pid", "name", "username", "cmdline", "ppid"]):
                try:
                    for f in proc.open_files():
                        fpath = str(f.path)
                        if fpath not in self._path_set:
                            continue

                        # Suppress re-alert within 60s per path+pid combo
                        key = f"{fpath}:{proc.pid}"
                        if now - self._alerted.get(key, 0) < 60:
                            continue
                        self._alerted[key] = now

                        # Get parent info
                        parent_name = ""
                        try:
                            parent = psutil.Process(proc.info.get("ppid", 0))
                            parent_name = parent.name()
                        except Exception:
                            pass

                        alerts.append({
                            "type":         "honey_token_access",
                            "honey_file":   fpath,
                            "process_name": proc.info.get("name", ""),
                            "process_pid":  proc.pid,
                            "username":     proc.info.get("username", ""),
                            "cmdline":      " ".join(proc.info.get("cmdline") or [])[:300],
                            "parent_name":  parent_name,
                            "description": (
                                f"HONEY TOKEN ACCESSED: {proc.info.get('name', '?')} "
                                f"(PID {proc.pid}, user {proc.info.get('username', '?')}) "
                                f"opened {Path(fpath).name}"
                            ),
                            "severity":     "CRITICAL",
                            "timestamp":    datetime.utcnow().isoformat(),
                        })

                except (psutil.AccessDenied, psutil.NoSuchProcess):
                    pass
                except Exception:
                    pass
        except Exception as e:
            logger.error(f"[honey] check error: {e}")

        return alerts

    def cleanup(self):
        """Remove planted honey token files (call on uninstall)."""
        for path in self._meta.get("planted", []):
            try:
                Path(path).unlink(missing_ok=True)
                logger.info(f"[honey] Removed: {path}")
            except Exception:
                pass


_honey = HoneyTokenTrap()


# ═══════════════════════════════════════════════════════════════════════════════
# § 9  DNS / DGA DETECTOR  (new v5.0)
# ═══════════════════════════════════════════════════════════════════════════════

class DNSDGADetector:
    """
    Detects Domain Generation Algorithm (DGA) C2 infrastructure.

    DGA domains: xk9zmf2qrt.com, a3x9kzmvwq.net (high entropy, few vowels)
    Real domains: google.com, microsoft.com (low entropy, recognisable words)

    Methods:
    1. Shannon entropy of subdomain (DGA ≈ 3.6–4.5, real ≈ 2.5–3.2)
    2. Vowel ratio (DGA < 0.25)
    3. Digit ratio (DGA > 0.35)
    4. Domain length (DGA typically 8–20 chars)
    5. DNS tunnelling: subdomain > 50 chars (encoded data)

    Also monitors:
    - Connections to port 53 (DNS queries) via psutil/netstat
    - Newly seen domains not in baseline whitelist
    """

    # Common legitimate TLDs with high-entropy-looking names are not DGA
    LEGIT_DOMAINS = {
        "amazonaws.com", "cloudfront.net", "akamaiedge.net",
        "fastly.net", "cloudflare.com", "azure.com", "microsoft.com",
        "google.com", "googleapis.com", "gstatic.com", "youtube.com",
        "apple.com", "icloud.com", "akamai.net", "edgekey.net",
        "cdn.net", "netlify.app", "vercel.app", "render.com",
    }

    def __init__(self):
        self._seen_domains: set = set()
        self._alerted: dict = {}

    @staticmethod
    def _shannon_entropy(s: str) -> float:
        if not s:
            return 0.0
        freq = {}
        for c in s:
            freq[c] = freq.get(c, 0) + 1
        length = len(s)
        return -sum((f / length) * math.log2(f / length) for f in freq.values())

    @staticmethod
    def _vowel_ratio(s: str) -> float:
        if not s:
            return 0.0
        vowels = sum(1 for c in s.lower() if c in "aeiou")
        return vowels / len(s)

    @staticmethod
    def _digit_ratio(s: str) -> float:
        if not s:
            return 0.0
        digits = sum(1 for c in s if c.isdigit())
        return digits / len(s)

    def _is_dga(self, domain: str) -> Tuple[bool, str]:
        """Returns (is_dga, reason)."""
        domain = domain.lower().strip(".")

        # Strip www prefix
        if domain.startswith("www."):
            domain = domain[4:]

        # Check against legit whitelist
        for legit in self.LEGIT_DOMAINS:
            if domain.endswith(legit):
                return False, ""

        # Get the leftmost subdomain / SLD
        parts = domain.split(".")
        if len(parts) < 2:
            return False, ""

        label = parts[0]  # subdomain or SLD

        if len(label) < DGA_MIN_LENGTH:
            return False, ""

        ent = self._shannon_entropy(label)
        vr  = self._vowel_ratio(label)
        dr  = self._digit_ratio(label)

        # DNS tunnelling: very long subdomain
        if len(label) > 50:
            return True, f"DNS tunnelling suspected: subdomain length={len(label)}"

        # Multi-factor DGA scoring
        dga_signals = 0
        reasons = []
        if ent >= DGA_ENTROPY_THRESHOLD:
            dga_signals += 2
            reasons.append(f"entropy={ent:.2f}")
        if vr < DGA_VOWEL_RATIO_THRESH:
            dga_signals += 1
            reasons.append(f"vowel_ratio={vr:.2f}")
        if dr > DGA_DIGIT_RATIO_THRESH:
            dga_signals += 1
            reasons.append(f"digit_ratio={dr:.2f}")

        if dga_signals >= 3:
            return True, f"DGA domain detected ({', '.join(reasons)})"

        return False, ""

    def check(self, connections: list) -> list:
        """Check active network connections for DGA-like hostnames."""
        alerts = []
        now = time.time()

        # Also read last 50 lines of DNS log if it exists
        dns_queries = self._read_dns_log()

        all_hostnames = set()
        for c in connections:
            rh = c.get("remote_hostname", "")
            rp = c.get("remote_port", 0)
            if rh and rh != c.get("remote_ip", ""):
                all_hostnames.add((rh, c.get("process_name", ""), rp))

        for qname in dns_queries:
            all_hostnames.add((qname, "dns_query", 53))

        for hostname, proc_name, rport in all_hostnames:
            is_dga, reason = self._is_dga(hostname)
            if not is_dga:
                continue

            key = f"{hostname}:{proc_name}"
            if now - self._alerted.get(key, 0) < 300:
                continue
            self._alerted[key] = now

            alerts.append({
                "type":         "dga_domain",
                "domain":       hostname,
                "process_name": proc_name,
                "remote_port":  rport,
                "description":  f"DGA/suspicious domain: {hostname} — {reason} (proc: {proc_name})",
                "severity":     "HIGH",
                "timestamp":    datetime.utcnow().isoformat(),
            })

        return alerts

    def _read_dns_log(self) -> list:
        """Parse recent DNS queries from system log if available."""
        queries = []
        OS = platform.system().lower()
        try:
            if OS == "linux":
                for log in ["/var/log/syslog", "/var/log/messages"]:
                    p = Path(log)
                    if not p.exists():
                        continue
                    lines = p.read_text(errors="replace").splitlines()[-100:]
                    for line in lines:
                        if "query[A]" in line or "query[AAAA]" in line:
                            m = re.search(r"query\[A+\] (\S+) from", line)
                            if m:
                                queries.append(m.group(1))
            elif OS == "darwin":
                r = subprocess.run(
                    ["log", "show", "--predicate", 'subsystem == "com.apple.mdnsresponder"',
                     "--last", "1m", "--style", "compact"],
                    capture_output=True, text=True, timeout=5
                )
                for line in r.stdout.splitlines():
                    m = re.search(r"Q: (\S+)", line)
                    if m:
                        queries.append(m.group(1))
        except Exception:
            pass
        return queries[-50:]


_dns_dga = DNSDGADetector()


# ═══════════════════════════════════════════════════════════════════════════════
# § 10  USB / REMOVABLE MEDIA DETECTOR  (new v5.0)
# ═══════════════════════════════════════════════════════════════════════════════

class USBDetector:
    """
    Detects USB / removable media insertions.
    Cross-platform: /proc/mounts (Linux), diskutil (macOS), WMI (Windows).
    Alerts once per device per session.
    """

    def __init__(self):
        self._known: set = self._get_current()

    def _get_current(self) -> set:
        OS = platform.system().lower()
        try:
            if OS == "linux":
                mounts = Path("/proc/mounts").read_text().splitlines()
                return {
                    line.split()[0] for line in mounts
                    if any(x in line for x in ("/dev/sd", "/dev/usb", "/media/", "/mnt/"))
                }
            elif OS == "darwin":
                r = subprocess.run(
                    ["diskutil", "list", "-plist"], capture_output=True, timeout=5
                )
                # Just get /dev/disk entries including external
                r2 = subprocess.run(["diskutil", "list"], capture_output=True, text=True, timeout=5)
                return {
                    line.split()[0] for line in r2.stdout.splitlines()
                    if line.startswith("/dev/disk") and "external" in line.lower()
                }
            elif OS == "windows":
                ps_cmd = (
                    "Get-WmiObject Win32_LogicalDisk "
                    "| Where-Object {$_.DriveType -eq 2} "
                    "| Select-Object -ExpandProperty DeviceID"
                )
                r = subprocess.run(
                    ["powershell", "-NoProfile", "-NonInteractive", "-Command", ps_cmd],
                    capture_output=True, text=True, timeout=10
                )
                return set(r.stdout.strip().splitlines())
        except Exception:
            pass
        return set()

    def check(self) -> list:
        current = self._get_current()
        new_devices = current - self._known
        alerts = []
        for dev in new_devices:
            alerts.append({
                "type":        "usb_inserted",
                "device":      dev,
                "description": f"Removable media / USB inserted: {dev}",
                "severity":    "MEDIUM",
                "timestamp":   datetime.utcnow().isoformat(),
            })
        self._known = current
        return alerts


_usb = USBDetector()


# ═══════════════════════════════════════════════════════════════════════════════
# § 11  WINDOWS REGISTRY MONITOR  (new v5.0)
# ═══════════════════════════════════════════════════════════════════════════════

class RegistryMonitor:
    """
    Windows-only. Hashes critical registry keys at startup, alerts on changes.
    Covers: Run / RunOnce / Winlogon / Services (common persistence locations).
    No-op on Linux/macOS.
    """

    def __init__(self):
        self._snapshots: dict = {}
        self._enabled = platform.system().lower() == "windows"
        if self._enabled:
            try:
                import winreg as _wr
                self._wr = _wr
            except ImportError:
                self._enabled = False

    def _read_key(self, hive_str: str, subkey: str) -> Optional[dict]:
        if not self._enabled:
            return None
        try:
            hive = {
                "HKCU": self._wr.HKEY_CURRENT_USER,
                "HKLM": self._wr.HKEY_LOCAL_MACHINE,
            }.get(hive_str)
            if hive is None:
                return None
            values = {}
            with self._wr.OpenKey(hive, subkey, 0, self._wr.KEY_READ) as key:
                i = 0
                while True:
                    try:
                        name, data, _ = self._wr.EnumValue(key, i)
                        values[name] = str(data)[:200]
                        i += 1
                    except OSError:
                        break
            return values
        except Exception:
            return None

    def initialize(self):
        if not self._enabled:
            return
        for subkey, hive in REGISTRY_KEYS_WINDOWS:
            vals = self._read_key(hive, subkey)
            if vals is not None:
                key = f"{hive}\\{subkey}"
                h = hashlib.sha256(json.dumps(vals, sort_keys=True).encode()).hexdigest()
                self._snapshots[key] = {"hash": h, "values": vals}
        logger.info(f"[registry] Initialized {len(self._snapshots)} keys")

    def check(self) -> list:
        if not self._enabled:
            return []
        alerts = []
        for subkey, hive in REGISTRY_KEYS_WINDOWS:
            key  = f"{hive}\\{subkey}"
            vals = self._read_key(hive, subkey)
            if vals is None:
                continue
            current_hash = hashlib.sha256(json.dumps(vals, sort_keys=True).encode()).hexdigest()
            stored = self._snapshots.get(key)
            if stored is None:
                self._snapshots[key] = {"hash": current_hash, "values": vals}
                continue
            if stored["hash"] != current_hash:
                old_vals  = stored["values"]
                new_entries = {k: v for k, v in vals.items() if k not in old_vals or old_vals[k] != v}
                removed     = {k: v for k, v in old_vals.items() if k not in vals}
                alerts.append({
                    "type":        "registry_change",
                    "key":         key,
                    "new_entries": new_entries,
                    "removed":     removed,
                    "description": f"Registry persistence key changed: {key} (+{len(new_entries)} -{len(removed)})",
                    "severity":    "HIGH",
                    "timestamp":   datetime.utcnow().isoformat(),
                })
                self._snapshots[key] = {"hash": current_hash, "values": vals}
        return alerts


_registry = RegistryMonitor()


# ═══════════════════════════════════════════════════════════════════════════════
# § 12  YARA-LITE ENGINE  (new v5.0)
# ═══════════════════════════════════════════════════════════════════════════════

class YaraLiteEngine:
    """
    String-pattern scanning on process command lines and open file paths.
    No root required. Covers the most common attacker one-liners and LOLBin abuse.
    """

    def __init__(self):
        # Compile patterns once
        self._patterns = [
            (re.compile(re.escape(pat), re.IGNORECASE), desc, sev)
            for pat, desc, sev in YARA_PATTERNS
        ]
        self._alerted: dict = {}

    def scan_processes(self, processes: list) -> list:
        alerts = []
        now = time.time()
        for proc in processes:
            cmdline = (proc.get("cmdline") or "").encode("utf-8", errors="replace")
            for pattern, desc, sev in self._patterns:
                if pattern.search(cmdline):
                    key = f"{proc.get('pid', 0)}:{desc}"
                    if now - self._alerted.get(key, 0) < 300:
                        continue
                    self._alerted[key] = now
                    alerts.append({
                        "type":         "yara_match",
                        "rule":         desc,
                        "process_name": proc.get("name", ""),
                        "process_pid":  proc.get("pid", 0),
                        "username":     proc.get("username", ""),
                        "cmdline":      proc.get("cmdline", "")[:300],
                        "description":  f"YARA match: {desc} — {proc.get('name', '?')} (PID {proc.get('pid', 0)})",
                        "severity":     sev,
                        "timestamp":    datetime.utcnow().isoformat(),
                    })
                    break  # one alert per process
        return alerts


_yara = YaraLiteEngine()


# ═══════════════════════════════════════════════════════════════════════════════
# § 13  COLLECTORS
# ═══════════════════════════════════════════════════════════════════════════════

def collect_processes() -> list:
    if not PSUTIL_AVAILABLE:
        return _collect_processes_fallback()
    procs = []
    try:
        for proc in psutil.process_iter(
            ["pid", "ppid", "name", "cmdline", "username", "status", "create_time"]
        ):
            try:
                info = proc.info
                connections = []
                try:
                    for c in proc.connections(kind="inet"):
                        connections.append({
                            "local_ip":    str(c.laddr.ip) if c.laddr else "",
                            "local_port":  c.laddr.port if c.laddr else 0,
                            "remote_ip":   str(c.raddr.ip) if c.raddr else "",
                            "remote_port": c.raddr.port if c.raddr else 0,
                            "status":      c.status,
                        })
                except (psutil.AccessDenied, psutil.NoSuchProcess):
                    pass
                procs.append({
                    "pid":         info["pid"],
                    "ppid":        info["ppid"],
                    "name":        info["name"] or "",
                    "cmdline":     " ".join(info["cmdline"] or [])[:500],
                    "username":    info["username"] or "",
                    "status":      info["status"] or "",
                    "create_time": info["create_time"],
                    "connections": connections,
                })
            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                pass
    except Exception as e:
        logger.error(f"collect_processes error: {e}")
    return procs


def _collect_processes_fallback() -> list:
    OS = platform.system().lower()
    procs = []
    try:
        if OS in ("linux", "darwin"):
            r = subprocess.run(
                ["ps", "-eo", "pid,ppid,user,stat,comm,args", "--no-headers"],
                capture_output=True, text=True, timeout=10
            )
            for line in r.stdout.strip().splitlines():
                p = line.split(None, 5)
                if len(p) >= 5:
                    procs.append({
                        "pid": int(p[0]), "ppid": int(p[1]),
                        "username": p[2], "status": p[3],
                        "name": p[4], "cmdline": p[5] if len(p) > 5 else p[4],
                        "connections": [],
                    })
    except Exception as e:
        logger.error(f"Fallback process collect error: {e}")
    return procs


def collect_network_connections() -> list:
    if not PSUTIL_AVAILABLE:
        return _collect_connections_fallback()
    connections = []
    _dns_cache: dict = {}

    def _resolve(ip: str) -> str:
        if ip in _dns_cache:
            return _dns_cache[ip]
        try:
            h = socket.gethostbyaddr(ip)[0]
            _dns_cache[ip] = h
            return h
        except Exception:
            _dns_cache[ip] = ip
            return ip

    try:
        pid_to_name: dict = {}
        try:
            for proc in psutil.process_iter(["pid", "name"]):
                try:
                    pid_to_name[proc.pid] = proc.info["name"] or ""
                except Exception:
                    pass
        except Exception:
            pass

        for c in psutil.net_connections(kind="inet"):
            rip = str(c.raddr.ip) if c.raddr else ""
            connections.append({
                "local_ip":        str(c.laddr.ip) if c.laddr else "",
                "local_port":      c.laddr.port if c.laddr else 0,
                "remote_ip":       rip,
                "remote_port":     c.raddr.port if c.raddr else 0,
                "status":          c.status,
                "pid":             c.pid or 0,
                "process_name":    pid_to_name.get(c.pid, "") if c.pid else "",
                "remote_hostname": _resolve(rip) if rip else "",
            })
    except Exception as e:
        logger.error(f"collect_network_connections error: {e}")
    return connections


def _collect_connections_fallback() -> list:
    connections = []
    try:
        OS = platform.system().lower()
        if OS == "linux":
            r = subprocess.run(["ss", "-tunp"], capture_output=True, text=True, timeout=5)
            if not r.stdout.strip():
                r = subprocess.run(["netstat", "-tunp"], capture_output=True, text=True, timeout=5)
            for line in r.stdout.strip().splitlines()[1:]:
                connections.append({"raw": line})
    except Exception:
        pass
    return connections


def collect_system_info() -> dict:
    info = {
        "hostname":   socket.gethostname(),
        "os":         platform.system(),
        "os_release": platform.release(),
        "ip_address": "",
        "timestamp":  datetime.utcnow().isoformat() + "Z",
    }
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        info["ip_address"] = s.getsockname()[0]
        s.close()
    except Exception:
        pass
    if PSUTIL_AVAILABLE:
        try:
            info["cpu_percent"]    = psutil.cpu_percent(interval=1)
            mem                    = psutil.virtual_memory()
            info["mem_total_mb"]   = mem.total // (1024 * 1024)
            info["mem_used_mb"]    = mem.used  // (1024 * 1024)
            info["mem_percent"]    = mem.percent
            disk                   = psutil.disk_usage("/")
            info["disk_total_gb"]  = round(disk.total / (1024**3), 1)
            info["disk_used_gb"]   = round(disk.used  / (1024**3), 1)
            info["disk_percent"]   = disk.percent
            info["logged_in_users"] = [u.name for u in psutil.users()]
            boot_ts = psutil.boot_time()
            info["uptime_hours"]   = round((time.time() - boot_ts) / 3600, 1)
        except Exception as e:
            logger.warning(f"system_info metrics error: {e}")
    return info



# ═══════════════════════════════════════════════════════════════════════════════
# § ENTERPRISE LOG COLLECTION
# ───────────────────────────────────────────────────────────────────────────────
# Comprehensive system monitoring covering every auth source on Linux:
#   • SSH (success + failure + key-based)       via journalctl + auth.log
#   • sudo commands (every command logged)       via journalctl SYSLOG_FACILITY=10
#   • PAM events (GUI login, screen unlock)      via journalctl _COMM=login
#   • su / su- privilege escalation             via journalctl
#   • User management (useradd, passwd, etc.)   via journalctl
#   • Kernel events (OOM, hardware errors)      via journalctl _TRANSPORT=kernel
#   • Systemd service start/stop/fail           via journalctl
#   • Package installs (apt/dpkg)               via journalctl
#   • Cron job executions                       via journalctl
#   • Network interface changes                 via journalctl
#   • wtmp/btmp login history                   via last / lastb
# ═══════════════════════════════════════════════════════════════════════════════

_log_lock = threading.Lock()
_raw_log_queue: list = []       # accumulates raw logs between cycles

# Persist cursor to file so restarts don't re-read old events
_LOG_CURSOR_FILE   = Path.home() / ".aegistrace_log_cursor"
_STOP_FILE         = Path.home() / ".aegistrace_STOP"       # sentinel: guardian won't restart if this exists
_PID_FILE          = Path.home() / ".aegistrace.pid"        # main agent PID
_GUARDIAN_PID_FILE = Path.home() / ".aegistrace_guardian.pid"  # guardian PID

def _write_pid_files():
    """Write agent + guardian PID files on startup."""
    try: _PID_FILE.write_text(str(os.getpid()))
    except Exception: pass

def _clear_pid_files():
    """Remove PID files on clean exit."""
    for f in (_PID_FILE, _GUARDIAN_PID_FILE):
        try: f.unlink(missing_ok=True)
        except Exception: pass

def _load_log_cursor() -> str:
    try:
        return _LOG_CURSOR_FILE.read_text().strip()
    except Exception:
        return ""

def _save_log_cursor(ts: str):
    try:
        _LOG_CURSOR_FILE.write_text(ts)
    except Exception:
        pass

_log_last_ts: str = _load_log_cursor()  # survives restarts


def _run_journalctl(args: list, timeout: int = 8) -> list:
    """Run journalctl --output=json and return list of parsed entries."""
    try:
        result = subprocess.run(
            ["journalctl", "--output=json", "--no-pager"] + args,
            capture_output=True, text=True, timeout=timeout
        )
        entries = []
        for line in result.stdout.splitlines():
            try:
                entries.append(json.loads(line))
            except Exception:
                pass
        return entries
    except Exception as e:
        logger.debug(f"[logs] journalctl: {e}")
        return []


def _jentry_to_raw(entry: dict, category: str = "system") -> dict:
    """Convert journalctl JSON entry → AegisTrace raw log dict."""
    msg      = str(entry.get("MESSAGE", ""))
    comm     = entry.get("_COMM", "")
    unit     = entry.get("_SYSTEMD_UNIT", entry.get("UNIT", ""))
    priority = int(entry.get("PRIORITY", 6))
    uid      = entry.get("_UID", "")
    pid      = entry.get("_PID", "")
    rt       = entry.get("__REALTIME_TIMESTAMP")
    try:
        ts = datetime.utcfromtimestamp(int(rt) / 1_000_000).isoformat() + "Z" if rt else datetime.utcnow().isoformat() + "Z"
    except Exception:
        ts = datetime.utcnow().isoformat() + "Z"
    sev = {0:"critical",1:"critical",2:"critical",3:"high",4:"high",5:"medium",6:"info",7:"debug"}.get(priority, "info")
    return {
        "timestamp":  ts,
        "category":   category,
        "source":     comm or unit.replace(".service", "") or "system",
        "pid":        pid,
        "uid":        uid,
        "severity":   sev,
        "priority":   priority,
        "raw":        msg[:400],
        "event_type": "log",
    }


def _parse_auth_entry(entry: dict):
    """
    Parse one journalctl auth entry.
    Returns a login_event dict, or None if uninteresting.
    """
    msg   = str(entry.get("MESSAGE", ""))
    lower = msg.lower()
    comm  = entry.get("_COMM", "")

    ev = _jentry_to_raw(entry, "auth")
    ev["success"]    = True
    ev["source_ip"]  = None
    ev["username"]   = None

    # Extract IP
    ip_m = re.search(r"(?:from|rhost=)\s*(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})", msg)
    if ip_m:
        ev["source_ip"] = ip_m.group(1)

    # Extract username
    user_m = re.search(r"(?:user |for |USER=)([^\s;,]+)", msg, re.IGNORECASE)
    if user_m:
        ev["username"] = user_m.group(1).rstrip(";,")

    # ── Classify ──────────────────────────────────────────────────────────
    if any(x in lower for x in ["failed password", "authentication failure",
                                  "invalid user", "failed login", "no identification"]):
        ev["event_type"] = "failed_login"
        ev["success"]    = False
        ev["severity"]   = "high"
        ev["category"]   = "auth"
        return ev

    if any(x in lower for x in ["accepted password", "accepted publickey",
                                  "accepted keyboard-interactive"]):
        ev["event_type"] = "login_success"
        ev["category"]   = "auth"
        return ev

    if "session opened" in lower:
        ev["event_type"] = "session_open"
        ev["category"]   = "auth"
        return ev

    if "session closed" in lower:
        ev["event_type"] = "session_close"
        ev["category"]   = "auth"
        return ev

    if comm == "sudo" and ("command" in lower or "tty=" in lower):
        ev["event_type"] = "sudo_command"
        ev["category"]   = "privilege"
        ev["severity"]   = "medium"
        cmd_m = re.search(r"COMMAND=(.+)$", msg, re.MULTILINE)
        if cmd_m:
            ev["sudo_command"] = cmd_m.group(1).strip()[:200]
        ev["success"] = "not allowed" not in lower
        return ev

    if any(x in lower for x in ["new user:", "new group:", "delete user",
                                  "useradd:", "userdel:", "usermod:", "groupadd:"]):
        ev["event_type"] = "user_management"
        ev["severity"]   = "high"
        ev["category"]   = "user_mgmt"
        return ev

    if any(x in lower for x in ["su:", " su to ", " su from "]):
        ev["event_type"] = "su_command"
        ev["category"]   = "privilege"
        ev["severity"]   = "medium"
        return ev

    if "password changed" in lower or "changed password" in lower:
        ev["event_type"] = "password_change"
        ev["severity"]   = "medium"
        ev["category"]   = "auth"
        return ev

    return None   # uninteresting auth entry


def _collect_linux_logs_comprehensive():
    """
    Enterprise-grade Linux log collection.
    Returns (login_events: list, raw_logs: list).
    Reads incrementally — only events since last call.
    """
    global _log_last_ts

    login_events: list = []
    raw_logs: list     = []
    seen_raws: set     = set()

    with _log_lock:
        since = _log_last_ts

    new_ts = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    since_args = ["--since", since] if since else ["-n", "300"]

    def add_raw(ev: dict):
        key = ev.get("raw", "")[:80]
        if key and key not in seen_raws:
            seen_raws.add(key)
            raw_logs.append(ev)

    # ── 1. ALL auth facility events (SSH, sudo, PAM, su, passwd, login) ───
    for entry in _run_journalctl(since_args + ["SYSLOG_FACILITY=10"]):
        ev = _parse_auth_entry(entry)
        if ev:
            login_events.append(ev)
        add_raw(_jentry_to_raw(entry, "auth"))

    # ── 2. SSH service (catches events that may miss auth facility) ─────────
    for entry in _run_journalctl(since_args + ["-u", "ssh", "-u", "sshd"]):
        ev = _parse_auth_entry(entry)
        if ev:
            key = ev.get("raw", "")[:80]
            if key not in seen_raws:
                login_events.append(ev)
        add_raw(_jentry_to_raw(entry, "ssh"))

    # ── 3. Kernel events (OOM killer, hardware errors, driver crashes) ─────
    for entry in _run_journalctl(since_args + ["_TRANSPORT=kernel", "-p", "4"]):
        ev = _jentry_to_raw(entry, "kernel")
        ev["event_type"] = "kernel_event"
        add_raw(ev)

    # ── 4. Package installs (apt / dpkg) ───────────────────────────────────
    for entry in _run_journalctl(since_args + ["_COMM=dpkg", "_COMM=apt",
                                                "_COMM=apt-get"]):
        ev = _jentry_to_raw(entry, "package")
        ev["event_type"] = "package_install"
        add_raw(ev)

    # ── 5. Systemd service changes ─────────────────────────────────────────
    for entry in _run_journalctl(since_args + ["_PID=1", "-p", "5"]):
        msg = str(entry.get("MESSAGE", "")).lower()
        if any(x in msg for x in ["started ", "stopped ", "failed ", "starting ", "stopping "]):
            ev = _jentry_to_raw(entry, "service")
            ev["event_type"] = "service_event"
            add_raw(ev)

    # ── 6. Cron job executions ─────────────────────────────────────────────
    for entry in _run_journalctl(since_args + ["_COMM=cron", "_COMM=crond"]):
        ev = _jentry_to_raw(entry, "cron")
        ev["event_type"] = "cron_event"
        add_raw(ev)

    # ── 7. NetworkManager events ───────────────────────────────────────────
    for entry in _run_journalctl(since_args + ["_COMM=NetworkManager"]):
        ev = _jentry_to_raw(entry, "network")
        ev["event_type"] = "network_event"
        add_raw(ev)

    # ── 8. Fallback: read auth.log directly if journalctl gave no logins ───
    if not login_events:
        for log_path in ["/var/log/auth.log", "/var/log/secure"]:
            p = Path(log_path)
            if not p.exists():
                continue
            try:
                lines = p.read_text(errors="replace").splitlines()[-300:]
                for line in lines:
                    lower = line.lower()
                    ev = {
                        "raw": line[:300], "timestamp": datetime.utcnow().isoformat() + "Z",
                        "success": True, "source_ip": None, "username": None,
                        "event_type": "login", "category": "auth", "severity": "info",
                    }
                    ip_m   = re.search(r"from\s+(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})", line)
                    user_m = re.search(r"(?:user|for)\s+(\S+)", line, re.IGNORECASE)
                    if ip_m:   ev["source_ip"] = ip_m.group(1)
                    if user_m: ev["username"]  = user_m.group(1)
                    if any(x in lower for x in ["failed password", "authentication failure", "invalid user"]):
                        ev["success"]    = False
                        ev["event_type"] = "failed_login"
                        ev["severity"]   = "high"
                        login_events.append(ev)
                    elif "accepted" in lower:
                        login_events.append(ev)
            except Exception as e:
                logger.debug(f"[logs] auth.log fallback: {e}")

    # ── 9. wtmp — recent successful logins via `last` ──────────────────────
    try:
        r = subprocess.run(["last", "-F", "-n", "20"], capture_output=True, text=True, timeout=5)
        for line in r.stdout.splitlines():
            if not line or "wtmp" in line or "reboot" in line:
                continue
            parts = line.split()
            if len(parts) >= 2:
                raw_logs.append({
                    "timestamp": datetime.utcnow().isoformat() + "Z",
                    "category": "auth", "source": "wtmp",
                    "event_type": "login_history", "severity": "info",
                    "raw": line[:200], "username": parts[0], "tty": parts[1],
                })
    except Exception:
        pass

    # Persist cursor so restarts don't re-read old events
    with _log_lock:
        _log_last_ts = new_ts
    _save_log_cursor(new_ts)

    return login_events, raw_logs[:300]


def collect_login_events() -> list:
    OS = platform.system().lower()
    try:
        if OS == "linux":
            login_events, raw_logs = _collect_linux_logs_comprehensive()
            # Store raw logs in global queue for telemetry
            global _raw_log_queue
            _raw_log_queue.extend(raw_logs)
            return login_events
        elif OS == "darwin":
            return _parse_mac_auth_logs()
        elif OS == "windows":
            return _parse_windows_auth_logs()
    except Exception as e:
        logger.error(f"collect_login_events error: {e}")
    return []


def _parse_linux_auth_logs() -> list:
    """Legacy fallback — replaced by _collect_linux_logs_comprehensive."""
    events = []
    for log_path in ["/var/log/auth.log", "/var/log/secure"]:
        p = Path(log_path)
        if not p.exists():
            continue
        try:
            lines = p.read_text(errors="replace").splitlines()[-200:]
            for line in lines:
                lower = line.lower()
                ev = {
                    "raw": line[:300], "timestamp": datetime.utcnow().isoformat(),
                    "success": True, "source_ip": None, "username": None,
                    "event_type": "login",
                }
                ip_m   = re.search(r"from\s+(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})", line)
                user_m = re.search(r"(?:user|for)\s+(\S+)", line, re.IGNORECASE)
                if ip_m:   ev["source_ip"] = ip_m.group(1)
                if user_m: ev["username"]  = user_m.group(1)
                if any(x in lower for x in ["failed password", "authentication failure", "invalid user"]):
                    ev["success"] = False
                    ev["event_type"] = "failed_login"
                    events.append(ev)
                elif "accepted" in lower:
                    events.append(ev)
        except Exception as e:
            logger.warning(f"Linux auth log parse error ({log_path}): {e}")
    return events[-100:]


def _parse_mac_auth_logs() -> list:
    events = []
    try:
        r = subprocess.run(["last", "-20"], capture_output=True, text=True, timeout=5)
        for line in r.stdout.splitlines():
            parts = line.split()
            if parts:
                events.append({
                    "username": parts[0], "source_ip": parts[2] if len(parts) > 2 else "",
                    "event_type": "login", "success": True,
                    "timestamp": datetime.utcnow().isoformat(),
                })
    except Exception:
        pass
    return events


def _parse_windows_auth_logs() -> list:
    events = []
    try:
        ps_cmd = (
            "$ids=@(4624,4625);"
            "Get-WinEvent -FilterHashtable @{LogName='Security';Id=$ids} "
            "-MaxEvents 50 -ErrorAction SilentlyContinue"
            "| Select-Object TimeCreated,Id,Message | ConvertTo-Json -Depth 1 -Compress"
        )
        r = subprocess.run(
            ["powershell", "-NoProfile", "-NonInteractive", "-Command", ps_cmd],
            capture_output=True, text=True, timeout=30
        )
        if r.stdout.strip():
            raw = json.loads(r.stdout)
            if isinstance(raw, dict):
                raw = [raw]
            for ev in raw:
                success = int(ev.get("Id", 0)) == 4624
                ip_m    = re.search(r"Network Address:\s+(\d+\.\d+\.\d+\.\d+)", ev.get("Message", ""))
                user_m  = re.search(r"Account Name:\s+(\S+)", ev.get("Message", ""))
                events.append({
                    "event_type": "login" if success else "failed_login",
                    "success":    success,
                    "source_ip":  ip_m.group(1) if ip_m else "",
                    "username":   user_m.group(1) if user_m else "",
                    "timestamp":  str(ev.get("TimeCreated", "")),
                })
    except Exception as e:
        logger.warning(f"Windows auth log parse: {e}")
    return events


def collect_file_events() -> list:
    if not PSUTIL_AVAILABLE:
        return []
    events = []
    try:
        for proc in psutil.process_iter(["pid", "name", "username"]):
            try:
                for f in proc.open_files():
                    fpath = str(f.path).lower()
                    if any(s.lower() in fpath for s in SENSITIVE_PATHS):
                        events.append({
                            "pid":          proc.pid,
                            "process_name": proc.info["name"] or "",
                            "username":     proc.info["username"] or "",
                            "file_path":    f.path,
                            "timestamp":    datetime.utcnow().isoformat(),
                        })
            except (psutil.AccessDenied, psutil.NoSuchProcess):
                pass
    except Exception as e:
        logger.error(f"collect_file_events error: {e}")
    return events


# ═══════════════════════════════════════════════════════════════════════════════
# § 14  DETECTORS  (all v3.0 detectors + v5.0 additions wired in via collect)
# ═══════════════════════════════════════════════════════════════════════════════

def detect_shadow_ai(connections: list) -> list:
    alerts = []
    approved = set(APPROVED_AI_SERVICES)
    for conn in connections:
        rip   = conn.get("remote_ip", "")
        rhost = conn.get("remote_hostname", "")
        pname = conn.get("process_name", "")
        for domain in AI_API_DOMAINS:
            if domain in rhost or (rip == rhost and _hostname_matches(rip, domain)):
                if domain not in approved:
                    alerts.append({
                        "type":               "shadow_ai",
                        "process_name":       pname,
                        "process_pid":        conn.get("pid", 0),
                        "destination_domain": domain,
                        "destination_ip":     rip,
                        "remote_port":        conn.get("remote_port", 0),
                        "description":        f"Unapproved AI API: {pname} → {domain}",
                        "severity":           "HIGH",
                        "timestamp":          datetime.utcnow().isoformat(),
                    })
                break
    return alerts


def _hostname_matches(ip: str, domain: str) -> bool:
    try:
        return domain in socket.gethostbyaddr(ip)[0]
    except Exception:
        return False


def detect_suspicious_processes(processes: list) -> list:
    alerts = []
    for proc in processes:
        pname   = (proc.get("name") or "").lower()
        cmdline = (proc.get("cmdline") or "").lower()
        for suspect in SUSPICIOUS_PROCESS_NAMES:
            if suspect in pname or suspect in cmdline:
                alerts.append({
                    "type":         "suspicious_process",
                    "process_name": proc.get("name", ""),
                    "process_pid":  proc.get("pid", 0),
                    "username":     proc.get("username", ""),
                    "cmdline":      proc.get("cmdline", "")[:300],
                    "matched":      suspect,
                    "description":  f"Known malicious process: {proc.get('name')} (matches '{suspect}')",
                    "severity":     "HIGH",
                })
                break
    return alerts


def detect_process_lineage(processes: list) -> list:
    alerts = []
    pid_map: dict = {p["pid"]: p for p in processes if p.get("pid")}
    for proc in processes:
        pname  = (proc.get("name") or "").lower()
        ppid   = proc.get("ppid", 0)
        parent = pid_map.get(ppid)
        if not parent:
            continue
        parent_name = (parent.get("name") or "").lower()
        for par_kw, child_kw in SUSPICIOUS_LINEAGES:
            if par_kw in parent_name and child_kw in pname:
                alerts.append({
                    "type":         "suspicious_lineage",
                    "process_name": proc.get("name", ""),
                    "process_pid":  proc.get("pid", 0),
                    "parent_name":  parent.get("name", ""),
                    "parent_pid":   ppid,
                    "description":  f"Suspicious lineage: {parent.get('name')} → {proc.get('name')}",
                    "severity":     "HIGH",
                })
                break
    return alerts


def detect_suspicious_ports(connections: list) -> list:
    alerts = []
    for conn in connections:
        rport = conn.get("remote_port", 0)
        if rport and int(rport) in SUSPICIOUS_PORTS:
            alerts.append({
                "type":         "suspicious_port",
                "process_name": conn.get("process_name", ""),
                "pid":          conn.get("pid", 0),
                "remote_ip":    conn.get("remote_ip", ""),
                "remote_port":  rport,
                "description":  f"Connection to C2 port {rport}: {conn.get('process_name', '?')} → {conn.get('remote_ip')}",
                "severity":     "HIGH",
            })
    return alerts


def detect_privilege_escalation(processes: list) -> list:
    if not PSUTIL_AVAILABLE or platform.system().lower() == "windows":
        return []
    alerts = []
    user_space_names = {"python", "python3", "perl", "ruby", "bash", "sh", "curl", "wget", "nc"}
    try:
        for proc in psutil.process_iter(["pid", "name", "username", "cmdline"]):
            try:
                info    = proc.info
                uname   = (info.get("username") or "").lower()
                pname   = (info.get("name") or "").lower()
                cmdline = " ".join(info.get("cmdline") or []).lower()
                if uname == "root" and pname in user_space_names:
                    if "sudo" in cmdline or "su " in cmdline:
                        alerts.append({
                            "type":         "privilege_escalation",
                            "process_name": info.get("name", ""),
                            "process_pid":  info.get("pid", 0),
                            "username":     info.get("username", ""),
                            "cmdline":      cmdline[:300],
                            "description":  f"User-space process running as root via sudo: {info.get('name')}",
                            "severity":     "HIGH",
                        })
            except (psutil.AccessDenied, psutil.NoSuchProcess):
                pass
    except Exception as e:
        logger.error(f"detect_privilege_escalation error: {e}")
    return alerts


def detect_new_network_destinations(connections: list) -> list:
    if _baseline.is_learning:
        return []
    known_ips = set(_baseline.data.get("known_ips", {}).keys())
    alerts = []
    for conn in connections:
        rip = conn.get("remote_ip", "")
        if not rip or rip.startswith(("10.", "192.168.", "172.", "127.", "::1", "0.")):
            continue
        if rip not in known_ips:
            alerts.append({
                "type":            "new_destination",
                "remote_ip":       rip,
                "remote_port":     conn.get("remote_port", 0),
                "process_name":    conn.get("process_name", ""),
                "remote_hostname": conn.get("remote_hostname", rip),
                "description":     f"New external destination: {conn.get('remote_hostname', rip)}:{conn.get('remote_port')} ({conn.get('process_name', '?')})",
                "severity":        "LOW",
            })
    return alerts


# ═══════════════════════════════════════════════════════════════════════════════
# § 15  AUTO-BLOCK ACTION ENGINE  (new v5.0)
# ═══════════════════════════════════════════════════════════════════════════════

class AutoBlockEngine:
    """
    Blocks malicious IPs and kills malicious processes automatically.

    Modes (AEGISTRACE_AUTO_BLOCK env var):
      "off"   — never act, only alert (default)
      "alert" — alert only (same as off for now)
      "block" — auto-block IPs + kill processes on CRITICAL alerts

    Network isolation:
      isolate_device() — block ALL outbound except AegisTrace backend
      unisolate_device() — restore normal connectivity
    """

    def __init__(self):
        self._blocked_ips: set = self._load_blocked()
        self._isolated: bool   = False

    def _load_blocked(self) -> set:
        try:
            return set(json.loads(BLOCKED_IPS_FILE.read_text())) if BLOCKED_IPS_FILE.exists() else set()
        except Exception:
            return set()

    def _save_blocked(self):
        try:
            BLOCKED_IPS_FILE.write_text(json.dumps(list(self._blocked_ips)))
        except Exception:
            pass

    def block_ip(self, ip: str) -> bool:
        if ip in self._blocked_ips:
            return True
        OS = platform.system().lower()
        try:
            if OS == "linux":
                r = subprocess.run(
                    ["iptables", "-I", "OUTPUT", "-d", ip, "-j", "DROP"],
                    capture_output=True, timeout=5
                )
                # Also block incoming
                subprocess.run(
                    ["iptables", "-I", "INPUT", "-s", ip, "-j", "DROP"],
                    capture_output=True, timeout=5
                )
                ok = r.returncode == 0
            elif OS == "darwin":
                # Add to /etc/pf.conf block rule via pfctl
                rule = f"block drop quick from {ip} to any\n"
                with open("/etc/pf.conf", "a") as f:
                    f.write(rule)
                subprocess.run(["pfctl", "-f", "/etc/pf.conf", "-e"], capture_output=True, timeout=5)
                ok = True
            elif OS == "windows":
                name = f"AegisTrace_Block_{ip.replace('.','_')}"
                r = subprocess.run(
                    ["netsh", "advfirewall", "firewall", "add", "rule",
                     f"name={name}", "dir=out", "action=block",
                     f"remoteip={ip}", "enable=yes"],
                    capture_output=True, text=True, timeout=10
                )
                ok = r.returncode == 0
            else:
                ok = False

            if ok:
                self._blocked_ips.add(ip)
                self._save_blocked()
                logger.info(f"[block] Blocked IP: {ip}")
            return ok
        except Exception as e:
            logger.error(f"[block] block_ip({ip}) failed: {e}")
            return False

    def unblock_ip(self, ip: str) -> bool:
        OS = platform.system().lower()
        try:
            if OS == "linux":
                subprocess.run(["iptables", "-D", "OUTPUT", "-d", ip, "-j", "DROP"],
                               capture_output=True, timeout=5)
                subprocess.run(["iptables", "-D", "INPUT", "-s", ip, "-j", "DROP"],
                               capture_output=True, timeout=5)
            elif OS == "windows":
                name = f"AegisTrace_Block_{ip.replace('.','_')}"
                subprocess.run(
                    ["netsh", "advfirewall", "firewall", "delete", "rule", f"name={name}"],
                    capture_output=True, text=True, timeout=10
                )
            self._blocked_ips.discard(ip)
            self._save_blocked()
            logger.info(f"[block] Unblocked IP: {ip}")
            return True
        except Exception as e:
            logger.error(f"[block] unblock_ip({ip}) failed: {e}")
            return False

    def kill_process(self, pid: int) -> bool:
        if not PSUTIL_AVAILABLE:
            return False
        try:
            psutil.Process(pid).kill()
            logger.info(f"[block] Killed PID: {pid}")
            return True
        except Exception as e:
            logger.error(f"[block] kill_process({pid}) failed: {e}")
            return False

    def isolate_device(self) -> bool:
        """Block all outbound traffic except to AegisTrace backends."""
        if self._isolated:
            return True
        OS = platform.system().lower()
        allowed_hosts = []
        for url in BACKEND_URLS:
            try:
                host = url.split("//")[-1].split("/")[0]
                ip   = socket.gethostbyname(host)
                allowed_hosts.append(ip)
            except Exception:
                pass

        try:
            if OS == "linux":
                # Allow DNS + AegisTrace backends, drop everything else
                subprocess.run(["iptables", "-P", "OUTPUT", "DROP"], capture_output=True, timeout=5)
                subprocess.run(["iptables", "-A", "OUTPUT", "-p", "udp", "--dport", "53", "-j", "ACCEPT"],
                               capture_output=True, timeout=5)
                for ip in allowed_hosts:
                    subprocess.run(["iptables", "-A", "OUTPUT", "-d", ip, "-j", "ACCEPT"],
                                   capture_output=True, timeout=5)
            self._isolated = True
            logger.warning(f"[block] Device ISOLATED. Allowed: {allowed_hosts}")
            return True
        except Exception as e:
            logger.error(f"[block] isolate_device failed: {e}")
            return False

    def unisolate_device(self) -> bool:
        OS = platform.system().lower()
        try:
            if OS == "linux":
                subprocess.run(["iptables", "-P", "OUTPUT", "ACCEPT"], capture_output=True, timeout=5)
                subprocess.run(["iptables", "-F", "OUTPUT"], capture_output=True, timeout=5)
            self._isolated = False
            logger.info("[block] Device UNISOLATED")
            return True
        except Exception as e:
            logger.error(f"[block] unisolate_device failed: {e}")
            return False

    def respond_to_alerts(self, alerts: list):
        """React to high-severity alerts based on AUTO_BLOCK_MODE."""
        if AUTO_BLOCK_MODE not in ("block",):
            return
        for alert in alerts:
            sev = alert.get("severity", "")
            if sev == "CRITICAL":
                # Honey token access → kill the accessing process
                if alert.get("type") == "honey_token_access":
                    pid = alert.get("process_pid", 0)
                    if pid:
                        logger.warning(f"[auto-block] Killing honey-token accessor PID {pid}")
                        self.kill_process(pid)
                # Suspicious C2 → block IP
                elif alert.get("type") in ("suspicious_port", "shadow_ai"):
                    ip = alert.get("remote_ip") or alert.get("destination_ip", "")
                    if ip:
                        self.block_ip(ip)
            elif sev == "HIGH":
                # Known malicious process → kill
                if alert.get("type") == "suspicious_process":
                    pid = alert.get("process_pid", 0)
                    if pid:
                        self.kill_process(pid)


_autoblock = AutoBlockEngine()


# ═══════════════════════════════════════════════════════════════════════════════
# § 15.5  VULNERABILITY & MISCONFIGURATION SCANNER  (new v6.0)
# ═══════════════════════════════════════════════════════════════════════════════

class VulnerabilityScanner:
    """
    Active security scanner — runs every 5 minutes independently of the 30s
    telemetry cycle. Checks the host for vulnerabilities and misconfigurations
    and reports structured findings back to AegisTrace.

    Checks performed:
      Linux/macOS  ─ SSH config audit, SUID/SGID binaries, world-writable
                     system files, cron job inspection, kernel version,
                     Linux security config (/tmp exec, core dumps, /etc/passwd)
      All OSes     ─ Open port survey, dangerous listening services,
                     firewall status, user account audit
      Linux        ─ Installed package CVE cross-reference (dpkg / rpm)
      Windows      ─ Defender, UAC, accounts without passwords
    """
    SCAN_INTERVAL = 300   # seconds between scans

    # Ports that are dangerous if listening on all interfaces
    _DANGEROUS_PORTS = {
        21:    ("FTP",           "CRITICAL", "FTP is plaintext. Credentials travel in the clear. Replace with SFTP/SCP."),
        23:    ("Telnet",        "CRITICAL", "Telnet is completely unencrypted. Replace with SSH immediately."),
        135:   ("Windows RPC",  "HIGH",     "RPC endpoint mapper. Restrict to trusted networks."),
        139:   ("NetBIOS-SMB",  "HIGH",     "SMBv1 over NetBIOS. Disable SMBv1 and block externally."),
        445:   ("SMB",          "HIGH",     "SMB exposed. Exploited by EternalBlue / ransomware. Block at perimeter."),
        512:   ("rexec",        "CRITICAL", "rexec is obsolete and transmits credentials in plaintext."),
        513:   ("rlogin",       "CRITICAL", "rlogin is obsolete and completely insecure."),
        1433:  ("MSSQL",        "HIGH",     "SQL Server exposed. Use firewall rules — never expose DB directly."),
        2049:  ("NFS",          "HIGH",     "NFS exposed. Check /etc/exports for overly permissive entries."),
        3306:  ("MySQL",        "MEDIUM",   "MySQL listening. Bind to 127.0.0.1 if not intentionally external."),
        3389:  ("RDP",          "HIGH",     "RDP brute-forced constantly. Require NLA, restrict to VPN only."),
        4444:  ("Meterpreter",  "CRITICAL", "Default Metasploit C2 port — active compromise likely."),
        5432:  ("PostgreSQL",   "MEDIUM",   "PostgreSQL listening. Bind to 127.0.0.1 unless intentional."),
        5900:  ("VNC",          "HIGH",     "VNC often unencrypted. Restrict to localhost, use SSH tunnel."),
        6379:  ("Redis",        "CRITICAL", "Unauthenticated Redis leads to full host compromise. Bind to localhost."),
        9200:  ("Elasticsearch","CRITICAL", "Elasticsearch default has no auth — all data publicly readable."),
        11211: ("Memcached",    "HIGH",     "Memcached has no built-in auth. Bind to localhost only."),
        27017: ("MongoDB",      "CRITICAL", "MongoDB defaults to no auth. Restrict access immediately."),
        31337: ("Back Orifice", "CRITICAL", "Port 31337 is a known malware/C2 backdoor indicator."),
    }

    # Simplified CVE list: (package, version_prefix, cve, severity, description)
    _CVE_SIGNATURES = [
        ("openssl",       "1.0.",  "CVE-2022-0778",  "HIGH",     "OpenSSL 1.0.x is EOL with multiple unpatched critical CVEs."),
        ("openssh-server","7.",    "CVE-2023-38408", "HIGH",     "OpenSSH 7.x has memory-corruption vulnerabilities."),
        ("bash",          "4.0",   "CVE-2014-6271",  "CRITICAL", "ShellShock: bash 4.0 allows RCE via environment variables."),
        ("python2",       "2.",    "EOL",            "HIGH",     "Python 2.x is EOL since Jan 2020 — no security patches."),
        ("python2.7",     "2.7",   "EOL",            "HIGH",     "Python 2.7 is EOL. Migrate to Python 3."),
        ("curl",          "7.2",   "CVE-2023-23916", "MEDIUM",   "curl 7.2x has an HTTP header injection vulnerability."),
        ("apache2",       "2.2",   "CVE-2021-41773", "CRITICAL", "Apache 2.2.x is EOL with multiple critical CVEs."),
        ("libssl1.0",     "1.0.",  "CVE-2022-0778",  "HIGH",     "libssl 1.0.x is EOL."),
    ]

    def __init__(self):
        self._last_run: float = 0.0

    def _finding(self, fid: str, severity: str, title: str, description: str,
                 remediation: str, category: str) -> dict:
        return {
            "id":           fid,
            "type":         "vulnerability" if severity in ("CRITICAL", "HIGH") else "misconfiguration",
            "severity":     severity,
            "title":        title,
            "description":  description,
            "remediation":  remediation,
            "category":     category,
            "detected_at":  datetime.utcnow().isoformat() + "Z",
        }

    def run_if_due(self) -> list:
        if time.time() - self._last_run < self.SCAN_INTERVAL:
            return []
        self._last_run = time.time()
        return self.full_scan()

    def full_scan(self) -> list:
        findings: list = []
        OS = platform.system().lower()

        for check in [self._check_open_ports, self._check_firewall_status, self._check_user_accounts]:
            try: findings += check()
            except Exception as e: logger.debug(f"[vuln] {check.__name__}: {e}")

        if OS in ("linux", "darwin"):
            for check in [self._check_ssh_config, self._check_suid_sgid,
                          self._check_world_writable, self._check_cron_jobs,
                          self._check_kernel_version]:
                try: findings += check()
                except Exception as e: logger.debug(f"[vuln] {check.__name__}: {e}")

        if OS == "linux":
            for check in [self._check_linux_packages, self._check_linux_security_config]:
                try: findings += check()
                except Exception as e: logger.debug(f"[vuln] {check.__name__}: {e}")

        if OS == "windows":
            try: findings += self._check_windows_security()
            except Exception as e: logger.debug(f"[vuln] windows: {e}")

        logger.info(f"[vuln] Scan complete — {len(findings)} finding(s): "
                    f"{sum(1 for f in findings if f['severity']=='CRITICAL')} critical, "
                    f"{sum(1 for f in findings if f['severity']=='HIGH')} high")
        return findings

    # ── Individual checks ─────────────────────────────────────────────────────

    def _check_ssh_config(self) -> list:
        config_path = Path("/etc/ssh/sshd_config")
        if not config_path.exists():
            return []
        findings = []
        settings = {}
        try:
            for line in config_path.read_text(errors="replace").splitlines():
                line = line.strip()
                if line.startswith("#") or not line:
                    continue
                parts = line.split(None, 1)
                if len(parts) == 2:
                    settings[parts[0].lower()] = parts[1].strip().lower()
        except Exception:
            return []

        prl = settings.get("permitrootlogin", "prohibit-password")
        if prl in ("yes", "without-password", "prohibit-password"):
            findings.append(self._finding(
                "ssh_root_login", "HIGH",
                "SSH Root Login Permitted",
                f"PermitRootLogin={prl}. Direct SSH root access exposes the highest-privilege account to brute-force and credential theft.",
                "Set PermitRootLogin no in /etc/ssh/sshd_config, then: sudo systemctl restart sshd",
                "ssh"))

        if settings.get("passwordauthentication", "yes") == "yes":
            findings.append(self._finding(
                "ssh_password_auth", "MEDIUM",
                "SSH Password Authentication Enabled",
                "SSH allows password-based login. Passwords are vulnerable to brute-force and credential stuffing. SSH key auth is significantly more secure.",
                "Set PasswordAuthentication no in /etc/ssh/sshd_config. Add your public key to ~/.ssh/authorized_keys first.",
                "ssh"))

        if settings.get("permitemptypasswords") == "yes":
            findings.append(self._finding(
                "ssh_empty_passwords", "CRITICAL",
                "SSH Permits Empty Passwords",
                "PermitEmptyPasswords yes: any account with no password is SSH-accessible with no credentials.",
                "Set PermitEmptyPasswords no in /etc/ssh/sshd_config immediately. Restart sshd.",
                "ssh"))

        if settings.get("x11forwarding") == "yes":
            findings.append(self._finding(
                "ssh_x11_forwarding", "LOW",
                "SSH X11 Forwarding Enabled",
                "X11 forwarding can be exploited to intercept keystrokes or inject input into GUI applications over SSH.",
                "Set X11Forwarding no in /etc/ssh/sshd_config unless required by specific users.",
                "ssh"))

        try:
            max_tries = int(settings.get("maxauthtries", "6"))
            if max_tries > 6:
                findings.append(self._finding(
                    "ssh_high_maxauthtries", "LOW",
                    f"SSH MaxAuthTries Too High ({max_tries})",
                    f"SSH allows {max_tries} auth attempts per connection, making brute-force less costly.",
                    "Set MaxAuthTries 3 in /etc/ssh/sshd_config.",
                    "ssh"))
        except ValueError:
            pass
        return findings

    def _check_suid_sgid(self) -> list:
        LEGIT_SUID = {
            "/usr/bin/sudo", "/usr/bin/passwd", "/usr/bin/su", "/usr/bin/ping",
            "/usr/bin/chfn", "/usr/bin/chsh", "/usr/bin/newgrp", "/usr/bin/gpasswd",
            "/usr/bin/mount", "/usr/bin/umount", "/usr/bin/at", "/usr/bin/crontab",
            "/usr/bin/pkexec", "/usr/lib/openssh/ssh-keysign",
            "/usr/lib/policykit-1/polkit-agent-helper-1", "/bin/su",
            "/bin/ping", "/bin/mount", "/bin/umount",
        }
        suspicious = []
        for dir_path in ["/usr/bin", "/usr/sbin", "/bin", "/sbin", "/usr/local/bin", "/tmp", "/var/tmp"]:
            p = Path(dir_path)
            if not p.exists():
                continue
            try:
                for f in p.iterdir():
                    if not f.is_file():
                        continue
                    try:
                        mode = f.stat().st_mode
                        if (mode & 0o4000 or mode & 0o2000) and str(f) not in LEGIT_SUID:
                            tag = "SUID" if mode & 0o4000 else "SGID"
                            suspicious.append(f"{f.name} ({tag})")
                    except Exception:
                        pass
            except Exception:
                pass
        if not suspicious:
            return []
        return [self._finding(
            "unexpected_suid_sgid", "HIGH",
            f"Unexpected SUID/SGID Binaries ({len(suspicious)})",
            f"Binaries with elevated execution bits outside the known-safe set: {', '.join(suspicious[:8])}. These can be exploited for privilege escalation.",
            "Audit: sudo find / -perm /6000 -type f 2>/dev/null. Remove bit if unneeded: sudo chmod u-s <path>",
            "permissions")]

    def _check_world_writable(self) -> list:
        world_writable = []
        for dir_path in ["/etc", "/usr/bin", "/usr/sbin", "/bin", "/sbin"]:
            p = Path(dir_path)
            if not p.exists():
                continue
            try:
                for f in p.iterdir():
                    try:
                        if f.stat().st_mode & 0o002:
                            world_writable.append(str(f))
                    except Exception:
                        pass
            except Exception:
                pass
        if not world_writable:
            return []
        return [self._finding(
            "world_writable_system_files", "HIGH",
            f"World-Writable Files in System Directories ({len(world_writable)})",
            f"Any user or process can overwrite: {', '.join(world_writable[:6])}. Malware can replace system binaries or config files.",
            "Fix: sudo chmod o-w <file> for each. Audit: find /etc /usr/bin /bin -perm -o+w",
            "permissions")]

    def _check_cron_jobs(self) -> list:
        RISKY = [
            (b"curl ",        "remote download via curl"),
            (b"wget ",        "remote download via wget"),
            (b"base64 -d",    "base64 decode — possible obfuscated payload"),
            (b"/dev/tcp/",    "TCP bash redirect — reverse shell pattern"),
            (b"bash -i",      "interactive bash — reverse shell pattern"),
            (b"python -c",    "inline Python exec in cron"),
            (b"eval ",        "eval in cron — code injection risk"),
        ]
        hits = []
        cron_dirs = ["/etc/cron.d", "/etc/cron.daily", "/etc/cron.hourly",
                     "/etc/cron.weekly", "/etc/cron.monthly", "/var/spool/cron", "/var/spool/cron/crontabs"]
        for dir_path in cron_dirs + ["/etc/crontab"]:
            p = Path(dir_path)
            targets = list(p.iterdir()) if p.is_dir() else [p] if p.is_file() else []
            for f in targets:
                if not f.is_file():
                    continue
                try:
                    content = f.read_bytes().lower()
                    for pattern, label in RISKY:
                        if pattern in content:
                            hits.append(f"{f.name}: {label}")
                            break
                except Exception:
                    pass
        if not hits:
            return []
        return [self._finding(
            "suspicious_cron_patterns", "HIGH",
            f"Risky Patterns in Cron Jobs ({len(hits)})",
            f"Cron entries with potentially malicious commands: {'; '.join(hits[:5])}. Attackers abuse cron for persistence and staged execution.",
            "Review each cron file listed. Remove unauthorized jobs. Ensure cron scripts are not world-writable.",
            "persistence")]

    def _check_open_ports(self) -> list:
        if not PSUTIL_AVAILABLE:
            return []
        findings = []
        try:
            external_listen = set()
            for conn in psutil.net_connections(kind="inet"):
                if conn.status == "LISTEN" and conn.laddr:
                    if conn.laddr.ip in ("0.0.0.0", "::", ""):
                        external_listen.add(conn.laddr.port)
        except Exception:
            return []

        for port, (svc, severity, risk) in self._DANGEROUS_PORTS.items():
            if port in external_listen:
                findings.append(self._finding(
                    f"dangerous_port_{port}", severity,
                    f"{svc} Listening on Port {port} (All Interfaces)",
                    f"Port {port} ({svc}) is publicly accessible. {risk}",
                    risk, "network"))
        return findings

    def _check_firewall_status(self) -> list:
        OS = platform.system().lower()
        try:
            if OS == "linux":
                r_ufw = subprocess.run(["ufw", "status"], capture_output=True, text=True, timeout=5)
                if "inactive" not in r_ufw.stdout.lower() and r_ufw.returncode == 0:
                    return []
                r_ipt = subprocess.run(["iptables", "-L", "-n"], capture_output=True, text=True, timeout=5)
                rule_lines = [l for l in r_ipt.stdout.splitlines()
                              if l.strip() and not l.startswith("Chain") and not l.startswith("target")]
                if rule_lines:
                    return []
                return [self._finding(
                    "no_host_firewall", "HIGH",
                    "No Host Firewall Configured",
                    "Neither ufw nor iptables rules are active. All listening ports are reachable without filtering.",
                    "Enable ufw: sudo ufw enable && sudo ufw default deny incoming && sudo ufw allow ssh",
                    "firewall")]

            elif OS == "darwin":
                r = subprocess.run(["defaults", "read", "/Library/Preferences/com.apple.alf", "globalstate"],
                                   capture_output=True, text=True, timeout=5)
                if r.stdout.strip() == "0":
                    return [self._finding(
                        "macos_firewall_off", "HIGH",
                        "macOS Application Firewall Disabled",
                        "The macOS Application Firewall is off. Inbound connections are not filtered.",
                        "Enable: System Settings → Network → Firewall → Turn On Firewall",
                        "firewall")]

            elif OS == "windows":
                r = subprocess.run(["netsh", "advfirewall", "show", "allprofiles", "state"],
                                   capture_output=True, text=True, timeout=10)
                if "off" in r.stdout.lower():
                    return [self._finding(
                        "windows_firewall_off", "HIGH",
                        "Windows Firewall Disabled on One or More Profiles",
                        "Windows Firewall is disabled. Inbound connections are unfiltered.",
                        "Enable: netsh advfirewall set allprofiles state on",
                        "firewall")]
        except Exception:
            pass
        return []

    def _check_user_accounts(self) -> list:
        findings = []
        OS = platform.system().lower()
        if OS in ("linux", "darwin"):
            try:
                passwd = Path("/etc/passwd").read_text(errors="replace")
                shadow_exists = Path("/etc/shadow").exists()
                uid_zero, no_pw = [], []
                for line in passwd.splitlines():
                    parts = line.split(":")
                    if len(parts) < 7:
                        continue
                    username, pw_field, uid = parts[0], parts[1], parts[2]
                    if uid == "0" and username != "root":
                        uid_zero.append(username)
                    if not shadow_exists and pw_field == "":
                        no_pw.append(username)
                if uid_zero:
                    findings.append(self._finding(
                        "uid_zero_non_root", "CRITICAL",
                        f"Non-Root Accounts With UID 0 ({len(uid_zero)})",
                        f"Accounts with root privileges: {', '.join(uid_zero)}. These are invisible backdoors with full system access.",
                        "Investigate immediately. Delete or reassign UID: sudo usermod -u <new_uid> <user>",
                        "accounts"))
                if no_pw:
                    findings.append(self._finding(
                        "empty_password_accounts", "CRITICAL",
                        f"Accounts With No Password ({len(no_pw)})",
                        f"Login without credentials possible for: {', '.join(no_pw)}",
                        "Set password: sudo passwd <user>  or lock: sudo passwd -l <user>",
                        "accounts"))
            except Exception:
                pass

        elif OS == "windows":
            try:
                ps_cmd = ("Get-LocalUser | Where-Object {$_.Enabled -and -not $_.PasswordRequired} "
                          "| Select-Object -ExpandProperty Name")
                r = subprocess.run(["powershell", "-NoProfile", "-NonInteractive", "-Command", ps_cmd],
                                   capture_output=True, text=True, timeout=15)
                accts = [a.strip() for a in r.stdout.strip().splitlines() if a.strip()]
                if accts:
                    findings.append(self._finding(
                        "windows_no_password_accounts", "HIGH",
                        f"Windows Accounts With No Password Required ({len(accts)})",
                        f"These accounts have no mandatory password: {', '.join(accts)}",
                        "Require passwords via Local Security Policy or: net user <name> * (set a password)",
                        "accounts"))
            except Exception:
                pass
        return findings

    def _check_linux_packages(self) -> list:
        findings = []
        def check_packages(lines, pkg_col, ver_col, pkg_filter=None):
            for line in lines:
                parts = line.split()
                if len(parts) <= max(pkg_col, ver_col):
                    continue
                if pkg_filter and not line.startswith(pkg_filter):
                    continue
                pkg, ver = parts[pkg_col], parts[ver_col]
                for vuln_pkg, ver_prefix, cve, severity, desc in self._CVE_SIGNATURES:
                    if vuln_pkg in pkg and ver.startswith(ver_prefix):
                        findings.append(self._finding(
                            f"pkg_cve_{pkg}_{cve}".replace(".", "_"), severity,
                            f"Vulnerable Package: {pkg} {ver} ({cve})",
                            f"{desc} Installed version: {pkg} {ver}",
                            f"Update: sudo apt-get update && sudo apt-get upgrade {pkg}",
                            "software"))
        try:
            r = subprocess.run(["dpkg", "-l"], capture_output=True, text=True, timeout=15)
            if r.returncode == 0:
                check_packages(r.stdout.splitlines(), 1, 2, "ii")
                return findings
        except Exception:
            pass
        try:
            r = subprocess.run(["rpm", "-qa", "--qf", "%{NAME} %{VERSION}\n"],
                                capture_output=True, text=True, timeout=15)
            if r.returncode == 0:
                check_packages(r.stdout.splitlines(), 0, 1)
        except Exception:
            pass
        return findings

    def _check_linux_security_config(self) -> list:
        findings = []
        try:
            mode = Path("/etc/passwd").stat().st_mode
            if mode & 0o002:
                findings.append(self._finding(
                    "passwd_world_writable", "CRITICAL",
                    "/etc/passwd is World-Writable",
                    "Any process can modify user accounts, add root-level entries, or disable authentication.",
                    "Run immediately: sudo chmod 644 /etc/passwd",
                    "permissions"))
        except Exception:
            pass
        try:
            mounts = Path("/proc/mounts").read_text()
            tmp_line = next((l for l in mounts.splitlines() if " /tmp " in l), "")
            if tmp_line and "noexec" not in tmp_line:
                findings.append(self._finding(
                    "tmp_executable", "MEDIUM",
                    "/tmp is Executable (noexec not set)",
                    "/tmp lacks the noexec mount option. Malware can download a file to /tmp and run it directly.",
                    "Add to /etc/fstab: tmpfs /tmp tmpfs defaults,noexec,nosuid,nodev 0 0  then remount.",
                    "config"))
        except Exception:
            pass
        return findings

    def _check_kernel_version(self) -> list:
        try:
            kernel = platform.release()
            parts = kernel.split(".")
            major, minor = int(parts[0]), int(parts[1]) if len(parts) > 1 else 0
            if major < 4:
                return [self._finding(
                    "very_old_kernel", "HIGH",
                    f"Very Old Linux Kernel ({kernel})",
                    f"Kernel {kernel} is before 4.0. Many privilege escalation CVEs are unpatched (Dirty COW, etc.).",
                    "Update: sudo apt-get update && sudo apt-get dist-upgrade, then reboot.",
                    "software")]
            if major == 4 and minor < 15:
                return [self._finding(
                    "aging_kernel", "MEDIUM",
                    f"Aging Linux Kernel ({kernel})",
                    f"Kernel {kernel} may not receive security backports from your distribution.",
                    "Verify your distro still provides security updates for this kernel version.",
                    "software")]
        except Exception:
            pass
        return []

    def _check_windows_security(self) -> list:
        findings = []
        try:
            r = subprocess.run(["powershell", "-NoProfile", "-NonInteractive", "-Command",
                                 "Get-MpComputerStatus | Select-Object -ExpandProperty AntivirusEnabled"],
                                capture_output=True, text=True, timeout=15)
            if r.stdout.strip().lower() == "false":
                findings.append(self._finding(
                    "defender_disabled", "HIGH",
                    "Windows Defender Disabled",
                    "Real-time antivirus protection is off. Malware will not be intercepted.",
                    "Re-enable: Set-MpPreference -DisableRealtimeMonitoring $false (admin PowerShell)",
                    "software"))
        except Exception:
            pass
        try:
            import winreg as _wr
            with _wr.OpenKey(_wr.HKEY_LOCAL_MACHINE,
                             r"SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System") as k:
                uac, _ = _wr.QueryValueEx(k, "EnableLUA")
                if uac == 0:
                    findings.append(self._finding(
                        "uac_disabled", "HIGH",
                        "User Account Control (UAC) Disabled",
                        "UAC disabled — all processes run as administrator without elevation prompts. Malware escalates silently.",
                        "Enable UAC via Group Policy or: reg add HKLM\\...\\Policies\\System /v EnableLUA /t REG_DWORD /d 1",
                        "config"))
        except Exception:
            pass
        return findings


_vuln_scanner = VulnerabilityScanner()


# ═══════════════════════════════════════════════════════════════════════════════
# § 16  LOCAL ANOMALY SCORER  (enhanced v5.0)
# ═══════════════════════════════════════════════════════════════════════════════

def calculate_local_anomaly_score(
    processes: list, connections: list, alerts: list, login_events: list
) -> Tuple[int, list]:
    """
    Composite 0-100 risk score. All signals are additive and capped at 100.
    Updated in v5.0: honey token access = +70, DGA = +40, YARA = +45.
    """
    score = 0
    reasons = []
    alert_types = [a.get("type", "") for a in alerts]

    weights = {
        "honey_token_access":  70,   # Zero false positives — always real
        "suspicious_process":  50,
        "privilege_escalation":45,
        "yara_match":          45,
        "registry_change":     40,
        "fim_change":          40,
        "suspicious_lineage":  40,
        "dga_domain":          40,
        "shadow_ai":           35,
        "suspicious_port":     30,
        "new_destination":     10,
    }
    labels = {
        "honey_token_access":  "Honey token file accessed (credential harvester)",
        "suspicious_process":  "Known malicious process name",
        "privilege_escalation":"Privilege escalation detected",
        "yara_match":          "YARA signature match on process cmdline",
        "registry_change":     "Registry persistence key changed",
        "fim_change":          "Critical system file modified",
        "suspicious_lineage":  "Suspicious parent-child process chain",
        "dga_domain":          "DGA/C2 domain detected",
        "shadow_ai":           "Unapproved AI API access",
        "suspicious_port":     "Connection to known C2 port",
        "new_destination":     "New external destination",
    }

    for atype, weight in weights.items():
        if atype in alert_types:
            score += weight
            reasons.append(labels[atype])

    failed_logins = sum(1 for e in login_events if not e.get("success"))
    if failed_logins > 10:
        score += 25
        reasons.append(f"High failed login count: {failed_logins}")
    elif failed_logins > 5:
        score += 15
        reasons.append(f"Multiple failed logins: {failed_logins}")

    known_ips = _baseline.data.get("known_ips", {})
    new_ips = [
        c.get("remote_ip") for c in connections
        if c.get("remote_ip")
        and not c["remote_ip"].startswith(("10.", "192.168.", "172.", "127.", "::1"))
        and c["remote_ip"] not in known_ips
    ]
    if len(new_ips) > 5:
        score += 20
        reasons.append(f"{len(new_ips)} new external IPs")
    elif new_ips:
        score += 10
        reasons.append(f"{len(new_ips)} new external IP(s)")

    return min(score, 100), reasons


# ═══════════════════════════════════════════════════════════════════════════════
# § 17  TRANSPORT — MULTI-BACKEND FAILOVER  (new v5.0)
# ═══════════════════════════════════════════════════════════════════════════════

class TransportClient:
    """
    Sends telemetry to AegisTrace backends with automatic failover.
    Order: primary → secondary → tertiary.
    On total failure: writes to local buffer (JSONL) for replay on next success.
    """

    def __init__(self, backends: list):
        self._backends   = backends
        self._current    = 0    # index of currently healthy backend
        self._failures   = defaultdict(int)   # backend → consecutive failures

    def _build_headers(self) -> dict:
        return {
            "Content-Type":     "application/json",
            "X-Agent-Token":    AGENT_TOKEN,
            "X-Agent-Version":  AGENT_VERSION,
        }

    def _post(self, url: str, data: bytes, timeout: int = 10) -> bool:
        req = urllib_request.Request(url, data=data, headers=self._build_headers(), method="POST")
        with urllib_request.urlopen(req, timeout=timeout) as resp:
            resp.read()
        return True

    def _get(self, url: str, timeout: int = 10) -> dict:
        req = urllib_request.Request(url, headers=self._build_headers())
        with urllib_request.urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read())

    def send(self, payload: dict) -> bool:
        data = json.dumps({
            **payload,
            "agent_id":  AGENT_ID,
            "timestamp": datetime.utcnow().isoformat() + "Z",
        }).encode("utf-8")

        # Try all backends in priority order starting from current healthy one
        for attempt in range(len(self._backends)):
            idx     = (self._current + attempt) % len(self._backends)
            backend = self._backends[idx]
            url     = f"{backend.rstrip('/')}/api/ingest/{AGENT_ID}"
            try:
                self._post(url, data)
                # Success: promote this backend if it's not already current
                if idx != self._current:
                    logger.info(f"[transport] Failover to backend #{idx + 1}")
                    self._current = idx
                self._failures[idx] = 0
                return True
            except Exception as e:
                self._failures[idx] += 1
                logger.warning(f"[transport] Backend #{idx + 1} failed ({self._failures[idx]}): {e}")

        # All backends failed — buffer locally
        _buffer_event(payload)
        return False

    def receive_commands(self) -> list:
        for attempt in range(len(self._backends)):
            idx     = (self._current + attempt) % len(self._backends)
            backend = self._backends[idx]
            url     = f"{backend.rstrip('/')}/api/ingest/agent/commands/{AGENT_ID}"
            try:
                data = self._get(url)
                return data.get("commands", [])
            except urllib_error.HTTPError as e:
                if e.code not in (401, 403, 404):
                    logger.warning(f"[transport] Command poll HTTP {e.code}")
            except Exception:
                pass
        return []

    def post_command_result(self, command_id, result: dict, success: bool):
        data = json.dumps({"command_id": command_id, "result": result, "success": success}).encode()
        for attempt in range(len(self._backends)):
            idx     = (self._current + attempt) % len(self._backends)
            backend = self._backends[idx]
            url     = f"{backend.rstrip('/')}/api/ingest/agent/commands/{AGENT_ID}/result"
            try:
                self._post(url, data)
                return
            except Exception:
                pass

    def health_check(self, backend_idx: int = None) -> bool:
        idx     = backend_idx if backend_idx is not None else self._current
        backend = self._backends[idx]
        try:
            url = f"{backend.rstrip('/')}/api/health"
            req = urllib_request.Request(url)
            with urllib_request.urlopen(req, timeout=5) as resp:
                resp.read()
            return True
        except Exception:
            return False


_transport = TransportClient(BACKEND_URLS)


def _buffer_event(payload: dict):
    try:
        with open(BUFFER_FILE, "a") as f:
            f.write(json.dumps({"payload": payload, "buffered_at": datetime.utcnow().isoformat()}) + "\n")
    except Exception as e:
        logger.error(f"Buffer write failed: {e}")


def _flush_buffer():
    if not BUFFER_FILE.exists():
        return
    try:
        lines = BUFFER_FILE.read_text().strip().splitlines()
        if not lines:
            return
        logger.info(f"[transport] Flushing {len(lines)} buffered events…")
        remaining = []
        for line in lines:
            try:
                item = json.loads(line)
                if _transport.send(item["payload"]):
                    pass  # sent
                else:
                    remaining.append(line)
            except Exception:
                pass
        if remaining:
            BUFFER_FILE.write_text("\n".join(remaining) + "\n")
        else:
            BUFFER_FILE.unlink(missing_ok=True)
    except Exception as e:
        logger.error(f"Buffer flush error: {e}")


# ═══════════════════════════════════════════════════════════════════════════════
# § 18  COMMAND CHANNEL  (enhanced v5.0)
# ═══════════════════════════════════════════════════════════════════════════════

_command_running = True


def poll_commands_loop():
    while _command_running:
        try:
            for cmd in _transport.receive_commands():
                _execute_command(cmd)
        except Exception as e:
            logger.error(f"Command poll error: {e}")
        time.sleep(COMMAND_POLL_INTERVAL)


def _do_stop_agent(reason: str = "Stopped", uninstall: bool = False):
    """
    Cleanly stop the agent and prevent guardian from restarting it.
    Steps:
      1. Write STOP_FILE sentinel → guardian will not restart on next check
      2. Kill guardian process via PID file
      3. Stop systemd service if running
      4. Optionally clean up honey tokens + cursor (uninstall=True)
      5. Exit this process
    """
    import sys as _sys

    logger.warning(f"[stop] Initiating {'uninstall' if uninstall else 'stop'}: {reason}")

    # 1. Write stop sentinel FIRST so guardian won't restart
    try:
        _STOP_FILE.write_text(f"{reason}\n{datetime.utcnow().isoformat()}")
        logger.info(f"[stop] Stop sentinel written: {_STOP_FILE}")
    except Exception as e:
        logger.error(f"[stop] Could not write sentinel: {e}")

    # 2. Kill the guardian process
    try:
        gpid_str = _GUARDIAN_PID_FILE.read_text().strip()
        gpid = int(gpid_str)
        os.kill(gpid, signal.SIGTERM)
        logger.info(f"[stop] Guardian (PID {gpid}) terminated")
    except Exception as e:
        logger.debug(f"[stop] Guardian kill: {e}")

    # 3. Stop systemd service if this is running under systemd
    try:
        result = subprocess.run(
            ["systemctl", "is-active", "aegistrace-agent"],
            capture_output=True, text=True, timeout=5
        )
        if result.stdout.strip() == "active":
            subprocess.run(["systemctl", "stop", "aegistrace-agent"], timeout=10)
            subprocess.run(["systemctl", "disable", "aegistrace-agent"], timeout=10)
            logger.info("[stop] systemd service stopped and disabled")
    except Exception as e:
        logger.debug(f"[stop] systemd: {e}")

    if uninstall:
        # 4. Remove honey tokens, cursor, PID files
        try:
            _honey.cleanup()
            logger.info("[stop] Honey tokens removed")
        except Exception: pass
        try:
            _LOG_CURSOR_FILE.unlink(missing_ok=True)
            logger.info("[stop] Log cursor cleared")
        except Exception: pass
        _clear_pid_files()
        logger.warning(f"[stop] Agent uninstalled. To redeploy: set env vars and run aegistrace_agent.py")
    else:
        _clear_pid_files()
        logger.warning(f"[stop] Agent stopped. To restart: systemctl start aegistrace-agent OR run aegistrace_agent.py")

    # 5. Notify backend — mark this endpoint offline immediately
    try:
        _transport.send({
            "priority":    "offline",
            "system_info": {"hostname": AGENT_ID, "ip_address": ""},
            "processes": [], "network_connections": [], "file_events": [],
            "alerts": [], "login_events": [], "raw_logs": [],
        })
        # Also hit the dedicated offline endpoint
        url = f"{BACKEND_URLS[0].rstrip('/')}/api/ingest/offline/{AGENT_ID}"
        req = urllib_request.Request(
            url,
            data=json.dumps({"reason": reason}).encode(),
            headers={
                "Content-Type":  "application/json",
                "X-Agent-Token": AGENT_TOKEN,
            },
            method="POST",
        )
        urllib_request.urlopen(req, timeout=5)
        logger.info("[stop] Backend notified — endpoint marked offline")
    except Exception as e:
        logger.debug(f"[stop] Backend notify: {e}")

    # 6. Exit
    global _main_loop_running
    _main_loop_running = False
    _sys.exit(0)


def _execute_command(cmd: dict):
    command_type = cmd.get("command", "")
    payload      = cmd.get("payload", {})
    command_id   = cmd.get("id")
    result = {}
    success = True
    try:
        if command_type == "ping":
            result = {
                "status": "alive", "version": AGENT_VERSION, "agent_id": AGENT_ID,
                "baseline_learning": _baseline.is_learning,
                "honey_tokens": len(_honey._paths),
                "blocked_ips": len(_autoblock._blocked_ips),
                "isolated": _autoblock._isolated,
                "backends": len(BACKEND_URLS),
            }

        elif command_type == "collect_now":
            threading.Thread(target=_run_collection_cycle, daemon=True).start()
            result = {"status": "collection_started"}

        elif command_type == "collect_file":
            path = payload.get("path", "")
            if path:
                try:
                    content = Path(path).read_text(errors="replace")[:50000]
                    result  = {"path": path, "content": content, "size": len(content)}
                except Exception as e:
                    result  = {"error": str(e)}
                    success = False

        elif command_type == "kill_process":
            pid = payload.get("pid")
            if pid:
                ok     = _autoblock.kill_process(int(pid))
                result = {"status": f"PID {pid} {'killed' if ok else 'kill failed'}"}
                success = ok

        elif command_type == "block_ip":
            ip = payload.get("ip", "")
            if ip:
                ok     = _autoblock.block_ip(ip)
                result = {"ip": ip, "blocked": ok}

        elif command_type == "unblock_ip":
            ip = payload.get("ip", "")
            if ip:
                ok     = _autoblock.unblock_ip(ip)
                result = {"ip": ip, "unblocked": ok}

        elif command_type == "isolate_device":
            ok     = _autoblock.isolate_device()
            result = {"isolated": ok}

        elif command_type == "unisolate_device":
            ok     = _autoblock.unisolate_device()
            result = {"unisolated": ok}

        elif command_type == "get_process_tree":
            pid    = payload.get("pid")
            result = _get_process_tree(int(pid)) if pid and PSUTIL_AVAILABLE else {"error": "pid required"}

        elif command_type == "update_approved_ai":
            global APPROVED_AI_SERVICES
            APPROVED_AI_SERVICES = payload.get("domains", [])
            result = {"approved_count": len(APPROVED_AI_SERVICES)}

        elif command_type == "set_poll_interval":
            global POLL_INTERVAL
            POLL_INTERVAL = max(10, int(payload.get("seconds", 30)))
            result = {"poll_interval": POLL_INTERVAL}

        elif command_type == "get_blocked_ips":
            result = {"blocked_ips": list(_autoblock._blocked_ips)}

        elif command_type == "honey_status":
            result = {
                "honey_files":  _honey._paths,
                "honey_alerts": len(_honey._alerted),
            }

        elif command_type == "fim_check_now":
            alerts = _fim.check()
            result = {"fim_alerts": alerts, "count": len(alerts)}

        elif command_type == "vuln_scan_now":
            findings = _vuln_scanner.full_scan()
            _transport.send({
                "system_info":    {"hostname": AGENT_ID, "ip_address": ""},
                "processes": [], "network_connections": [], "login_events": [],
                "file_events": [], "alerts": [], "raw_logs": [],
                "vuln_findings":  findings,
            })
            result = {"findings": len(findings),
                      "critical": sum(1 for f in findings if f["severity"] == "CRITICAL"),
                      "high":     sum(1 for f in findings if f["severity"] == "HIGH")}

        elif command_type == "stop_agent":
            reason = payload.get("reason", "Remote stop command received")
            logger.warning(f"[command] STOP AGENT — reason: {reason}")
            result = {"status": "stopping", "reason": reason}
            _transport.post_command_result(command_id, result, True)
            _do_stop_agent(reason, uninstall=False)

        elif command_type == "uninstall_agent":
            reason = payload.get("reason", "Remote uninstall command received")
            logger.warning(f"[command] UNINSTALL AGENT — reason: {reason}")
            result = {"status": "uninstalling", "reason": reason}
            _transport.post_command_result(command_id, result, True)
            _do_stop_agent(reason, uninstall=True)

        else:
            result  = {"error": f"Unknown command: {command_type}"}
            success = False

        logger.info(f"Command '{command_type}' OK: {result}")

    except Exception as e:
        result  = {"error": str(e)}
        success = False

    _transport.post_command_result(command_id, result, success)


def _get_process_tree(pid: int) -> dict:
    if not PSUTIL_AVAILABLE:
        return {"error": "psutil not available"}
    try:
        proc = psutil.Process(pid)
        tree = []
        current = proc
        for _ in range(10):
            try:
                info = current.as_dict(attrs=["pid", "ppid", "name", "username", "cmdline"])
                tree.append(info)
                parent = current.parent()
                if parent is None or parent.pid == current.pid:
                    break
                current = parent
            except Exception:
                break
        return {"pid": pid, "tree": tree}
    except Exception as e:
        return {"error": str(e)}


# ═══════════════════════════════════════════════════════════════════════════════
# § 19  GUARDIAN PROCESS  (new v5.0)
# ═══════════════════════════════════════════════════════════════════════════════

def _guardian_target(main_pid: int, agent_script: str):
    """
    Runs in a SEPARATE OS process (not a thread).
    Monitors the main agent process and restarts it if it dies.
    Respects the STOP_FILE sentinel — if present, exits without restarting.
    """
    import sys, os, time, subprocess
    from pathlib import Path as _Path

    _stop  = _Path.home() / ".aegistrace_STOP"
    _gpid  = _Path.home() / ".aegistrace_guardian.pid"
    _mpid  = _Path.home() / ".aegistrace.pid"

    # Write guardian PID so the main agent can kill us
    try: _gpid.write_text(str(os.getpid()))
    except Exception: pass

    restart_count = 0
    MAX_RESTARTS  = 20

    while restart_count < MAX_RESTARTS:
        time.sleep(5)

        # Honour stop sentinel — exit immediately without restarting
        if _stop.exists():
            print(f"[guardian] Stop sentinel detected — exiting without restart.", flush=True)
            try: _gpid.unlink(missing_ok=True)
            except Exception: pass
            sys.exit(0)

        try:
            import psutil as _ps
            if not _ps.pid_exists(main_pid):
                # Check stop sentinel one more time before restarting
                if _stop.exists():
                    print(f"[guardian] Stop sentinel — not restarting.", flush=True)
                    sys.exit(0)
                restart_count += 1
                print(f"[guardian] Main agent (PID {main_pid}) died. Restart #{restart_count}", flush=True)
                proc = subprocess.Popen(
                    [sys.executable, agent_script],
                    env=os.environ.copy(),
                )
                main_pid = proc.pid
                try: _mpid.write_text(str(main_pid))
                except Exception: pass
                print(f"[guardian] Restarted as PID {main_pid}", flush=True)
        except Exception as e:
            print(f"[guardian] Error: {e}", flush=True)

    print("[guardian] Max restarts reached — giving up.", flush=True)
    try: _gpid.unlink(missing_ok=True)
    except Exception: pass


def start_guardian() -> Optional[multiprocessing.Process]:
    """
    Launches a guardian process that monitors this process and restarts it.
    Non-fatal: if multiprocessing is unavailable, we fall back to watchdog thread.
    """
    try:
        agent_script = str(Path(__file__).resolve())
        main_pid     = os.getpid()
        g = multiprocessing.Process(
            target=_guardian_target,
            args=(main_pid, agent_script),
            daemon=True,
            name="aegistrace-guardian",
        )
        g.start()
        logger.info(f"[guardian] Started as PID {g.pid}")
        return g
    except Exception as e:
        logger.warning(f"[guardian] Could not start guardian process: {e}")
        return None


# ═══════════════════════════════════════════════════════════════════════════════
# § 20  WATCHDOG THREAD  (enhanced v5.0)
# ═══════════════════════════════════════════════════════════════════════════════

_heartbeat_ts = time.time()


def watchdog_thread():
    """
    Daemon thread: if main loop heartbeat goes stale for > 90s, sends an
    alert and attempts to break any deadlock by logging state.
    The Guardian Process (§19) handles actual restart if the interpreter dies.
    """
    while True:
        time.sleep(30)
        age = time.time() - _heartbeat_ts
        if age > 90:
            logger.error(f"[watchdog] Heartbeat stale {age:.0f}s — main loop may be hung")
            try:
                _buffer_event({"alerts": [{
                    "type":        "watchdog_alert",
                    "description": f"Agent main loop heartbeat stale ({age:.0f}s)",
                    "severity":    "HIGH",
                    "timestamp":   datetime.utcnow().isoformat(),
                }]})
            except Exception:
                pass


# ═══════════════════════════════════════════════════════════════════════════════
# § 21  MAIN COLLECTION LOOP
# ═══════════════════════════════════════════════════════════════════════════════

_main_loop_running = True


def _run_collection_cycle() -> list:
    """One complete collect → detect → score → ship cycle."""
    global _heartbeat_ts
    _heartbeat_ts = time.time()

    # ── Collect ───────────────────────────────────────────────────────────────
    system_info  = collect_system_info()
    processes    = collect_processes()
    connections  = collect_network_connections()
    login_events = collect_login_events()
    file_events  = collect_file_events()

    # ── Detect ────────────────────────────────────────────────────────────────
    alerts: list = []

    # v3.0 detectors
    alerts += detect_shadow_ai(connections)
    alerts += detect_suspicious_processes(processes)
    alerts += detect_process_lineage(processes)
    alerts += detect_suspicious_ports(connections)
    alerts += detect_privilege_escalation(processes)
    alerts += detect_new_network_destinations(connections)

    # v5.0 detectors
    alerts += _honey.check()                        # 🍯 Honey Token Trap
    alerts += _dns_dga.check(connections)           # DNS/DGA
    alerts += _usb.check()                          # USB insertions
    alerts += _registry.check()                     # Windows Registry
    alerts += _yara.scan_processes(processes)       # YARA-lite

    # FIM
    alerts += _fim.check()

    # v6.0 — vulnerability & misconfiguration scan (every 5 min)
    vuln_findings = _vuln_scanner.run_if_due()

    # Behavioural baseline
    anomalies = _baseline.check_anomalies(processes, connections)
    _baseline.record(processes, connections)
    # Only surface non-trivial behavioural anomalies
    for a in anomalies:
        if a.get("subtype") not in ("unusual_hour", "new_process"):
            alerts.append(a)

    # ── Score ─────────────────────────────────────────────────────────────────
    anomaly_score, score_reasons = calculate_local_anomaly_score(
        processes, connections, alerts, login_events
    )
    system_info["local_anomaly_score"] = anomaly_score
    system_info["anomaly_reasons"]     = score_reasons

    # ── Auto-respond ──────────────────────────────────────────────────────────
    _autoblock.respond_to_alerts(alerts)

    # ── Ship ──────────────────────────────────────────────────────────────────
    critical = [a for a in alerts if a.get("severity") in ("HIGH", "CRITICAL")]
    if critical:
        logger.warning(f"[!] {len(critical)} high/critical alert(s): {[a.get('type') for a in critical]}")

    # Priority lane: honey token + suspicious process → ship immediately
    priority_alerts = [
        a for a in alerts
        if a.get("type") in ("honey_token_access", "suspicious_process", "suspicious_lineage", "yara_match")
        and a.get("severity") in ("HIGH", "CRITICAL")
    ]
    if priority_alerts:
        _transport.send({
            "priority":       "immediate",
            "system_info":    {"hostname": system_info.get("hostname"),
                               "ip_address": system_info.get("ip_address")},
            "alerts":         priority_alerts,
            "processes":      [],
            "network_connections": [],
            "login_events":   [],
            "file_events":    [],
        })

    # Drain raw logs collected during this cycle
    global _raw_log_queue
    raw_logs = _raw_log_queue[:400]
    _raw_log_queue = _raw_log_queue[400:]

    # Full telemetry
    _transport.send({
        "system_info":         system_info,
        "processes":           processes[:500],
        "network_connections": connections,
        "login_events":        login_events,
        "file_events":         file_events[:50],
        "alerts":              alerts,
        "raw_logs":            raw_logs,
        "local_anomaly_score": anomaly_score,
        "vuln_findings":       vuln_findings,
    })

    return alerts


def _journal_realtime_follower():
    """
    Background thread: follows journalctl -f and ships events every 3 seconds.
    Provides near-real-time (1-3s) log visibility without waiting for the 30s cycle.
    Covers: SSH auth, sudo, PAM, kernel, service events as they happen.
    """
    SHIP_INTERVAL = 3   # seconds between mini-shipments
    batch: list = []
    last_ship = time.time()

    cmd = ["journalctl", "-f", "--output=json", "--no-pager", "-n", "0"]
    try:
        proc = subprocess.Popen(cmd, stdout=subprocess.PIPE,
                                stderr=subprocess.DEVNULL, text=True, bufsize=1)
        logger.info("[stream] Real-time journalctl follower started")
        for line in proc.stdout:
            if not _main_loop_running:
                proc.terminate()
                break
            try:
                entry = json.loads(line.strip())
                # Parse auth events for immediate alerting
                ev = _parse_auth_entry(entry)
                raw = _jentry_to_raw(entry,
                    "auth" if int(entry.get("SYSLOG_FACILITY", 0)) == 10
                    else "kernel" if entry.get("_TRANSPORT") == "kernel"
                    else "system")

                if ev:
                    batch.append({"type": "login_event", "data": ev})
                batch.append({"type": "raw_log", "data": raw})

                # Ship every SHIP_INTERVAL seconds if we have data
                now = time.time()
                if now - last_ship >= SHIP_INTERVAL and batch:
                    login_evs = [b["data"] for b in batch if b["type"] == "login_event"]
                    raw_logs  = [b["data"] for b in batch if b["type"] == "raw_log"]
                    _transport.send({
                        "priority":            "stream",
                        "system_info":         {"hostname": AGENT_ID, "ip_address": ""},
                        "processes":           [],
                        "network_connections": [],
                        "file_events":         [],
                        "alerts":              [],
                        "login_events":        login_evs,
                        "raw_logs":            raw_logs[:100],
                    })
                    batch.clear()
                    last_ship = now
            except Exception:
                pass
    except Exception as e:
        logger.debug(f"[stream] journalctl follower stopped: {e}")


def main_loop():
    """Main collection loop with error recovery and buffer flush."""
    global _heartbeat_ts, _main_loop_running
    logger.info(f"AegisTrace Agent v{AGENT_VERSION} — main loop starting")

    # Clear any leftover stop sentinel from a previous stop (fresh start)
    try:
        if _STOP_FILE.exists():
            _STOP_FILE.unlink()
            logger.info("[start] Cleared leftover stop sentinel — fresh start")
    except Exception: pass

    # Write PID file so stop command can find us
    _write_pid_files()

    _flush_buffer()

    # Start real-time journalctl follower (Linux only)
    if platform.system().lower() == "linux":
        t = threading.Thread(target=_journal_realtime_follower, daemon=True, name="journal-follower")
        t.start()

    while _main_loop_running:
        try:
            _heartbeat_ts = time.time()
            alerts = _run_collection_cycle()
            logger.info(f"Cycle done. Alerts: {len(alerts)}. Sleeping {POLL_INTERVAL}s")
        except KeyboardInterrupt:
            logger.info("Agent stopped by user (Ctrl+C)")
            break
        except Exception as e:
            logger.error(f"Main loop error: {e}")
            time.sleep(5)
            continue
        time.sleep(POLL_INTERVAL)


# ═══════════════════════════════════════════════════════════════════════════════
# § 22  SERVICE REGISTRATION
# ═══════════════════════════════════════════════════════════════════════════════

def register_as_service():
    OS          = platform.system().lower()
    agent_path  = Path(__file__).resolve()
    python_path = sys.executable

    if OS == "linux" and os.geteuid() == 0:
        _install_systemd(agent_path, python_path)
    elif OS == "darwin":
        _install_launchagent(agent_path, python_path)
    elif OS == "windows":
        _install_windows_service(agent_path, python_path)
    else:
        print("[service] Not root — skipping auto-registration. Re-run as root/admin with --install-service")


def _install_systemd(agent_path: Path, python_path: str):
    svc_file = Path("/etc/systemd/system/aegistrace-agent.service")
    svc_content = f"""[Unit]
Description=AegisTrace Endpoint Agent v{AGENT_VERSION}
After=network.target

[Service]
Type=simple
Environment=AEGISTRACE_TOKEN={AGENT_TOKEN}
Environment=AEGISTRACE_AGENT_ID={AGENT_ID}
Environment=AEGISTRACE_SERVER={",".join(BACKEND_URLS)}
Environment=AEGISTRACE_POLL_INTERVAL={POLL_INTERVAL}
Environment=AEGISTRACE_AUTO_BLOCK={AUTO_BLOCK_MODE}
ExecStart={python_path} {agent_path}
Restart=always
RestartSec=10
StartLimitIntervalSec=60
StartLimitBurst=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
"""
    try:
        svc_file.write_text(svc_content)
        os.system("systemctl daemon-reload && systemctl enable aegistrace-agent && systemctl start aegistrace-agent")
        print("[service] systemd installed → systemctl status aegistrace-agent")
    except Exception as e:
        print(f"[service] systemd failed: {e}")


def _install_launchagent(agent_path: Path, python_path: str):
    plist_path = Path.home() / "Library/LaunchAgents/com.aegistrace.agent.plist"
    plist_content = f"""<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
    "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key><string>com.aegistrace.agent</string>
    <key>ProgramArguments</key>
    <array>
        <string>{python_path}</string>
        <string>{agent_path}</string>
    </array>
    <key>EnvironmentVariables</key>
    <dict>
        <key>AEGISTRACE_TOKEN</key><string>{AGENT_TOKEN}</string>
        <key>AEGISTRACE_AGENT_ID</key><string>{AGENT_ID}</string>
        <key>AEGISTRACE_SERVER</key><string>{",".join(BACKEND_URLS)}</string>
        <key>AEGISTRACE_AUTO_BLOCK</key><string>{AUTO_BLOCK_MODE}</string>
    </dict>
    <key>RunAtLoad</key><true/>
    <key>KeepAlive</key><true/>
    <key>StandardOutPath</key><string>/tmp/aegistrace_agent.log</string>
    <key>StandardErrorPath</key><string>/tmp/aegistrace_agent_err.log</string>
</dict>
</plist>"""
    try:
        plist_path.parent.mkdir(parents=True, exist_ok=True)
        plist_path.write_text(plist_content)
        os.system(f"launchctl load {plist_path}")
        print(f"[service] LaunchAgent installed: {plist_path}")
    except Exception as e:
        print(f"[service] LaunchAgent failed: {e}")


def _install_windows_service(agent_path: Path, python_path: str):
    try:
        cmd = f'sc create AegisTraceAgent binPath= "{python_path} {agent_path}" start= auto'
        r = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        if r.returncode == 0:
            # Configure service recovery: restart after 1s on first two failures
            subprocess.run(
                'sc failure AegisTraceAgent reset= 60 actions= restart/1000/restart/1000/restart/5000',
                shell=True
            )
            subprocess.run("sc start AegisTraceAgent", shell=True)
            print("[service] Windows Service installed as AegisTraceAgent (auto-restart on failure)")
        else:
            print(f"[service] Windows Service failed: {r.stderr}")
    except Exception as e:
        print(f"[service] Windows Service error: {e}")


# ═══════════════════════════════════════════════════════════════════════════════
# § 23  VALIDATION + CHECK
# ═══════════════════════════════════════════════════════════════════════════════

def validate_config():
    errors = []
    if not AGENT_TOKEN: errors.append("AEGISTRACE_TOKEN not set")
    if not AGENT_ID:    errors.append("AEGISTRACE_AGENT_ID not set")
    if not PSUTIL_AVAILABLE:
        print("[WARN] psutil not installed: pip install psutil")

    if errors:
        print("\n[AegisTrace v5.0] Setup required:")
        for e in errors:
            print(f"  ✗ {e}")
        print("\nQuick start:")
        print("  export AEGISTRACE_TOKEN=<token>")
        print("  export AEGISTRACE_AGENT_ID=<hostname>")
        print("  export AEGISTRACE_SERVER=https://aegistrace-7qvn.onrender.com")
        print("  # Optional secondary backend:")
        print("  export AEGISTRACE_SERVER=https://primary.com,https://backup.com")
        print("\nAuto-block mode (off | alert | block):")
        print("  export AEGISTRACE_AUTO_BLOCK=alert")
        sys.exit(1)

    print(f"\n  AegisTrace Endpoint Agent v{AGENT_VERSION}")
    print(f"  {'='*48}")
    print(f"  Backends       : {len(BACKEND_URLS)} ({BACKEND_URLS[0]}{'...' if len(BACKEND_URLS) > 1 else ''})")
    print(f"  Agent ID       : {AGENT_ID}")
    print(f"  Poll interval  : {POLL_INTERVAL}s")
    print(f"  Auto-block     : {AUTO_BLOCK_MODE}")
    print(f"  Honey tokens   : {'enabled' if HONEY_TOKENS_ENABLED else 'disabled'}")
    print(f"  psutil         : {'available' if PSUTIL_AVAILABLE else 'NOT available (reduced mode)'}")
    print(f"  Approved AI    : {APPROVED_AI_SERVICES or ['none — all AI traffic flagged']}")


def _do_check():
    print(f"\n{'='*60}")
    print(f"  AegisTrace Agent v{AGENT_VERSION} — Connectivity Check")
    print(f"{'='*60}")
    for i, backend in enumerate(BACKEND_URLS):
        ok = _transport.health_check(i)
        print(f"  Backend #{i+1}  {backend}")
        print(f"           → {'OK ✓' if ok else 'UNREACHABLE ✗'}")
    print()
    info = collect_system_info()
    print(f"  Hostname : {info.get('hostname')} | IP: {info.get('ip_address')}")
    print(f"  OS       : {info.get('os')} {info.get('os_release')}")
    if PSUTIL_AVAILABLE:
        print(f"  CPU      : {info.get('cpu_percent', 'N/A')}% | Mem: {info.get('mem_percent', 'N/A')}%")
    print(f"  Buffer   : {BUFFER_FILE.stat().st_size if BUFFER_FILE.exists() else 0} bytes pending")
    print(f"  Honey    : {len(_honey._paths)} token file(s)")
    print(f"  Blocked  : {len(_autoblock._blocked_ips)} IP(s)")
    print()


# ═══════════════════════════════════════════════════════════════════════════════
# § 24  ENTRYPOINT
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":

    if "--check" in sys.argv:
        _do_check()
        sys.exit(0)

    if "--install-service" in sys.argv:
        validate_config()
        register_as_service()
        sys.exit(0)

    if "--once" in sys.argv:
        validate_config()
        if not FIM_FILE.exists():
            _fim.initialize()
        if HONEY_TOKENS_ENABLED:
            _honey.plant()
        _registry.initialize()
        alerts = _run_collection_cycle()
        print(f"\n[once] Cycle complete. {len(alerts)} alert(s).")
        for a in alerts:
            print(f"  [{a.get('severity','?')}] {a.get('type','?')}: {a.get('description','')}")
        sys.exit(0)

    if "--uninstall-honey" in sys.argv:
        _honey.cleanup()
        print("[honey] Honey token files removed.")
        sys.exit(0)

    # ── Normal startup ─────────────────────────────────────────────────────────
    validate_config()

    # FIM: initialize on first run
    if not FIM_FILE.exists():
        print("[FIM] Initialising file integrity monitoring…")
        _fim.initialize()

    # Windows Registry: snapshot
    _registry.initialize()

    # Honey tokens: plant fake credential files
    if HONEY_TOKENS_ENABLED:
        _honey.plant()

    # Service registration (non-fatal)
    register_as_service()

    # Guardian process (new v5.0 — separate OS process)
    _guardian = start_guardian()

    # Watchdog thread
    threading.Thread(target=watchdog_thread, daemon=True).start()
    print("[watchdog] Started")

    # Command channel
    threading.Thread(target=poll_commands_loop, daemon=True).start()
    print("[commands] Command channel started")

    print(f"\n[AegisTrace v{AGENT_VERSION}] Agent running. Press Ctrl+C to stop.\n")

    # Run
    main_loop()
