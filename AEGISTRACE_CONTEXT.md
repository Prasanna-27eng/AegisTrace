# AEGISTRACE — MASTER CONTEXT FILE
**Version:** v5.1 | **Last updated:** June 2026
**Purpose:** Give this file to Claude at the start of any new session. It replaces the need to re-read all source files.

---

## 🤖 INSTRUCTIONS FOR CLAUDE (READ THIS FIRST — EVERY SESSION)

You are working on AegisTrace, a security product built by Prasanna. Here is exactly how to operate:

**Before doing ANYTHING:**
1. Read this entire file top to bottom before writing a single line of code
2. Check the `## FULL FUTURE WORK BACKLOG` section — that is the source of truth for what to build next
3. Check `## SECURITY FIXES NEEDED` — those are confirmed vulnerabilities, fix them before new features
4. Never re-read the full codebase — this file is sufficient. If you need a specific file, read only that file.

**Rules for every session:**
- Theme is now **pure black** (v5.1): backgrounds #000000/#080808/#101010, text #EBEBEB/#A8A8A8/#686868, accent #4DA3FF/#4A8EDB/#9C7CFF. Never revert to blue-navy.
- Use inline styles only — this codebase does NOT use Tailwind CSS
- Do NOT add `@tanstack/react-query`, `recharts`, `alembic`, or any new npm packages without explicit approval
- All models go in `backend/models.py` — never create separate model files
- No Alembic migrations — SQLModel's `create_all()` handles new tables automatically on startup
- SQLite is the database — `func.date_trunc` does NOT work, use `strftime('%Y-%W', ...)` instead
- After completing work, update this file: mark tasks done, add new discoveries

**When Prasanna says "start the next task":**
→ Look at the backlog below, pick the highest-priority unchecked item, confirm it with him, then build it.

**When Prasanna says "push to GitHub":**
→ Give him these exact commands (the sandbox can't push, he must run them):
```bash
cd ~/Documents/Claude/Projects/aegistrace
rm -f .git/index.lock .git/HEAD.lock
git add -A
git commit -m "your message here"
git push origin main
```

**When Prasanna says "what's next?":**
→ Read the backlog, summarise the top 3 options with time estimates, let him choose.

---

## WHAT IS AEGISTRACE?

AegisTrace is a **free, open-source Trust Operating System for the AI-agent era** — the security layer that tracks every identity (human, service account, AI agent, token), makes every AI decision auditable with a full reasoning chain, and requires human approval before every automated action executes. It is the only free platform that combines identity-first threat detection, explainable AI, hardware attack tool forensics, a terminal lab, and an AI agent approval queue — all on free-tier infrastructure.

**Core conviction:** Attackers no longer break in. They become trusted. AegisTrace is how you defend the trust surface.

**Built by:** Prasanna Kumar Surendran, Blue Team analyst, Dublin, Ireland  
**Live at:** https://aegistrace-7qvn.onrender.com  
**GitHub:** https://github.com/Prasanna-27eng/AegisTrace  
**Stack:** React 18 · FastAPI · SQLite/SQLModel · Groq API · Docker · Render free tier

---

## THE VISION (precise)

AegisTrace is becoming the **trust control plane for the AI-agent era** — a platform where every identity (human, service, agent, token) is a first-class security entity, every AI decision is explainable and auditable, and every automated action requires human approval before it executes.

The question it is built to answer: **"Which identity, agent, workflow, or prompt caused this breach — and can I trust the AI's conclusion?"**

Three convictions drive every design decision:
1. **Identity is the perimeter** — 83% of breaches involve stolen credentials or identity abuse. Track identities, not just machines.
2. **Black-box AI is unacceptable in security** — every verdict must show its evidence, reasoning chain, and confidence. No exceptions.
3. **Human control must be preserved** — AI suggests, humans confirm. Every automated action has an approval layer and an audit trail.

---

## ARCHITECTURE

```
frontend/           React 18 SPA (react-router-dom, axios, zustand)
  src/pages/        Public pages + app pages
  src/components/   Reusable: Sidebar, CommandPalette, Logo, Toast, etc.
  src/store/        Zustand slices (split in v4.3): useAuthStore, useCaseStore,
                    useUIStore, useIdentityStore, useConnectorStore + legacy useStore

backend/            FastAPI (Python)
  main.py           Entry point, router registration, startup, slowapi limiter
  models.py         SQLModel table definitions (ALL DB tables — never split)
  database.py       SQLite connection + WAL mode PRAGMAs + create_db_and_tables()
  routers/          One file per feature area (see below)
  core/
    identity_engine.py    Pluggable risk detectors
    cache.py              TTL cache (no new packages)
    events.py             Internal event bus (singleton event_bus)
    connectors/           Connector plugin architecture
      base.py             BaseConnector abstract class
      azure_ad.py         Microsoft Graph app-only auth
      okta.py             Okta API token
      csv_import.py       CSV upload + column mapping

agent/              aegistrace_agent.py (v5.0 — 2432 lines, production-grade EDR)
                    install.sh — one-command installer (v5.0)
Dockerfile          Multi-stage: frontend build → FastAPI server
render.yaml         Render free-tier deploy config (autoDeploy: true)
```

### Backend Routers (all registered in main.py)
| Router | Prefix | Purpose |
|--------|--------|---------|
| auth | /api/auth | JWT login, bcrypt passwords, logout (token invalidation) |
| cases | /api/cases | Case CRUD, autosave, share, status |
| vt | /api/vt | VirusTotal v3 + history (rate limited: 10/min) |
| email_router | /api/email | Email forensics (SPF/DKIM/DMARC) |
| ioc | /api/ioc | IOC extraction + cross-case correlation |
| terminal_lab | /api/terminal | Terminal Lab sessions + command runner |
| reports | /api/reports | PDF/DOCX/DORA/DPDPA report generation |
| public | /api/public | Public case gallery, demo-analyse |
| portfolio | /api/portfolio | Stats for public portfolio page |
| webhooks | /api/webhooks | Slack-compatible HMAC webhooks |
| hunt | /api/hunt | Threat hunt: cross-case IOC correlation |
| audit | /api/audit | Audit log (all actions) |
| ingest | /api/ingest | Agent telemetry ingestion + command channel |
| enrichment | /api/enrichment | Multi-source IOC enrichment (rate limited: 20/min) |
| edr | /api/edr | EDR integrations (CS/SentinelOne/CB) |
| pcap | /api/pcap | PCAP file analysis |
| feeds | /api/feeds | Live threat feeds (CISA/URLhaus/etc.) |
| identity | /api/identity | Identity Graph nodes + edges |
| provenance | /api/provenance | Provenance Ledger + Trust Events |
| analytics | /api/analytics | Aggregated stats (severity, SLA, etc.) |
| comments | /api/cases/{id}/comments | Case comments CRUD |
| policies | /api/policies | Access control policy engine |
| itdr | /api/itdr | Identity Threat Detection & Response (6 detectors) |
| agent_security | /api/agent-security | AI action approval queue |
| schedule_reports | — | Scheduled email reports (SendGrid) |
| malware | /api/malware | Base64/hash/defang utilities |
| hardware_tools | /api/hardware | Hardware attack tool log analysis |
| connectors | /api/connectors | Identity provider OAuth + sync (v4.3) |
| nhi | /api/nhi | NHI health, sprawl scores, trust decay (v4.3) |
| health | /api/health | Platform health check — no auth (v4.3) |

---

## DATABASE MODELS (backend/models.py)

**Core:** `User`, `Case`, `IOCCorrelation`, `TimelineEvent`, `VTHistory`, `AuditLog`, `WebhookConfig`, `Endpoint`, `LogBatch`

**v3.0 additions:** `TerminalSession`, `TerminalCommand`, `IdentityNode`, `IdentityEdge`, `TrustEvent`, `ProvenanceLedger`, `CaseComment`, `InvestigationTemplate`, `AgentAction`

**v4.3 additions:** `IdentityConnector`, `ApprovedAIService`, `ShadowAIEvent`, `TokenBlocklist`, `AgentCommand`, `ITDRAlert`

**Key model fields:**
- `ProvenanceLedger`: `action_type`, `model_used`, `actor`, `confidence_score`, `approval_status` (auto|pending|approved|rejected), `approved_by`, `evidence_used`, `reasoning`, `case_id`, `timestamp`
- `Case`: `title`, `description`, `findings`, `severity`, `status`, `iocs` (JSON), `mitre_techniques` (JSON), `ai_executive_summary`, `recommendations`, `closure_notes`, `analyst_name`, `case_number`, `is_public`, `share_token`, `incident_type`
- `IdentityNode` (updated v4.3): `label`, `node_type` (user|service_account|api_key|token|device|agent|prompt), `risk_score`, `is_compromised`, `metadata_json`, `last_active`, `expiry_date`, `privilege_level` (low|medium|high|admin), `is_orphaned`, `credential_sprawl_score`, `trust_score_history` (JSON), `anomaly_count_7d`, `source_connector`
- `IdentityConnector`: `id`, `org_name`, `connector_type` (azure_ad|okta|google|csv|scim), `client_id`, `encrypted_token`, `tenant_id`, `domain`, `last_sync`, `sync_status`, `identities_discovered`, `last_error`, `created_by`, `is_active`
- `ApprovedAIService`: `id`, `service_name`, `api_domain`, `is_approved`, `added_by`, `added_at`
- `ShadowAIEvent`: `id`, `agent_id` (FK Endpoint), `process_name`, `process_pid`, `destination_domain`, `destination_ip`, `detected_at`, `is_reviewed`, `reviewed_by`, `case_id`
- `TokenBlocklist`: `id`, `token_jti` (unique, indexed), `blocked_at`, `expires_at`, `user_id`
- `ITDRAlert`: `id`, `alert_type`, `severity`, `identity_label`, `node_id`, `description`, `evidence` (JSON), `status`, `resolved_by`, `case_id`, `detected_at`

---

## FRONTEND PAGES

### Public (no auth)
| Route | File | Purpose |
|-------|------|---------|
| / | Landing.jsx | Main marketing page with bento features, split hero, AI demo |
| /mission | Mission.jsx | Vision, roadmap, contribute — editorial layout |
| /portfolio | Portfolio.jsx | Prasanna's personal SOC analyst portfolio |
| /agent-setup | AgentSetup.jsx | Docs-style setup guide for endpoint agent |
| /public | PublicGallery.jsx | Browse public cases |
| /public/:token | PublicCaseDetail.jsx | Story-format public case narrative |
| /app/login | Login.jsx | JWT auth login |

### App (auth required, inside AppShell)
| Route | Component | Purpose |
|-------|-----------|---------|
| /app/dashboard | Dashboard.jsx | Live stats, analytics trends, case queue, EDR status |
| /app/cases | CaseList.jsx | Case list with SLA badges, templates, quick filters |
| /app/cases/:id | CaseDetail/ | 13-tab case investigation workspace |
| /app/hunt | ThreatHunt.jsx | Cross-case IOC correlation + MITRE heatmap |
| /app/endpoints | Endpoints.jsx | Endpoint agent management + log viewer |
| /app/vt-lookup | VTLookup.jsx | VirusTotal v3 with history |
| /app/email | EmailAnalysis.jsx | Email header forensics + SPF/DKIM/DMARC |
| /app/pcap | PcapAnalysis.jsx | PCAP packet analysis |
| /app/feeds | ThreatFeeds.jsx | Live CISA/URLhaus/ThreatFox/MalwareBazaar feeds |
| /app/tools | ToolsHub.jsx | External tool links + IOC extractor + defang |
| /app/hardware/tools | HardwareTools.jsx | 18 hardware attack tool parsers (AI-powered) |
| /app/terminal-lab | TerminalLab.jsx | Full Linux-style analyst lab with session management |
| /app/identity-graph | IdentityGraph.jsx | Force-directed identity relationship canvas |
| /app/itdr | ITDRPage.jsx | Identity Threat Detection (6 detectors in v4.3) |
| /app/nhi-health | NHIHealth.jsx | NHI lifecycle health dashboard (v4.3) |
| /app/connectors | ConnectorHub.jsx | Identity provider connections + approved AI services (v4.3) |
| /app/analytics | Analytics.jsx | Severity/SLA/throughput analytics |
| /app/policies | Policies.jsx | Access control policy engine |
| /app/agent-security | AgentSecurity.jsx | AI action approval queue + OWASP Agentic coverage |
| /app/audit | AuditLog.jsx | Full platform audit trail |
| /app/admin | Admin.jsx | User management, webhooks, EDR integrations |

**Removed in v4.2 cleanup** (all redirect to better alternatives):
- `/app/logs` → redirects to `/app/terminal-lab`
- `/app/malware` → redirects to `/app/terminal-lab`
- `/app/edr/:caseId` → removed (EDR tab inside CaseDetail is sufficient)
- ToolResult.jsx → removed (inline results in HardwareTools)

### CaseDetail Tabs (13 total)
`overview` · `investigation` · `iocs` · `terminal` · `timeline` · `trust-timeline` · `playbook` · `ai-analysis` · `ai-chat` · `comments` · `provenance` · `report` · `edr`

---

## KEY FEATURES (current v4.3)

### 1. Case Management
- 13-tab lifecycle with autosave
- MITRE ATT&CK technique mapping
- SLA breach detection (Critical=4h, High=8h, Medium=48h, Low=168h)
- Investigation templates: 6 pre-built scaffolds (phishing, brute force, malware, exfiltration, suspicious login, endpoint compromise)
- Report completeness preview: 7-section checklist before export
- PDF / DOCX / DORA Article 19 export

### 2. ITDR — Identity Threat Detection & Response
Four real-time detectors:
- **Credential stuffing**: 5+ failed logins from same source
- **Impossible travel**: same account, different continents < 4 hours
- **New device login**: first-time device detected for known user
- **Privilege escalation**: unapproved role/permission elevation

### 3. Identity Graph + Risk Engine
- Force-directed HTML Canvas graph (no D3/React-Flow — custom simulation)
- Node types: User, Service Account, API Key, Token, Device, AI Agent, Prompt
- Pluggable risk detector architecture: `AnomalyCountDetector`, `LastSeenDetector`, `CompromisedFlagDetector`
- Every risk recalculation logged to audit trail

### 4. Trust Timeline + Provenance Ledger
- Trust Timeline: every login, token use, privilege change, agent action per case
- Provenance Ledger: every AI output with actor, model, confidence, evidence, approval status
- Full reversible audit — nothing executes without a ledger entry

### 5. Explainable AI (Groq — all free)
Multi-model routing:
- `llama-3.3-70b-versatile` → case analysis, executive reports, chat
- `mixtral-8x7b-32768` → email forensics (32K context for full headers)
- `gemma2-9b-it` → IOC extraction (3× faster for JSON structured output)
- `llama-3.1-8b-instant` → quick Q&A, binary classification

Every verdict shows: evidence used · reasoning steps · what could be wrong · confidence score

### 6. AI Agent Security (v4.2 — new)
- Human approval queue for all AI-generated actions
- Actions above confidence threshold auto-approve (default: 85%)
- Configurable: always require approval for case_close, report_generate, auto_enrich
- Accept / Reject with reason
- Full audit trail in Provenance Ledger
- Page: `/app/agent-security`

### 7. Hardware Attack Tools (18 parsers)
WiFi: Probe Request Analyser, Evil Twin Detector, Deauth Attack Timeline, Handshake Inspector  
RF/Radio: Spectrum Analyser, Replay Attack Detector, Jamming Detector  
USB/HID: Keystroke Injection Analyser, Payload Decoder, Encoded Command Decoder  
Network: Suricata IDS Parser, ARP Poison Detector, DNS Query Analyser, Lateral Movement Tracer  
RFID/NFC: Card Clone Detector, RFID Brute Force Detector  
Endpoint: Sysmon Event Parser, Process Tree Analyser  
Universal: AI Universal Parser (any format)

### 8. 7-Source IOC Enrichment
VirusTotal v3 · Shodan · MalwareBazaar · URLhaus · ThreatFox · GreyNoise · IPInfo  
All queried in parallel. Results saved + correlated cross-case for campaign detection.

### 9. Email Forensics
Full RFC header parsing · SPF/DKIM/DMARC validation · routing hop extraction · AI phishing verdict · MITRE ATT&CK mapping

### 10. Terminal Lab
- Named sessions with save-to-case
- 20+ simulated Linux commands (whois, dig, nmap, strings, sha256sum, ps, etc.)
- AI parses every output: extracts IOCs, maps to MITRE, recommends next steps
- Push IOCs directly to case

### 11. Public Case Narrative
Story-format public page: Trigger → Investigation Steps → Findings → Outcome → Lessons Learned  
Shareable via token, PDF downloadable, AI summary callout at top

### 12. Dashboard Analytics
- Severity breakdown CSS bar chart (Critical/High/Medium/Low/Info counts)
- SLA status panel (Breached/At Risk/On Track with live counts)
- Live refresh every 30 seconds
- Fetches 25 most recent cases (optimised from 100)

---

## WHAT'S NEXT (v4.3 → v5.0)

### v4.3 Completed (this session)
- [x] bcrypt password hashing + transparent SHA-256 upgrade
- [x] sessionStorage swap (all localStorage → sessionStorage)
- [x] Rate limiting: VT 10/min, enrichment 20/min, global 200/min (slowapi)
- [x] JWT server-side invalidation (TokenBlocklist)
- [x] SQLite WAL mode + connection PRAGMAs
- [x] New models: IdentityConnector, ApprovedAIService, ShadowAIEvent, TokenBlocklist, AgentCommand, ITDRAlert + IdentityNode v4.3 fields
- [x] TTL cache (core/cache.py) + Internal event bus (core/events.py)
- [x] Connector plugin architecture (base.py + azure_ad.py + okta.py + csv_import.py)
- [x] Connectors router (/api/connectors) + NHI router (/api/nhi) + Health check (/api/health)
- [x] Ingest router: new structured telemetry endpoint + command channel endpoints
- [x] Endpoint Agent v3.0 — psutil, Shadow AI detection, Behavioural Baseline, Process Lineage Tree, FIM, Privilege Escalation Detector, Local Anomaly Scorer, Command Channel, Watchdog, Service registration
- [x] install.sh — one-command installer
- [x] ITDR hardened: multi-window credential stuffing (10min/1h/24h), distributed attack detection, token theft detector, shadow AI ITDR detector
- [x] Frontend store split: useAuthStore, useCaseStore, useUIStore, useIdentityStore, useConnectorStore
- [x] React.lazy() code splitting on all routes (~40% bundle reduction)
- [x] API request deduplication in client.js
- [x] ConnectorHub.jsx (/app/connectors)
- [x] NHIHealth.jsx (/app/nhi-health)
- [x] Sidebar: Connectors + NHI Health nav items
- [x] Landing: 144:1 stat, Identity Auto-Discovery bento, NHI Health Monitor bento, v4.3 badge

### v5.0 Completed (June 2026 session)

**Endpoint Agent v5.0** (agent/aegistrace_agent.py — 2432 lines)
- [x] 🍯 Honey Token Trap — canary .aws/credentials, .honey_env, .honey_vault, honey_passwords.txt; CRITICAL alert when any process reads them; zero false positives
- [x] DNS/DGA Detection — Shannon entropy + vowel ratio + digit ratio scoring; DNS tunnelling (subdomain > 50 chars); hooks system syslog/mdnsresponder
- [x] Auto-Block Engine — iptables/pfctl/netsh DROP rules; device isolation mode (cuts all outbound except AegisTrace); kill_process; configurable via AEGISTRACE_AUTO_BLOCK=off|alert|block
- [x] USB/Removable Media Detector — /proc/mounts (Linux), diskutil (macOS), WMI (Windows); one alert per device per session
- [x] Windows Registry Monitor — Run/RunOnce/Winlogon/Services persistence keys; hash-based change detection
- [x] YARA-lite Engine — 16 string signatures: reverse shells, Mimikatz, encoded PowerShell, certutil, LOLBin patterns, net user /add
- [x] Guardian Process — multiprocessing.Process (not just a thread) monitors main agent PID; restarts on SIGKILL
- [x] Multi-backend failover — AEGISTRACE_SERVER=url1,url2,url3; automatic failover without data loss
- [x] Enhanced FIM v5.0 — mtime + size + hash; directory listing monitor; 5-min re-alert suppression
- [x] Network isolation command — isolate_device / unisolate_device from command channel
- [x] New command channel commands: block_ip, unblock_ip, isolate_device, unisolate_device, honey_status, fim_check_now, get_blocked_ips
- [x] install.sh updated — includes AEGISTRACE_AUTO_BLOCK + AEGISTRACE_HONEY_TOKENS env vars
- [x] GitHub push protection fix — replaced Stripe key patterns in honey token content with non-matching fakes

**Frontend UI (June 2026 session)**
- [x] Login.jsx — complete rewrite with orbital Trust Field canvas animation (16 identity nodes on 3 orbital rings, trust bond connections, threat/resolve events, center pulsing core); no WireframeBackground
- [x] Sidebar.jsx — logo click navigates to / (home page); hover effect added
- [x] AppShell.jsx — user name/avatar in header is now a clickable dropdown: Home, Settings, Sign Out (with animation + click-outside close)
- [x] Landing.jsx — Endpoint Agent feature updated to v5.0 with Honey Token Trap mention
- [x] Portfolio.jsx — AegisTrace project updated to v5.0, terminal animation updated
- [x] AgentSetup.jsx — updated to v5.0: new description, 6 feature highlights, updated quick start (env var pattern), new config table with all AEGISTRACE_* vars, download link live

### v5.1 Completed (this session — June 2026)

**UI / Animations**
- [x] Login.jsx — replaced Trust Verification animation with **Iris Scanner**: biometric iris starburst (4 counter-rotating petal layers), cipher text rings, tick-mark dial, scan beam, targeting brackets, periodic "● BIOMETRIC VERIFIED" flash. Black canvas background.
- [x] Landing.jsx — replaced Identity Constellation animation with **Hex Fortress**: full-screen tessellated hex grid, defense pulse waves, edge attack events, mouse proximity glow. No dots/lines.
- [x] **Pure black theme** applied across entire project (55 files): CSS vars shifted from blue-tinted navy to true black hierarchy (#000000 → #080808 → #101010 → #1A1A1A). Subtle typography: headings #EBEBEB, body #A8A8A8, labels #686868.

**ITDR Analytics (Priority 2 — completed)**
- [x] `GET /api/itdr/analytics?days=N` — returns detector fire rates, top targeted identities, 30-day trend, severity distribution, status breakdown, FP rate. Queries both IdentityAnomaly + ITDRAlert.
- [x] ITDRPage.jsx — rebuilt as 3-tab layout: **Detection** (auth events + anomaly panel), **Alerts** (full alert management with status actions: Investigate / False Positive / Resolve), **Analytics** (KPI cards, detector fire rate bars, severity stacked bar, status breakdown, 30-day bar chart, top targeted identities ranked list). All 6 detectors now in DETECTOR_META (was 4).

**2FA / TOTP Security (Priority 6 — completed)**
- [x] `User` model: added `mfa_enabled: bool`, `mfa_secret: Optional[str]`
- [x] `requirements.txt`: added `pyotp==2.9.0`
- [x] `create_token()`: added optional `ttl` parameter
- [x] Login flow: `POST /api/auth/login` now returns `{mfa_required: true, pending_token}` when MFA enabled
- [x] `POST /api/auth/mfa/setup` — generates TOTP secret + otpauth:// URI
- [x] `POST /api/auth/mfa/verify` — verifies first code, activates 2FA (±30s drift tolerance)
- [x] `POST /api/auth/login/mfa` — validates pending token + TOTP code, issues full JWT
- [x] `POST /api/auth/mfa/disable` — requires current TOTP code to confirm
- [x] `GET /api/auth/mfa/status` — returns current MFA state
- [x] Login.jsx — MFA challenge step: after password success, shows 6-digit TOTP code input. "Back to login" resets state.
- [x] Admin.jsx — `<MFAPanel>` component in "Your Account" card: shows enabled/disabled state, setup flow (secret display + copy + otpauth URI), verify code to activate, disable flow with code confirmation.

**Application Security Hardening (v5.1)**
- [x] `database.py`: `_harden_db_file_permissions()` — sets SQLite file to 0o600 (owner read/write only) on every startup. No-ops gracefully on Windows/read-only filesystems.
- [x] `auth.py`: UA fingerprinting — `_ua_hash()` computes SHA-256[:16] of User-Agent at login, embeds as `ua_hash` claim in JWT. `get_current_user` detects UA mismatches and logs to AuditLog as `session_ua_mismatch` (non-blocking ITDR signal — detection only, no lockout). Accept-Language intentionally excluded to avoid false positives from Render's proxy layer.
- [x] SQL injection: confirmed safe throughout — all queries use SQLModel ORM parameterized selectors. No raw string interpolation anywhere in the codebase.
- [x] Rate limiting: confirmed already live — VT 10/min, enrichment 20/min, global 200/min (slowapi v4.3). No changes needed.

### v4.3 Remaining (still to do)
- [x] Shadow AI Detection dashboard UI — `/app/shadow-ai` — stats, filter tabs (All/Unreviewed/Reviewed), event rows with expand detail, Mark Reviewed + Create Case actions, AI service labels, explainer panel
- [x] ITDR analytics page — completed in v5.1 above
- [ ] DPDPA Compliance Report — India market accelerator

### v5.0 / Future Planned
- [ ] SCIM endpoint (/api/scim/v2) — enterprise push-based identity sync
- [ ] Least Agency enforcement — per-agent scope definition + auto-reject
- [ ] MCP Security Gateway — monitor MCP server connections, flag unapproved (Python httpx proxy, not Go)
- [ ] Agent Supervision Console — per-AI-agent kill switches + task scope enforcement
- [ ] Attacker Path Reconstruction — visual kill-chain across human + machine actors
- [ ] ITDR analytics: impossible travel geo-accuracy — MaxMind DB instead of IP lookup API
- [ ] Control Plane View `/app/control-plane` — live: identity trust scores, active agent actions, policy violations, endpoint heartbeats
- [ ] SOAR Playbooks engine — builder UI + automated execution: trigger → action → approval gate
- [ ] Endpoint Agent Layer 3 (eBPF/Falco) — kernel-level visibility on Linux
- [ ] Endpoint Agent Layer 4 (Memory Forensics) — Volatility 3 integration

---

## DEPLOYMENT

**Live URL:** https://aegistrace-7qvn.onrender.com  
**Deploy:** `git push origin main` → Render auto-deploys (autoDeploy: true in render.yaml)  
**DB:** SQLite at `/var/data/aegistrace.db` (persistent disk on Render)  
**New tables:** Created automatically by `create_db_and_tables()` on startup — no migrations needed  
**Free tier limits:** Render spins down after 15min inactivity (first request ~30s cold start)

### Required environment variables (set in Render dashboard)
```
GROQ_API_KEY          # Free at console.groq.com
VIRUSTOTAL_API_KEY    # Free at virustotal.com
ADMIN_PIN             # Set on first deploy
JWT_SECRET            # Auto-generated
PUBLIC_URL            # https://aegistrace-7qvn.onrender.com
```

### Optional (for EDR integrations)
```
CROWDSTRIKE_CLIENT_ID / CROWDSTRIKE_CLIENT_SECRET
SENTINELONE_BASE_URL / SENTINELONE_API_TOKEN
CARBONBLACK_ORG_KEY / CARBONBLACK_API_ID / CARBONBLACK_API_SECRET
```

---

## FRONTEND DEPENDENCIES (package.json)
```json
react, react-dom, react-router-dom, axios, zustand, lucide-react, react-scripts
```
**Removed in v4.2:** react-hook-form, @hookform/resolvers, zod (were unused, ~60KB saved)

---

## CURRENT WEBSITE NARRATIVE (v4.3 — June 2026)

- **Landing hero:** "Attackers no longer break in. / They become trusted."
- **Landing stat:** "The average enterprise has 144 machine identities for every human. Most are unmonitored."
- **Landing badge:** "Trust Operating System · v4.3"
- **Mission hero:** "The Trust Layer / for the AI-Agent Era."
- **New bento cards:** "Identity Auto-Discovery" + "NHI Health Monitor"

---

## SECURITY FIXES (v4.3 — ALL COMPLETED)

- [x] **bcrypt password hashing** — `backend/routers/auth.py`, transparent upgrade from SHA-256 on first login
- [x] **sessionStorage swap** — `frontend/src/store/useStore.js` + `client.js` (all localStorage → sessionStorage)
- [x] **Rate limiting on VT/enrichment** — `slowapi==0.1.9`, 10/min VT, 20/min enrichment, global 200/min
- [x] **JWT server-side invalidation** — `TokenBlocklist` model, check on every request, nightly cleanup

---

## FULL FUTURE WORK BACKLOG

### Priority 1 — Endpoint Agent v5.0 (completed June 2026)
- [x] Shadow AI detection — 14 AI API domains, cross-refs approved list
- [x] Suspicious process detection — known malicious name matching
- [x] Suspicious port detection — C2 port flagging
- [x] New network destination detection — baseline + deviation after 5 cycles
- [x] Behavioural Baseline Engine — 7-day learning, anomaly detection, cross-session persistence
- [x] Process Lineage Tree — suspicious parent-child detection (office→cmd, browser→cmd, etc.)
- [x] File Integrity Monitoring — SHA-256 + mtime + size, recursive dir monitoring, suppress re-alerts
- [x] Privilege Escalation Detector — root escalation, sudo anomalies
- [x] Local Anomaly Scorer — pure Python 0-100 composite score (v5.0 extended weights)
- [x] Command Channel — collect_now, kill_process, block_ip, unblock_ip, isolate_device, get_process_tree, ping, fim_check_now, honey_status, get_blocked_ips
- [x] Watchdog Thread — heartbeat monitoring, guardian process (separate OS process, v5.0)
- [x] Service registration — systemd / LaunchAgent / Windows Service (with service recovery)
- [x] DNS/DGA Detection — Shannon entropy + vowel ratio + digit ratio, tunnelling detection
- [x] 🍯 Honey Token Trap — canary credential files (.aws/credentials, .honey_env, .honey_vault, honey_passwords.txt), CRITICAL alert on access, zero false positives
- [x] Auto-Block Engine — iptables / pfctl / netsh blocking, device isolation mode
- [x] USB/Removable Media Detector — Linux /proc/mounts, macOS diskutil, Windows WMI
- [x] Windows Registry Monitor — Run/RunOnce/Winlogon/Services persistence keys
- [x] YARA-lite Engine — 16 string signature rules on process cmdlines (reverse shells, LOLBins, credential access)
- [x] Multiple Backend Failover — primary → secondary → tertiary, JSONL offline buffer
- [x] Guardian Process — multiprocessing.Process guardian restarts agent on crash

### Priority 2 — ITDR Hardening (v4.3 completed)
- [x] Multiple time windows for credential stuffing — 10min/5, 1h/15, 24h/25
- [x] IP-based distributed attack detection — cross-user from same IP
- [x] User-agent check for token theft
- [x] Shadow AI ITDR integration — 3+ hits in 24h → alert
- [x] ITDR analytics page — completed v5.1: GET /api/itdr/analytics + 3-tab ITDRPage
- [ ] Impossible travel geo-accuracy improvement — use MaxMind DB instead of IP lookup API

### Priority 3 — Trust OS Features
- [x] Shadow AI Detection dashboard — `/app/shadow-ai` — completed v4.3
- [ ] **SOAR Playbooks engine** — builder UI + automated execution: trigger → action sequence → approval gate
- [x] **Control Plane View** — `/app/control-plane` — live: 5 KPI cards, high-risk identity panel, AI action queue, ITDR threat feed, endpoint heartbeats, live activity ticker. Auto-refresh 30s. Added to Sidebar as top nav item.

### Priority 4 — Identity Graph Enhancements
- [ ] Click device node → Device Details panel (OS, IP, last seen, risk score, recent activity, create-case button)
- [ ] Identity risk timeline — line graph per node using existing anomaly data
- [ ] Filter by risk threshold — slider to show only nodes above risk score X

### Priority 5 — Analytics & Reporting
- [x] ITDR analytics — completed v5.1
- [ ] Trust score trending — IdentityRiskHistory model, track scores over time
- [ ] DPDPA Compliance Report — mapped to India DPDPA 2025 obligations (major India sales accelerator)
- [ ] RBI Cybersecurity Framework mapping panel

### Priority 6 — Security & Polish (v5.1 completed)
- [x] 2FA/TOTP for all users — pyotp==2.9.0, mfa_secret + mfa_enabled on User, full setup/verify/disable/login flow, MFAPanel in Admin.jsx, MFA challenge step in Login.jsx
- [x] DB file permission hardening — SQLite file set to 0o600 on startup via _harden_db_file_permissions()
- [x] Session UA fingerprinting — ua_hash embedded in JWT at login, mismatch logged as session_ua_mismatch AuditLog entry (non-blocking ITDR signal)
- [ ] Email notifications on ITDR anomaly — SendGrid template
- [ ] Portfolio: Trust OS phase roadmap (Phase 1 NOW → Phase 5 2030+)

### Priority 7 — v5.0+ Planned
- [ ] SCIM endpoint (`/api/scim/v2`) — enterprise push-based identity sync
- [ ] Least Agency enforcement — per-agent scope definition, auto-reject out-of-scope actions
- [ ] MCP Security Gateway — Python httpx proxy layer intercepting MCP JSON-RPC (NOT Go; see architecture notes)
- [ ] Agent Supervision Console — per-AI-agent kill switches + task scope enforcement
- [ ] Attacker Path Reconstruction — visual kill-chain across human + machine actors
- [ ] Endpoint Agent Layer 3 (eBPF) — Falco companion process on Linux
- [ ] Endpoint Agent Layer 4 (Memory Forensics) — Volatility 3 integration

---

## HOW TO RESUME BUILDING

Start a new Claude session and paste this file. Then say:

> "Read AEGISTRACE_CONTEXT.md — I want to work on [task from backlog above]"

**Highest priority items (as of v5.1):** SOAR Playbooks engine, email notifications on ITDR anomaly, Trust score trending, DPDPA Compliance Report.

Do NOT give Claude the full codebase — this file is sufficient context for any continuation task.

---

## BUILDER PROFILE

**Name:** Prasanna Kumar Surendran  
**Location:** Dublin, Ireland  
**Role:** Blue Team SOC Analyst · Security Tooling Developer  
**Email:** Prasanna80564@gmail.com  
**GitHub:** https://github.com/Prasanna-27eng  
**LinkedIn:** https://www.linkedin.com/in/prasannakumarsurendran  
**Education:** MSc Information Systems & Computing, Dublin Business School (2025)  
**Certifications:** SC-200 ✓ · Security+ ✓ · TCM PEH ✓ · BTL1 (55%) · eJPT (20%) · SC-300 (15%)

AegisTrace is entirely self-funded, free to use, and open in philosophy. The goal: prove a solo analyst can build SOC tooling that rivals commercial products — and that the next generation of security platforms must be built around identity, trust, and explainability from day one.
