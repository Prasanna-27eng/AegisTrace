# AegisTrace Endpoint Agent

A single Python file that runs silently on any machine and ships logs to your AegisTrace instance.

## Quick Start (3 steps)

### Step 1 — Get your Ingest Key
1. Log into AegisTrace
2. Go to **Admin → System** tab
3. Copy the **Ingest API Key**

### Step 2 — Configure the agent
Edit `aegistrace_agent.py` and set:
```python
AEGISTRACE_URL = "https://aegistrace-7qvn.onrender.com"
INGEST_KEY     = "your-ingest-key-here"
```

### Step 3 — Run it
```bash
python3 aegistrace_agent.py
```

Logs appear in AegisTrace at `/app/endpoints` within 5 minutes.

---

## Install as a Background Service

### Linux (systemd)
```bash
sudo python3 aegistrace_agent.py --install-service
```
Then check status:
```bash
systemctl status aegistrace-agent
```

### Mac (LaunchAgent — auto-starts on login)
```bash
python3 aegistrace_agent.py --install-launchd
```

### Windows (Task Scheduler)
1. Open **Task Scheduler** → Create Basic Task
2. Name: `AegisTrace Agent`
3. Trigger: **At startup** + repeat every **5 minutes**
4. Action: `python.exe "C:\path\to\aegistrace_agent.py"`
5. Run whether user is logged on or not
6. Run with highest privileges: ✓

---

## What It Collects

### Linux / Mac
| Source | Type |
|---|---|
| `/var/log/auth.log` | SSH logins, sudo, su |
| `/var/log/syslog` | System events |
| `journalctl` | Systemd service events |
| `/var/log/nginx/access.log` | Web access |
| `/var/log/apache2/access.log` | Web access |
| `ps aux` | Running processes snapshot |
| `ss -tunp` | Active network connections |

### Windows
| Source | Type |
|---|---|
| Windows Security Events | 4624 (login), 4625 (failed login), 4720 (new user), 4726 (user deleted), 4698 (scheduled task) |
| Windows System Events | 7045 (new service), 7040 (service changed) |
| PowerShell History | All commands typed in PS |
| Process list | `Get-Process` snapshot |
| Network connections | `Get-NetTCPConnection` |

---

## Configuration Options

```python
INTERVAL_SECONDS = 300     # How often to ship (default: 5 min)
MAX_LINES        = 500     # Lines per log file per run
AUTO_ANALYSE     = True    # AI analysis on arrival
AUTO_CASE        = True    # Create case if threat score > threshold
THREAT_THRESHOLD = 60      # Score 0-100 (default: 60)
TAGS             = ["prod", "finance"]  # Optional labels
```

---

## How It Avoids Duplicate Logs

The agent tracks its position in each log file using `aegistrace_agent_state.json`.
On each run, it only ships lines added since the last run. Log rotations are handled automatically.

---

## Security

- All traffic goes over HTTPS (TLS)
- The ingest key is sent as `X-AegisTrace-Key` header
- The key never appears in log files
- No data is stored locally beyond the state file

---

## Troubleshooting

**Agent starts but no data in AegisTrace:**
- Check the ingest key matches what's in Admin → System
- Verify the AegisTrace URL includes `https://`
- Check `aegistrace_agent.log` for errors

**Permission denied on log files:**
- Linux: Run as root or add your user to the `adm` group (`sudo usermod -aG adm $USER`)
- Windows: Run as Administrator or SYSTEM account in Task Scheduler

**AI analysis not running:**
- Check that the GROQ_API_KEY is set in Render dashboard
- Verify `/api/health` returns `{"groq": true}`
