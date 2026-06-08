# AEGISTRACE — MASTER CONTEXT FILE
**Version:** v7.0 | **Last updated:** June 2026
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
**Stack:** React 18 · FastAPI · SQLite/SQLModel · Groq API · NVIDIA NIM · Docker · Render free tier (VPS migration guide written for DigitalOcean/Hetzner/UpCloud)

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
    prompt_shield.py      Prompt injection shield — sanitises all Groq inputs (v5.4)
    encryption.py         Fernet field encryption for sensitive DB columns (v5.5)
    connectors/           Connector plugin architecture
      base.py             BaseConnector abstract class
      azure_ad.py         Microsoft Graph app-only auth
      okta.py             Okta API token
      csv_import.py       CSV upload + column mapping

agent/              aegistrace_agent.py (v6.0 — ~3650 lines, production-grade EDR + VulnerabilityScanner)
                    install.sh — one-command installer (v5.0)
Dockerfile          Multi-stage: frontend build → FastAPI server
render.yaml         Render free-tier deploy config (autoDeploy: true)

backend/nvidia_client.py     NVIDIA NIM singleton client (OpenAI-compatible, graceful fallback)
backend/embeddings.py        NV-EmbedQA-E5-v5 embedding service + cosine similarity search
backend/guardrails.py        Llama Guard 3 safety classifier (Phase 3)
backend/ingest_normalizer.py Alert format normalizer — Wazuh/osquery/Falco/Sysmon → case schema (Phase 5)
backend/agents/
  __init__.py
  tools.py          5 tool definitions + executors for function-calling agents
  triage_agent.py   Nemotron-70B agentic triage loop (max 6 iterations, Groq fallback)
  specialist.py     EmailAgent, EndpointAgent, IOCAgent, IdentityAgent, ReportAgent
  coordinator.py    asyncio.gather parallel coordinator + synthesis (Phase 4)
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
| defense | /api/defense | AI Defense Engine — fingerprinting, honeypots, Groq triage, HITL review (v5.3) |
| demo | /api/demo | Demo data seeder — seeds Identity, ITDR, Shadow AI, Defense, Agent Security (v5.5) |
| semantic | /api/semantic + /api/ingest/normalize | NVIDIA Phase 2+5: similar-case search, case embedding, alert normalization (v7.0) |

---

## DATABASE MODELS (backend/models.py)

**Core:** `User`, `Case`, `IOCCorrelation`, `TimelineEvent`, `VTHistory`, `AuditLog`, `WebhookConfig`, `Endpoint`, `LogBatch`

**v3.0 additions:** `TerminalSession`, `TerminalCommand`, `IdentityNode`, `IdentityEdge`, `TrustEvent`, `ProvenanceLedger`, `CaseComment`, `InvestigationTemplate`, `AgentAction`

**v4.3 additions:** `IdentityConnector`, `ApprovedAIService`, `ShadowAIEvent`, `TokenBlocklist`, `AgentCommand`, `ITDRAlert`

**v5.3 additions:** `DefenseEvent` — attacker_ip, attack_type, threat_source, endpoint_hit, request_count, user_agent, request_pattern (JSON), ai_threat_type, ai_confidence, ai_reasoning, ai_recommended_action, ai_model_used, status (detecting|pending_review|auto_handled|approved|dismissed), response_action, reviewed_by, review_notes, severity, detected_at, reviewed_at

**v7.0 additions:** `CaseEmbedding` — case_id (FK), embedding (JSON Text, 1024-dim NV-EmbedQA vector), summary_text (Text), created_at, updated_at

**v5.5 field updates:** `TerminalSession` — added `created_by_id` (FK user.id) for session ownership enforcement

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
| /app/defense-console | DefenseConsole.jsx | AI Defense Engine — live attack feed, HITL approve/block/escalate/dismiss (v5.3) |

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

### 5. Explainable AI (Groq + NVIDIA NIM — all free)
**Groq multi-model routing** (ai_router.py):
- `llama-3.3-70b-versatile` → case analysis, executive reports, chat
- `llama-3.1-70b-versatile` → email forensics, phishing classification
- `llama-3.1-8b-instant` → fast IOC extraction, JSON parsing, demo

**NVIDIA NIM routing** (nvidia_client.py — v7.0, graceful fallback to Groq if key absent):
- `nvidia/llama-3.1-nemotron-70b-instruct` → triage agent coordinator, final synthesis
- `nvidia/nv-embedqa-e5-v5` → 1024-dim case embeddings for semantic similarity
- `meta/llama-guard-3-8b` → safety classifier on all chat inputs
- `meta/llama-3.1-70b-instruct` → alert normalization (Phase 5)

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

### v7.0 Completed (June 2026 session — NVIDIA NIM Integration)

**NVIDIA 5-Phase Agentic Integration**

New files created:
- [x] `backend/nvidia_client.py` — NVIDIA NIM OpenAI-compatible singleton client; model constants (NEMOTRON_70B, EMBED_MODEL, GUARD_MODEL, LLAMA_70B); graceful None return if NVIDIA_API_KEY absent
- [x] `backend/embeddings.py` — NV-EmbedQA-E5-v5 1024-dim embedding service; pure-Python cosine similarity; `store_case_embedding()` + `find_similar_cases()` with min_score threshold
- [x] `backend/guardrails.py` — Llama Guard 3 safety classifier; 14 harm categories; `safety_check()` + `assert_safe()` helpers; disabled gracefully if NVIDIA unavailable
- [x] `backend/ingest_normalizer.py` — Llama-70B alert normalizer; converts any source format (Wazuh/osquery/Falco/Sysmon/CEF/custom) into AegisTrace case schema; `normalize_alert()` + `normalize_batch()`
- [x] `backend/agents/__init__.py`
- [x] `backend/agents/tools.py` — 5 OpenAI function-calling tool definitions: `enrich_ioc`, `get_case_timeline`, `get_endpoint_data`, `get_ioc_correlations`, `search_similar_cases`; shared `execute_tool()` dispatcher
- [x] `backend/agents/triage_agent.py` — Nemotron-70B function-calling agent loop (max 6 iterations); autonomous IOC enrichment + endpoint lookup + similar-case search; Groq fallback
- [x] `backend/agents/specialist.py` — EmailAgent, EndpointAgent, IOCAgent, IdentityAgent, ReportAgent; each returns structured dict; NVIDIA or Groq fallback
- [x] `backend/agents/coordinator.py` — `asyncio.gather` parallel specialist execution; Nemotron synthesis; DORA Article 19 draft auto-generated; elapsed_ms tracking
- [x] `backend/routers/semantic.py` — `/api/semantic/cases/{id}/similar`, `/api/semantic/cases/{id}/embed`, `/api/semantic/search`, `/api/ingest/normalize`, `/api/ingest/normalize/batch`

Modified files:
- [x] `backend/models.py` — Added `CaseEmbedding` model (case_id FK, embedding Text, summary_text Text, created_at, updated_at)
- [x] `backend/migration.py` — Migration 10: CaseEmbedding table note (handled by create_all)
- [x] `backend/routers/cases.py` — `generate_ai()` routes through triage agent (default) or coordinator (mode=coordinator); Llama Guard check in `case_chat()`; similar-case context injection in chat; embedding stored after each analysis
- [x] `backend/main.py` — `semantic_router` imported and registered
- [x] `backend/requirements.txt` — Added `openai>=1.30.0` (for NVIDIA NIM OpenAI-compatible client)
- [x] `render.yaml` — Added `NVIDIA_API_KEY` (sync: false) + `NVIDIA_GUARDRAILS=true`

Key design decisions:
- All 5 phases degrade gracefully to Groq if NVIDIA_API_KEY is absent — zero regression risk
- CaseEmbedding stored as JSON text array in SQLite — no vector DB required
- Agents use asyncio: specialist agents run in parallel, coordinator runs sequentially after
- ProvenanceLedger human-in-loop unchanged — NVIDIA agents still require approval for actions

**NVIDIA API key:** Set in `.env` locally (already gitignored) and must be set in Render dashboard as `NVIDIA_API_KEY`

### v6.0 Completed (June 2026 session)

**Endpoint Agent v6.0** (agent/aegistrace_agent.py — ~3650 lines)
- [x] **VulnerabilityScanner** — active security scanner runs every 5 minutes independently of the 30s telemetry cycle
  - SSH config audit: PermitRootLogin, PasswordAuthentication, PermitEmptyPasswords, X11Forwarding, MaxAuthTries
  - Open port survey: 25+ dangerous services flagged (FTP/Telnet/SMB/RDP/Redis/MongoDB/Elasticsearch/Meterpreter default ports etc.) on all-interface listeners
  - Firewall status: ufw/iptables (Linux), pfctl (macOS), netsh (Windows) — alerts if no firewall active
  - User account audit: UID-0 non-root accounts, empty-password accounts (Linux/macOS + Windows)
  - SUID/SGID binary scan: finds executables with elevated bits outside known-safe whitelist
  - World-writable files in /etc, /usr/bin, /bin, /sbin
  - Cron job inspection: curl/wget/base64/reverse-shell patterns in all cron locations
  - Linux security config: /tmp noexec, core dump policy, /etc/passwd world-write
  - Kernel version: alerts on pre-4.0 (CRITICAL), pre-4.15 (MEDIUM)
  - Package CVE cross-reference: dpkg (Debian/Ubuntu) + rpm (RHEL/CentOS) against 8 known-vulnerable signatures (OpenSSL, OpenSSH, bash/ShellShock, Python 2.x, curl, Apache 2.2)
  - Windows: Defender status, UAC enabled, accounts without password requirement
- [x] Each finding: `id`, `type`, `severity` (CRITICAL/HIGH/MEDIUM/LOW/INFO), `title`, `description`, `remediation`, `category`, `detected_at`
- [x] `vuln_findings` included in every telemetry payload (empty list if no scan due)
- [x] New command: `vuln_scan_now` — triggers immediate full scan + ships results

**Backend (June 2026)**
- [x] `Endpoint` model: `vuln_findings` (JSON Text) + `last_vuln_scan` (DateTime) columns added
- [x] Migration 9: auto-adds both columns to existing endpoint table on startup
- [x] Ingest handler: stores `vuln_findings` + sets `last_vuln_scan` timestamp when payload includes findings
- [x] `GET /api/ingest/vulns/{ep_id}` — returns findings + severity counts + last_scan timestamp
- [x] `POST /api/ingest/vulns/{ep_id}/scan` — queues `vuln_scan_now` agent command

**Frontend — Endpoints.jsx (June 2026)**
- [x] New **Vulns** tab in endpoint detail panel (shown between Overview and Live Logs)
- [x] Tab label shows count of critical+high findings: `Vulns (3)`
- [x] Severity summary bar (CRITICAL / HIGH / MEDIUM / LOW counts)
- [x] Per-finding cards: color-coded severity border, category icon, title, description, remediation block
- [x] Refresh button + Scan Now button (queues on-demand scan with feedback toast)
- [x] Empty states: "No findings" when clean, "Scan pending" when no scan has run yet

**Real-time SSE (June 2026 session — earlier)**
- [x] `useSSE.js` — fetch-based SSE hook (Authorization header support, exponential backoff 1.5s→12s)
- [x] `/api/ingest/stream/{ep_id}` — streams logs, alerts, status snapshots every 2s
- [x] `/api/ingest/stream/global-alerts` — streams critical/high/medium ITDR alerts across all endpoints
- [x] Endpoints.jsx — LIVE indicator (pulsing Radio icon when SSE connected)
- [x] AppShell.jsx — notification bell with unread count, dropdown panel (max 20 alerts)

**UX improvements (June 2026 session — earlier)**
- [x] All `window.confirm()` replaced with keyboard-accessible ConfirmModal component
- [x] Skeleton loading on CaseDetail (header + tab bar + 2-col grid)
- [x] Toast: type-aware persistence (error/warning hold until dismissed, success/info 5s), dedup, cap at 5
- [x] Dashboard: "Updated Xs ago" refresh counter
- [x] Document titles per page (Cases | AegisTrace, Dashboard | AegisTrace, etc.)
- [x] Sortable table columns for processes and network connections

**Deployment fixes (June 2026 session)**
- [x] HEAD method support on SPA catch-all route (fixed 405 from Render load balancer)
- [x] Mission.jsx apostrophe syntax fix (wasn't in single-quoted string broke React build)
- [x] render.yaml: ADMIN_PIN + INGEST_API_KEY set to sync:false (secrets not committed)

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
NVIDIA_API_KEY        # Free at build.nvidia.com — enables all 5 NVIDIA phases
NVIDIA_GUARDRAILS     # true (default) — enables Llama Guard safety layer
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

## SECURITY FIXES (ALL COMPLETED through v5.5)

**v4.3 original fixes:**
- [x] bcrypt password hashing, sessionStorage swap, rate limiting, JWT server-side invalidation

**v5.4 audit fixes (13 issues):**
- [x] IDOR: evidence/timeline endpoints had no auth
- [x] IDOR: reports PDF/DOCX/DORA had no org_id check
- [x] IDOR: case comments had no org_id check
- [x] Zero-day: case_chat had NO authentication
- [x] Zero-day: terminal sessions had no ownership (added created_by_id)
- [x] Zero-day: case chat had no rate limit
- [x] SSRF via webhooks (blocklist added)
- [x] MFA pending token replayable (added to TokenBlocklist on use)
- [x] /login/mfa had no rate limit (5/min enforced)
- [x] Login rate limiter blind behind proxy (real IP via X-Forwarded-For)
- [x] commands_run in public endpoint (removed)
- [x] No password minimum length (8 chars enforced)
- [x] PCAP magic byte validation
- [x] customer_name + analyst_name in public cases (redacted)
- [x] Health endpoint exposing internals (stripped)

**v5.5 hardening:**
- [x] JWT replaced with python-jose (battle-tested library)
- [x] Progressive account lockout (5→60s, 10→15min, 20→1hr)
- [x] Admin 2FA enforcement (mfa_setup_required flag on login)
- [x] Connector tokens encrypted at rest (Fernet via core/encryption.py)
- [x] Auto-generate INGEST_API_KEY on startup
- [x] Per-user Groq rate limiting (100/hr per user)
- [x] Prompt injection shield on ALL Groq calls (core/prompt_shield.py)
- [x] Request body size limit 10MB
- [x] Full security headers (HSTS, CSP, Server header removal)

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

### Priority 8 — NVIDIA NIM Phases (v7.0 built, v8.0 planned)

**v7.0 Already Built (all free on build.nvidia.com):**
- [x] Phase 1: Nemotron-70B function-calling triage agent (triage_agent.py)
- [x] Phase 2: NV-EmbedQA-E5-v5 case memory + semantic search (embeddings.py)
- [x] Phase 3: Llama Guard 3 safety classifier on chat (guardrails.py)
- [x] Phase 4: Multi-agent coordinator — Email/Endpoint/IOC/Identity/Report agents in parallel (agents/)
- [x] Phase 5: Llama-70B alert normalization for any source format (ingest_normalizer.py)

**v8.0 Planned (all free on build.nvidia.com):**
- [ ] Phase 6: Swap Nemotron → Hermes-3 (`nousresearch/hermes-3-llama-3.1-70b`) in triage_agent.py — better tool calling reliability, one-line model constant change
- [ ] Phase 7: Add NV-RerankQA-Mistral-4B reranker after cosine similarity in embeddings.py — "relevant" not just "similar"
- [ ] Phase 8: Llama 3.2 Vision 11B — `POST /api/cases/{id}/analyze-screenshot`; new CaseDetail tab for image upload + AI verdict; analyzes malware screenshots, phishing pages, terminal output images
- [ ] Phase 9: Codestral 22B — replace `code` task in ai_router.py; `POST /api/cases/{id}/generate-rules` returns YARA + Sigma + KQL + Splunk SPL rules from case IOCs
- [ ] Phase 10: NVIDIA Morpheus — GPU-accelerated DGA detection, log anomaly scoring, network flow analysis; replaces Python implementations in endpoint agent; requires Kafka + GPU (post-Render-free-tier)

**NVIDIA Skills Research (suggestions only, not started):**
- NeMo Curator: curate closed cases into fine-tuning dataset → Hermes-3 fine-tuned on AegisTrace case history
- NeMo Evaluator: benchmark Nemotron vs Hermes-3 vs Groq on historical cases — evidence-based model selection
- NVIDIA RAPIDS cuGraph: GPU-accelerated identity graph analysis (PageRank, community detection) — needed when identity graph >1k nodes
- NVIDIA Riva: speech transcription → analyst dictates case notes → auto-populates case fields
- NeMo FLARE: federated learning across multiple AegisTrace deployments — privacy-preserving threat intelligence
- NeMo + AutoGen: group-chat multi-agent debate (3 analyst agents debate severity → judge produces final verdict)
- NeMo + CrewAI: role-based agent framework on NVIDIA NIM — replace custom coordinator.py
- NeMo + LangGraph: state machine agent workflows with conditional branching (if IOC score >80 → trigger endpoint deep-dive)

**Free vs Paid on NVIDIA Build:**
- Free: All NIM hosted model API calls (free credits via build.nvidia.com API key), NeMo Guardrails (open source), AgentIQ (open source), NeMo Curator (open source), NeMo Evaluator (open source), NVIDIA Morpheus (open source but needs GPU to self-host)
- Needs GPU (not free on Render): RAPIDS cuGraph, Morpheus self-hosted, Riva self-hosted, NeMo Microservices enterprise
- Paid: DGX Cloud, Fleet Command, NeMo Microservices enterprise tier

---

## HOW TO RESUME BUILDING

Start a new Claude session and paste this file. Then say:

> "Read AEGISTRACE_CONTEXT.md — I want to work on [task from backlog above]"

**Highest priority items (as of v7.0):**
- NVIDIA Phase 6: Swap to Hermes-3 in triage_agent.py (10 min, one-line change, big reliability gain)
- NVIDIA Phase 7: Add NV-RerankQA reranker to embeddings.py (30 min)
- NVIDIA Phase 8: Llama 3.2 Vision screenshot analysis tab in CaseDetail
- NVIDIA Phase 9: Codestral YARA/Sigma/KQL rule generation
- SOAR Playbooks engine, email notifications on ITDR anomaly, Trust score trending, DPDPA Compliance Report

### v5.2 Completed (this session)

**MITRE ATT&CK Simulation Engine**
- [x] `SimulationRun` model added to `models.py` (technique_id, result, confidence, evidence, events_injected, run_by, run_at)
- [x] `backend/routers/simulation.py` — 5 real technique simulators calling actual ITDR detector functions:
  - T1110 Brute Force → `_detect_credential_stuffing` (7 failed_login events)
  - T1078.001 Impossible Travel → `_detect_impossible_travel` (IE + CN logins, 2h apart)
  - T1078.004 New Device Login → `_detect_new_device` (historical + unknown device)
  - T1098 Privilege Escalation → `_detect_privilege_escalation` (unapproved priv_change)
  - T1539 Session Hijacking → `_detect_token_theft` (same device_id, 2 user-agents)
- [x] All synthetic events use `__sim_<uuid>__@aegistrace.internal` prefix, cleaned up after each run
- [x] Registered in `main.py`
- [x] `SimulationHub.jsx` at `/app/simulation` — Void Core UI: KPI row, technique list with LAUNCH buttons, live result with alphanumeric morph animation, evidence panel, run history, demo attack chain explainer
- [x] Added to Sidebar under Lab group (Swords icon)

### v5.3 Completed (this session)

**AI Defense Engine**
- [x] `DefenseEvent` model added to `models.py` — attacker_ip, attack_type, ai_confidence, ai_reasoning, ai_recommended_action, status, severity, reviewed_by, review_notes
- [x] `backend/routers/defense.py` — full defense router:
  - Request fingerprinting engine (per-IP: req count, unique endpoints, timing)
  - Honeypot endpoints (8 fake routes: /api/v1/admin/export, /api/v1/users/all, etc.)
  - Groq triage engine — classifies threat, returns type/confidence/reasoning/action (<1s)
  - Auto-handles at ≥92% confidence, sends to HITL queue at ≥70%
  - CRUD: GET /api/defense/events, POST /api/defense/events/{id}/review, GET /api/defense/stats
  - POST /api/defense/test — dev trigger for manual test events
- [x] `main.py` — DefenseFingerprintMiddleware (passive, non-blocking), honeypot routes registered, defense_router imported
- [x] `DefenseConsole.jsx` at `/app/defense-console` — pure black v5.1:
  - 4 KPI cards: Pending Review, Auto-Handled, Honeypot Hits, AI Agent Scans
  - Filter tabs: All / Pending Review / Auto-Handled / Approved / Dismissed
  - EventCard with expand: AI confidence bar, reasoning chain, key indicators, request context
  - Inline HITL action panel: Block IP / Watchlist / Escalate / Dismiss + notes field
  - 15s auto-refresh, Test Event button, engine status indicator
  - All approvals logged to Provenance Ledger
- [x] Sidebar — Defense Console added as first item in Control group (ShieldAlert icon)
- [x] App.jsx — route `/app/defense-console` added

**New router registered in main.py:** `defense` → `/api/defense`
**New page:** `/app/defense-console` → `DefenseConsole.jsx`
**New sidebar item:** Control group → Defense Console (top position)

### v5.4 Completed (this session)

**Deep Security Audit — 15 additional issues fixed**
- [x] IDOR: `GET /{case_id}/evidence` had no auth — added `get_current_user` + `org_id` check
- [x] IDOR: `GET /{case_id}/timeline` had no auth — added `get_current_user` + `org_id` check
- [x] Zero-day: `case_chat` had NO authentication — fixed with auth + org_id + rate limit + input cap
- [x] Zero-day: Terminal sessions had no ownership — `created_by_id` added to `TerminalSession` model, enforced on all 4 session endpoints (get/run/save/delete)
- [x] Zero-day: Case chat no rate limit — 20 msg/min rate limit + 500 char cap
- [x] IDOR: reports.pdf/docx/dora had no org_id check — fixed all 3
- [x] IDOR: case comments had no org_id check — fixed get + post
- [x] Predictable ingest key when default ADMIN_PIN — warning added, derivation hardened
- [x] SSRF via webhooks — `_validate_webhook_url()` blocklist (localhost, private IPs, cloud metadata)
- [x] MFA pending token replay — token added to `TokenBlocklist` on successful MFA login
- [x] `/login/mfa` had no rate limit — 5 attempts/min enforced
- [x] Login rate limiter blind behind proxy — `_get_real_ip()` reads `X-Forwarded-For`
- [x] `commands_run` in public case endpoint — removed from `sanitize_case()`
- [x] No password minimum length — 8-char minimum on create + change
- [x] PCAP magic byte validation — rejects non-PCAP files before parsing

**Prompt Injection Shield — `backend/core/prompt_shield.py`**
- [x] 20+ injection pattern categories: system_override, role_hijack, jailbreak, delimiter_inject, role_delimiter, exfiltration, xml_inject, template_inject, encoding_bypass
- [x] Wired into `ai_router.py` — ALL Groq calls (call_ai + call_ai_json) automatically sanitised
- [x] System prompt hardening — every Groq call now includes injection resistance instruction
- [x] Detected injections logged as `DefenseEvent` (attack_type="prompt_injection")
- [x] History messages sanitised too (prevents injection via chat history)
- [x] Context-aware length limits: case_description=2000, chat_message=500, terminal_output=5000

**Security hardening — `main.py`**
- [x] `RequestSizeLimitMiddleware` — 10MB max request body, prevents memory exhaustion
- [x] `Strict-Transport-Security` header added (HTTPS enforcement)
- [x] `Content-Security-Policy` header added (XSS mitigation)
- [x] `Server` and `X-Powered-By` headers cleared (hide server info)
- [x] `Cache-Control: no-store, no-cache, must-revalidate` on all API routes

**New file:** `backend/core/prompt_shield.py` — singleton `shield` object, importable anywhere

### v5.5 Completed (this session)

**JWT replaced with python-jose**
- [x] `python-jose[cryptography]==3.3.0` + `cryptography==42.0.8` added to `requirements.txt`
- [x] `create_token()` and `verify_token()` rewritten using `jose.jwt` HS256 — battle-tested library
- [x] Pending token decoding in `login/mfa` updated to use python-jose
- [x] Logout endpoint updated — clean token decoding for blocklist
- [x] All existing sessions invalidated on deploy (clean break — security upgrade)

**Progressive account lockout**
- [x] `_record_failure(ip)` / `_check_lockout(ip)` / `_clear_failures(ip)` helpers
- [x] Thresholds: 5 fails → 60s lockout, 10 fails → 15min, 20 fails → 1hr
- [x] Lockout checked before credential verification — fails fast for locked IPs
- [x] Failures cleared on successful login

**Admin 2FA enforcement**
- [x] Admins without 2FA get a `mfa_setup_required: True` flag in login response
- [x] Token still issued (so they can access the dashboard) but frontend should redirect to `/app/admin#mfa`
- [x] Login audited as `login_admin_no_mfa`

**Connector token encryption at rest**
- [x] `backend/core/encryption.py` — Fernet field encryption singleton (`enc`)
- [x] `enc.encrypt()` / `enc.decrypt()` — backward-compatible (legacy plaintext falls through)
- [x] `connectors.py` — Okta token encrypted on store, decrypted on use
- [x] Key: `FERNET_KEY` env var (preferred) or derived from JWT_SECRET (fallback)

**Auto-generate INGEST_API_KEY on startup**
- [x] If `INGEST_API_KEY` not set, `secrets.token_hex(32)` generated and logged on startup
- [x] Security warnings for missing `FERNET_KEY` added to startup

**Per-user Groq rate limiting**
- [x] `_check_groq_limit(user_id)` in `ai_router.py` — 100 calls/hr per user, 200/hr for anon
- [x] Prevents single compromised account burning entire Groq quota

**New env vars (add to Render/VPS):**
- `FERNET_KEY` — base64url-encoded 32-byte key: `python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`
- `INGEST_API_KEY` — random hex string: `python3 -c "import secrets; print(secrets.token_hex(32))"`

### v5.6 Completed (June 2026 — enterprise endpoint agent + red team audit)

**Endpoint Agent v5.1 — Enterprise upgrades**
- [x] `_journal_realtime_follower()` thread — journalctl -f follower, ships every 3s (1-3s latency vs 30s before)
- [x] `_collect_linux_logs_comprehensive()` — covers ALL auth sources: SSH, sudo, PAM, su, GUI login, user management, kernel events, package installs, service changes, cron, NetworkManager
- [x] Log cursor persists across restarts (`~/.aegistrace_log_cursor`) — no re-reading old events
- [x] `_do_stop_agent()` — 5-step reliable stop: STOP_FILE → kill guardian → stop systemd → notify backend → exit
- [x] STOP_FILE sentinel (`~/.aegistrace_STOP`) — guardian checks before restarting
- [x] PID files (`~/.aegistrace.pid`, `~/.aegistrace_guardian.pid`) — written on startup
- [x] `stop_agent` / `uninstall_agent` commands — work correctly now (previously bypassed by guardian restart)
- [x] `GET /api/install/{token}` — backend generates personalized Python bootstrap with token embedded

**Endpoints page — complete enterprise rebuild (6-tab EDR console)**
- [x] Overview: risk gauge (0-100 SVG), CPU/RAM/Disk meters, stat cards, recent alerts + sudo
- [x] Live Logs: real-time terminal stream (3s auto-refresh), color-coded, category filter
- [x] Processes: full list with Kill button per row, suspicious highlighted red
- [x] Network: connections with Block IP per row
- [x] Alerts: endpoint-specific alerts with evidence + response buttons
- [x] Response: Collect Now, FIM Scan, Ping, Honey Status, Fast Mode, Stop/Uninstall/Isolate/Delete
- [x] `DELETE /api/ingest/endpoints/{ep_id}` — queues uninstall, wipes all data after 30s
- [x] `POST /api/ingest/offline/{agent_id}` — marks offline immediately in DB
- [x] Dynamic online/offline from `last_seen < 90s`, auto-refreshes every 30s

**New models/endpoints**
- [x] `RawLogEvent` model — structured log events (category, event_type, source, severity, raw, username, source_ip, ts)
- [x] New Endpoint columns: last_processes, last_connections, last_system_info, local_risk_score (migration added)
- [x] `GET /api/ingest/endpoints/{ep_id}/detail` — rich snapshot
- [x] `GET /api/ingest/raw-logs/{endpoint_id}` — live log stream

**ITDR fixes**
- [x] DETECTOR_META now includes ALL alert types (honey_token_access, suspicious_process, fim_change, failed_login, yara_match, dga_domain, etc.)
- [x] Alert dedup covers ALL types with appropriate windows (10-60min)
- [x] Precise timestamps — `preciseTime()` shows "Jun 7 14:32:01 (3m ago)"
- [x] Alert detail panel — click to expand evidence + action buttons

**Red team audit fixes**
- [x] CRITICAL: `_fingerprint` / `_last_flagged` / `SCAN_THRESHOLD_*` never initialized → `DefenseFingerprintMiddleware` NameError fixed
- [x] CRITICAL: `AuditLog` called with wrong fields in `agent_security.py` (`resource_type`/`resource_id`/`details` don't exist) — fixed to `entity_type`/`entity_id`/`new_value`
- [x] HIGH: `Bell` icon not imported in `ITDRPage.jsx` → Analytics tab crashed (black screen) — fixed
- [x] HIGH: `mfa_setup_required` never handled in Login.jsx — admins bypassed MFA redirect — fixed
- [x] HIGH: `PlainTextResponse` imported inline — moved to top-level
- [x] MEDIUM: 11 bare `except:` → `except Exception:` across ingest.py + hardware_tools.py
- [x] MEDIUM: SQLite WAL mode crashes on network drives — wrapped in try/except with fallback
- [x] LOW: `hardware-tools.css` never imported → entire page layout broken — fixed
- [x] LOW: `useRef` used as `React.useRef` without import in Endpoints.jsx — fixed
- [x] LOW: `_last_flagged` defined twice in main.py — duplicate removed

**Rules added for future sessions:**
- `_fingerprint`, `_last_flagged`, `SCAN_THRESHOLD_*` must be defined before `DefenseFingerprintMiddleware` in main.py
- `AuditLog` correct fields: `user_id`, `user_email`, `action`, `entity_type`, `entity_id`, `new_value`
- `current_user` in all routes must be typed `User`, never `dict`

### v5.5 Bug Fixes + Demo System (this session)

**Defense Console critical bug fix**
- [x] `current_user: dict` → `current_user: User` in ALL defense.py endpoints — was causing silent 500 on every Block/Watchlist/Escalate/Dismiss button click
- [x] `current_user.get("email")` → `current_user.email` — User object has no `.get()` method
- [x] Added `User` import to `routers/defense.py`
- [x] Test event no longer calls Groq live — 4 hardcoded realistic scenarios rotate randomly (AI Agent Scan, Honeypot Trigger, Brute Force, Prompt Injection). No network timeout risk.
- [x] Toast notifications added to `DefenseConsole.jsx` — success/error feedback on every action
- [x] "Load Demo" button added to Defense Console header

**Website attack surface hardening (v5.4 additions)**
- [x] Public cases leaking `customer_name` + `analyst_name` — both redacted in `sanitize_case()`
- [x] Health endpoint exposing version, connector types, job names — stripped to minimal `{status, timestamp}`
- [x] Demo endpoint rate limiter blind behind Render proxy — now uses `X-Forwarded-For`
- [x] Demo endpoint now runs through prompt shield before Groq call

**Demo seed system — `backend/routers/demo.py`**
- [x] `POST /api/demo/seed` — seeds ALL sections (Identity, ITDR, Shadow AI, Defense, Agent Security) — idempotent
- [x] `POST /api/demo/seed/defense` — Defense Console only (5 realistic events)
- [x] `POST /api/demo/seed/identity` — Identity Graph + ITDR (10 nodes, edges, anomalies, 5 alerts)
- [x] `DELETE /api/demo/clear` — admin only, clears all demo data
- [x] Registered in `main.py`
- [x] How to seed: open browser console while logged in and run:
  ```javascript
  fetch('/api/demo/seed', { method:'POST', headers:{ 'Authorization':'Bearer '+sessionStorage.getItem('aegis_token'), 'Content-Type':'application/json' }}).then(r=>r.json()).then(console.log)
  ```

**Security rules added to this file (for future sessions):**
- JWT now uses `python-jose` — never revert to custom HMAC JWT implementation
- All passwords minimum 8 characters — enforced in auth.py
- `current_user` in all routes MUST be typed as `User`, never `dict` — `.get()` does not work on User objects
- All Groq calls automatically sanitised by `core/prompt_shield.py` — do not bypass
- Connector tokens stored via `core/encryption.py` `enc.encrypt()` — always decrypt before use

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
