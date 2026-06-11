# AEGISTRACE — MASTER CONTEXT FILE
**Version:** v10.0 | **Last updated:** June 2026 (Priority 1 & 2 of the v10.0 plan shipped: Temporal Linker/Attack Graph + SOAR Playbook Engine)
**Purpose:** Give this file to Claude at the start of any new session. It replaces the need to re-read all source files. **This is the single master doc for this project — all other planning/session/deploy docs have been folded into this file and removed.**

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

**Companion project:** `mcp-aegis` — MCP security gateway (`~/Documents/Claude/Projects/aegistrace-mcp-gateway/`)

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
backend/qdrant_store.py      Qdrant Cloud vector store — init_collection, upsert_case, search_similar; graceful fallback when QDRANT_URL unset (v8.1)
backend/embeddings.py        Embedding service — Qdrant primary / SQLite fallback; NV-EmbedQA-E5-v5 + NV-RerankQA reranker
backend/guardrails.py        Llama Guard 3 safety classifier (Phase 3)
backend/ingest_normalizer.py Alert format normalizer — Wazuh/osquery/Falco/Sysmon → case schema (Phase 5)
backend/agents/
  __init__.py
  tools.py          7 tool definitions + executors — added get_live_processes + analyze_process_anomalies (v9.0)
  triage_agent.py   Hermes-3 70B (NVIDIA NIM) agentic triage loop (max 6 iterations, Groq fallback)
  specialist.py     EmailAgent, EndpointAgent (v9.0 agentic loop), IOCAgent, IdentityAgent, ReportAgent
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
| enrichment | /api/enrichment | Multi-source IOC enrichment — Shodan, GreyNoise, IPInfo, URLhaus, ThreatFox, MalwareBazaar, NVD, CISA KEV, Feodo Tracker C2 (rate limited: 20/min) |
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
| vision | /api/vision | NVIDIA Phase 8: screenshot analysis via Llama 3.2 Vision 11B — verdict, IOCs, MITRE, recommended actions (v8.0) |
| rules | /api/rules | NVIDIA Phase 9: detection rule generation via Codestral 22B — YARA, Sigma, KQL, Splunk SPL (v8.0) |

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

### CaseDetail Tabs (15 total — v8.0)
`overview` · `investigation` · `iocs` · `terminal` · `timeline` · `trust-timeline` · `playbook` · `ai-analysis` · `ai-chat` · `vision` · `rules` · `comments` · `provenance` · `report` · `edr`

**v8.0 new tabs:**
- `vision` — VisionTab.jsx: screenshot upload → Llama 3.2 Vision 11B analysis → verdict, IOCs, MITRE, recommended actions
- `rules` — RulesTab.jsx: Generate Rules button → Codestral 22B → YARA + Sigma + KQL + Splunk SPL with copy buttons

### Frontend gotchas (non-obvious — read before editing)
- `caseData.iocs` and `caseData.mitre_techniques` are **JSON strings**, not arrays/objects — always `JSON.parse(caseData.iocs || '[]')`
- `PlaybookTab` (case-level playbook checklist, not the SOAR `Playbook` model) reads its state from `caseData.playbook_state` on mount and saves via `updateCase`
- `useParams()` returns the case ID as a **string**; the backend expects an int — Axios converts automatically for path params, but `parseInt(id)` if comparing client-side
- Report/file downloads need `{ responseType: 'blob' }` in the Axios config
- `addToast` from `useStore()` supports types `'success' | 'error' | 'warning'` — there is no separate "info" style
- Admin-only UI: gate on `user?.role === 'admin'`
- `case.is_public: bool` controls public-share visibility — use it to show/hide public-related UI

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

### Local Development
```bash
# Backend
cd backend
pip install -r requirements.txt
DATABASE_URL=sqlite:///./dev.db GROQ_API_KEY=your_key VIRUSTOTAL_API_KEY=your_key ADMIN_PIN=aegis2025 uvicorn main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm start   # runs on :3000, proxies API to :8000
```

### Docker
```bash
docker build -t aegistrace .
docker run -p 8000:8000 \
  -e GROQ_API_KEY=your_groq_key_here \
  -e VIRUSTOTAL_API_KEY=your_vt_key_here \
  -e ADMIN_PIN=aegis2025 \
  -v aegistrace_data:/var/data \
  aegistrace
# App available at http://localhost:8000
```

**Default admin login:** `prasanna80564@gmail.com` / password = `ADMIN_PIN` (default `aegis2025` if unset). Change immediately after first login via Admin → Your Account → Change Password.

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

### Priority 0 — v10.0 Session Plan (ACTIVE — June 2026)

**Full plan:** `AEGISTRACE_SESSION_PLAN_V10.md` (repo root). This is the current source of truth for what to build next, ahead of the priorities below. The gap it closes: AegisTrace detects everything but correlates nothing automatically, responds manually to alerts, and doesn't adapt its own detection over time.

- [x] **Priority 1 — Temporal Linker + Attack Graph Tab** (DONE — June 2026)
  - Correlates events from `RawLogEvent`, `ITDRAlert`, `DefenseEvent`, `AgentAction`, `ShadowAIEvent`, `HardwareAlert` on the same host within ±5s windows, clusters into "steps", sends to Nemotron-70B (Groq `call_ai_json` fallback) for a JSON attack narrative (`steps`, `narrative`, `mitre_chain`, `confidence`, `suggested_title`).
  - **Files shipped:** `backend/linker.py` (new — `reconstruct_chain(case_id, session)`: gathers anchor events via `case_id` FK from `AgentAction`/`ITDRAlert`/`ShadowAIEvent`/`HardwareAlert`, resolves hostnames (incl. `ShadowAIEvent.agent_id` → `Endpoint.hostname`), enriches with `RawLogEvent` for those hostnames within a ±10min window, adds `DefenseEvent` rows whose `attacker_ip` matches an `ip`-type case IOC within ±1h, sorts chronologically, clusters into steps using a 5s gap threshold, then calls Nemotron-70B / Groq fallback for the narrative); `backend/routers/graph.py` (new — `GET /api/graph/reconstruct?case_id=X`, org-scoped); registered in `backend/main.py` router list; `frontend/src/pages/app/CaseDetail/AttackGraphTab.jsx` (new — narrative box, MITRE chain chips, confidence, "Apply to Case" button that merges `mitre_chain` into `case.mitre_techniques` and appends the narrative to `case.description`, step timeline, collapsible correlated-events list); registered as the "🕸 Attack Graph" tab in `CaseDetail/index.jsx`.
  - **Verified:** query/clustering logic tested against an in-memory SQLite DB seeded with a `Case` + `Endpoint` + one event from each of the 6 sources (incl. an IP-matched `DefenseEvent`) — correctly produced 7 events grouped into 2 clusters (6 events within 5s of each other, 1 separate step 5 min later) and built a valid Nemotron prompt; `reconstruct_chain()` end-to-end (with mocked AI call) returned all expected keys. Frontend: `npm run build` compiles cleanly with the new tab and component.
  - **Not yet done:** no live test against the production NVIDIA/Groq keys (none configured in this session's environment) — the AI call path uses the same try-NVIDIA/fallback-to-Groq pattern as `routers/rules.py`, which is already proven in production.
- [x] **Priority 2 — Playbook Engine (SOAR)** (DONE — June 2026)
  - New models `Playbook` (trigger_event_type, trigger_conditions JSON, actions JSON array, is_active, requires_approval global gate, run_count, last_run_at) and `PlaybookRun` (playbook_id, trigger_event_type, trigger_event_id, actions_taken/actions_pending JSON, status, result_summary, run_at, completed_at) in `backend/models.py`. Rule engine evaluates `min_*`/`max_*` numeric-threshold conditions plus exact/case-insensitive string matches against incoming event data, then runs each action immediately or queues it to the `/app/agent-security` approval queue (`ProvenanceLedger`, `action_type="playbook_action"`) depending on the per-action × per-playbook approval gate (`requires_approval = action_default AND playbook.requires_approval` — the playbook flag can only relax approval, never add it).
  - **Files shipped:** `backend/routers/orchestration.py` (new, ~400 lines — `ACTION_TYPES` default-approval map, `SEED_PLAYBOOK`, `_conditions_match()`, action handlers `_action_isolate_endpoint`/`_action_create_case`/`_action_send_webhook`/`_action_page_oncall`/`_action_add_case_comment`/`_action_enrich_ioc`/`_action_generate_rules`, `_execute_action()` dispatcher, `execute_approved_playbook_action()` approval-execution closure, `evaluate_playbooks()` core evaluator + `PlaybookRun` audit trail, `seed_builtin_playbooks()`, full CRUD + `/api/orchestration/evaluate` (dry-run) + `/api/orchestration/seed` REST endpoints); `backend/main.py` (router registration + startup seed of the built-in "Critical MCP Block → Contain" playbook); `backend/routers/ingest.py` (`evaluate_playbooks()` hooked into `ingest_telemetry` for new `ITDRAlert`/`ShadowAIEvent` rows and into `ingest_mcp_event` for blocked/flagged MCP tool calls); `backend/routers/agent_security.py` (`approve_action` is now async and, for `action_type="playbook_action"` records, calls `execute_approved_playbook_action()` to run the deferred action e.g. endpoint isolation); `frontend/src/pages/app/Playbooks.jsx` (new — full CRUD UI with dynamic condition/action editors, run history, dry-run "Test" modal); `frontend/src/App.jsx` + `frontend/src/components/Sidebar.jsx` (route + "Playbooks" nav item under "Control", Workflow icon); public pages `frontend/src/pages/Landing.jsx` (new "Attack Graph Reconstruction" + "Playbook Engine (SOAR)" entries in `MODULES`), `frontend/src/pages/Mission.jsx` (Temporal Linker + SOAR Playbook Engine moved to V1 "Foundation — Shipped"; V2 "SOAR Playbook Engine" replaced with "Adaptive Thresholds Agent" for Priority 3), `frontend/src/pages/Portfolio.jsx` (flagship project description updated to mention the Temporal Linker and SOAR playbook engine).
  - **Verified:** end-to-end tested in a throwaway venv (`DATABASE_URL=sqlite:////tmp/testdb.db`) — seed idempotency, dry-run match/no-match via `/api/orchestration/evaluate`, a real run creating a `Case` + `ProvenanceLedger` (pending approval) + `PlaybookRun`, and the approval-execution closure creating an `AgentCommand` for endpoint isolation after approval. Frontend: `npm run build` compiles cleanly with the new Playbooks page, routes, sidebar entry, and updated public pages.
- [ ] **Priority 3 — Adaptive Thresholds Agent** (2 days, next up — "it improves itself")
  - **What it does:** background agent runs every 4 hours, computes FP/FN rates and avg detection confidence from the last 24h, asks Nemotron-70B for threshold adjustments within hardcoded bounds, applies them at runtime (no restart), logs every change.
  - **New model** `AdaptiveThresholdLog` in `backend/models.py`: `threshold_name` (anomaly_score | behavioral_similarity | itdr_confidence), `old_value`/`new_value` (float), `reason` (Text), `fp_rate_24h`, `fn_rate_24h`, `agent_model`, `applied_at`.
  - **`backend/adaptive_config.py`** — in-memory runtime config singleton:
    ```python
    _config = {
        "anomaly_score_threshold": 70,
        "behavioral_similarity_threshold": 0.85,
        "itdr_confidence_threshold": 0.75,
        "defense_fp_tolerance": 0.05,
    }
    ADJUSTMENT_BOUNDS = {  # agent can only move within ±20% of defaults
        "anomaly_score_threshold":         (56, 84),
        "behavioral_similarity_threshold": (0.68, 1.0),
        "itdr_confidence_threshold":       (0.60, 0.90),
    }
    ```
  - **`backend/adaptive_agent.py`** — `adaptive_agent_cycle()`: compute `fp_rate` (DefenseEvents dismissed/total), `fn_estimate` (ITDRAlerts marked false_positive), `avg_confidence`; build a Nemotron prompt with current stats + thresholds + bounds, target FP<5%/FN<2%/confidence>75%; on response, clamp each returned value to its bound, log via `AdaptiveThresholdLog`, and update `_config`.
  - **Hardcoded safety prompt:** "You may ONLY adjust the numeric thresholds listed. You may NEVER disable detectors, change user permissions, delete data, or modify authentication settings. All adjustments must stay within the provided bounds."
  - **Files to create/modify:** `backend/adaptive_config.py` (new), `backend/adaptive_agent.py` (new — start as background thread/task in `backend/main.py` startup, after the scheduler), `backend/routers/defense.py` + `backend/routers/itdr.py` (read thresholds from `adaptive_config` instead of hardcoded constants), new `GET /api/adaptive/log` endpoint (last 30 changes, in `routers/analytics.py` or `routers/admin.py`), `frontend/src/pages/app/DefenseConsole.jsx` (add an "Adaptive Engine" panel showing current thresholds + last change).
- [ ] **Priority 4 — Auto-Rule Generation Trigger** (1 day, after Priority 3)
  - **What it does:** extends the existing `/api/rules/cases/{id}/generate` (Codestral 22B, already built) — a nightly job checks if the same MITRE technique appears across 3+ cases within 7 days and auto-triggers rule generation into a "pending review" queue, without analyst input.
  - **New model** `DetectionRule` in `backend/models.py`: `rule_name`, `source_case_id` (FK → case.id), `mitre_technique`, `yara`/`sigma`/`kql`/`splunk_spl` (Text), `generated_by` (auto|analyst), `status` (pending_review|approved|rejected|deployed), `reviewed_by`, `reviewed_at`, `org_id`, `created_at`.
  - **Trigger logic** (nightly via existing scheduler) — `check_rule_generation_triggers()`: for cases created in the last 7 days, group by MITRE technique ID (from `case.mitre_techniques` JSON); for any technique appearing in 3+ cases with no `DetectionRule` already generated this week, call Codestral rule generation for the most recent case and insert a `pending_review` `DetectionRule`.
  - **Files to modify:** `backend/models.py` (add `DetectionRule`), `backend/routers/rules.py` (add `GET /api/rules/pending`, `POST /api/rules/{id}/approve`, `POST /api/rules/{id}/reject`), scheduler module (add nightly `check_rule_generation_triggers()` call), frontend Rules UI (add a "Pending Review" tab, or create a minimal page if none exists).

**Deferred items (do NOT build yet):** PIPROXY (mitmproxy prompt-injection proxy, month 2+), fine-tuning pipeline (needs PIPROXY data first), MCP Guard full sandbox (scoped down to a future `mcp-verify` CLI: static analysis + VirusTotal + Sigstore — companion to `mcp-aegis`), NHI Guard as separate repo (rejected — extend `/api/nhi` with `AWSConnector` in `backend/core/connectors/aws_iam.py` instead, 2-3 days), Shadow Sentry eBPF (deferred — mitmproxy+JA3 fingerprinting user-space alternative, month 2), SBC Edge Agent (Phase 5+, needs Playbook Engine + Adaptive Thresholds first), NVIDIA Morpheus (post free-tier, needs GPU+Kafka).

**The story this builds:** (1) "It correlates everything automatically" — Temporal Linker. (2) "It responds in seconds, not hours" — Playbook Engine. (3) "It adjusts its own detection based on live performance" — Adaptive Thresholds Agent. (4) "Its detection library grows without analyst intervention" — Auto-rule generation.

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
- [x] **SOAR Playbooks engine** — builder UI + automated execution: trigger → action sequence → approval gate — completed v10.0, see Priority 2 above
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
- [x] **MCP Security Gateway** — shipped as standalone `mcp-aegis` v0.2.0 package (see below); GitHub: Prasanna-27eng/mcp-aegis
- [ ] Agent Supervision Console — per-AI-agent kill switches + task scope enforcement
- [ ] Attacker Path Reconstruction — visual kill-chain across human + machine actors
- [ ] Endpoint Agent Layer 3 (eBPF) — Falco companion process on Linux
- [ ] Endpoint Agent Layer 4 (Memory Forensics) — Volatility 3 integration

### mcp-aegis — Companion Project (v0.2.0, June 2026)

**Standalone PyPI package:** `pip install mcp-aegis`  
**Repo:** `~/Documents/Claude/Projects/aegistrace-mcp-gateway/` · GitHub: `https://github.com/Prasanna-27eng/mcp-aegis`  
**Description:** MCP security gateway that sits between any AI agent and any MCP server. Blocks dangerous tool calls by default, logs everything to SQLite, ships with a 7-rule default TOML policy.

**Architecture:**
```
AI Agent → POST http://localhost:8765/ → mcp-aegis gateway
                                          │
                                     PolicyEngine (TOML rules)
                                          │
                            BLOCK / ALLOW / LOG_ONLY / REQUIRE_APPROVAL
                                          │
                                     AuditLog (SQLite)
                                     Webhook (optional → any SIEM)
                                     AegisSender (optional → AegisTrace AgentAction queue)
```

**Files shipped (v0.2.0):**
- `src/mcp_aegis/types.py` — Decision enum (ALLOW/BLOCK/LOG_ONLY/REQUIRE_APPROVAL), MCPRequest, PolicyDecision, AuditEvent
- `src/mcp_aegis/proxy.py` — MCPProxy: intercept JSON-RPC, policy-check, forward or block, add_pending on REQUIRE_APPROVAL
- `src/mcp_aegis/stdio_transport.py` — NEW v0.2: async stdio proxy; run_stdio_http() + run_stdio_subprocess() (Claude Desktop compatible)
- `src/mcp_aegis/server.py` — FastAPI app: POST /, GET /sse (streaming passthrough), GET /health
- `src/mcp_aegis/policy.py` — PolicyEngine: TOML loader, evaluate(), test(), reload(), from_default()
- `src/mcp_aegis/policy_default.toml` — v2.0: 7 default rules + commented REQUIRE_APPROVAL example
- `src/mcp_aegis/audit.py` — SQLite WAL-mode: sessions + events + pending_approvals tables; _WebhookSender + _AegisSender; add_pending/resolve_pending/list_pending
- `src/mcp_aegis/cli.py` — typer CLI: serve (--transport, --upstream-cmd), logs, stats, pending, approve, deny, policy test/show
- `pyproject.toml` — hatchling build, mcp-aegis 0.2.0, Python ≥ 3.10
- `README.md` — updated: stdio, REQUIRE_APPROVAL, AegisTrace integration, Claude Desktop config example

**Default policy decisions:**
| Rule | Decision | Catches |
|------|----------|---------|
| block_shell_execution | BLOCK | bash, shell, exec, run_command, *_exec, *_bash |
| block_credential_reads | BLOCK | ~/.ssh/*, ~/.aws/*, .env, credentials, .netrc, .gnupg/*, gcloud/* |
| log_home_directory_crawl | LOG_ONLY | *_read, *_list under home paths |
| log_network_requests | LOG_ONLY | http_request, curl, fetch, *_request, *_fetch |
| log_git_credential_exposure | LOG_ONLY | .git/config, .gitconfig |
| log_sampling_calls | LOG_ONLY | sampling/createMessage |
| log_database_writes | LOG_ONLY | *_write, *_delete, *_drop, execute_sql, query |

**CLI usage (v0.2):**
```bash
mcp-aegis serve --upstream http://localhost:3000 --dry-run
mcp-aegis serve --transport stdio --upstream-cmd "npx -y @modelcontextprotocol/server-filesystem ~/Documents"
mcp-aegis logs --tail
mcp-aegis stats
mcp-aegis pending                  # list REQUIRE_APPROVAL items
mcp-aegis approve <id>
mcp-aegis deny <id>
mcp-aegis policy test bash         # exit 1 = BLOCK
mcp-aegis policy show
```

**AegisTrace native integration (v0.2):** Set `AEGISTRACE_URL` + `AEGISTRACE_INGEST_KEY` — BLOCK/REQUIRE_APPROVAL events POST to `/api/ingest/mcp-event`, creating AgentAction entries at `/app/agent-security`.

**AegisTrace backend (v9.1):** `POST /api/ingest/mcp-event` added to `routers/ingest.py` — creates `AgentAction(agent_name="mcp-aegis", action_type="mcp_block"|"mcp_require_approval")`. Same INGEST_API_KEY auth as endpoint agents.

**v0.3 roadmap:** Community policy library, STIX 2.1 export, MITRE ATT&CK tagging, Docker image, true async approval (SSE back-channel).

### mcp-sploit — Companion Project (v0.2.0, June 2026)

**Standalone repo:** `~/Documents/Claude/Projects/mcp-sploit/` · GitHub: `https://github.com/Prasanna-27eng/mcp-sploit`
**Description:** Metasploit-style exploitation framework for testing MCP servers and `mcp-aegis` itself. Speaks real JSON-RPC 2.0 MCP (`initialize`, `tools/list`, `tools/call`) so it works against a raw MCP server or an `mcp-aegis` gateway with no changes — purple-team validation is just pointing `TARGET` at the gateway URL.

**Architecture:**
```
mcp-sploit console (msfconsole-style)
   │  use / set / show options / check / exploit / back / search
   ▼
ModuleRegistry — dynamic-loads modules under msploit/modules/
   │
   ▼
MCPClient (JSON-RPC 2.0 over POST /) ──► TARGET = raw MCP server
                                      ──► TARGET = mcp-aegis gateway URL
```

**Files shipped (v0.1.0):**
- `src/msploit/mcp_client.py` — JSON-RPC 2.0 client (`initialize`, `tools/list`, `tools/call`); raises `MCPError` on JSON-RPC error envelopes (covers both real upstream errors and mcp-aegis BLOCK responses)
- `src/msploit/base.py` — `Option`, `Module`, `AuxiliaryModule`, `ExploitModule`; option get/set/validate, `show_options()`, `info()`
- `src/msploit/framework.py` — `ModuleRegistry`: dynamic module discovery via `pkgutil.walk_packages`
- `src/msploit/cli.py` — `cmd.Cmd`-based REPL: `show modules/exploits/auxiliary/options`, `search`, `use`, `back`, `info`, `set`, `unset`, `check`, `exploit`/`run`, `exit`
- `src/msploit/modules/auxiliary/scanner/mcp_enum.py` — enumerates tools via `tools/list`, flags high-risk tool names
- `src/msploit/modules/exploit/mcp/file_exfiltration.py` — reads arbitrary files via an unauthenticated `read_file` tool (`FILE`, `TOOL` options)
- `src/msploit/modules/exploit/mcp/shell_exec.py` — RCE via an unauthenticated `execute_shell` tool (`CMD`, `TOOL` options)
- `target_server/app.py` — intentionally vulnerable JSON-RPC 2.0 MCP server (no auth) exposing `read_file` + `execute_shell`, for deterministic sandbox testing
- `docker-compose.yml` + `Dockerfile`s — isolated `mcp-net` bridge network, `vulnerable-mcp` + `mcp-sploit` services
- `tests/test_framework.py` — pytest: module loading, option validation, `check()` never sends the exploit payload (5/5 passing)

**New in v0.2.0 — 4 modules + MITRE ATT&CK/ATLAS references:**
- `src/msploit/modules/exploit/mcp/prompt_injection.py` — calls a tool that returns externally-sourced content (`web_fetch`, `URL` option) and scans the response for embedded attacker instructions (e.g. `<!-- AI-AGENT-INSTRUCTION: ... -->`, "ignore previous instructions"). The MCP-native attack: indirect prompt injection / tool response poisoning. References **MITRE ATLAS AML.T0051 (LLM Prompt Injection)** + AML.T0054 (LLM Jailbreak).
- `src/msploit/modules/auxiliary/scanner/mcp_auth_bypass.py` — sends `initialize` + `tools/list` with zero credentials; flags target as vulnerable (CWE-306) if the full handshake succeeds unauthenticated.
- `src/msploit/modules/exploit/mcp/tool_schema_abuse.py` — sends 5 type-confused payloads (int, array, object, 100k-char string, null-byte) for a tool's declared `string` field (`TOOL`/`FIELD` options) and reports ACCEPTED vs REJECTED per payload. CWE-20.
- `src/msploit/modules/auxiliary/scanner/mcp_policy_probe.py` — fires 8 representative `tools/call` probes mirroring mcp-aegis's default policy categories (shell exec, `~/.ssh/id_rsa`, `.env`, home dir crawl, SSRF-style network request, `.git/config`, SQL write, benign read) and classifies each as `[BLOCKED]` (JSON-RPC -32600), `[ALLOWED-NOOP]`, or `[ALLOWED]` — fingerprints the gateway's effective ruleset in one run, including the known `tools/call` credential-read gap below.
- Existing modules now carry references too: `file_exfiltration` → ATT&CK T1005 + T1552.001, `shell_exec` → ATT&CK T1059, `mcp_enum` → ATT&CK T1518.
- `target_server/app.py` — added 4 new mock tools (`list_files`, `http_request`, `execute_sql`, `web_fetch`, `search_logs` — 5 total) so the new scanners/exploits have realistic targets; `tools/call` dispatch now wraps `_call_tool` in try/except and returns a JSON-RPC `-32000` error instead of crashing on type-confused input.
- `tests/test_framework.py` — 9/9 passing (4 new tests covering the new modules).

**Verified end-to-end (June 2026):**
- `use exploit/mcp/file_exfiltration` → `check` → `exploit` against `target_server` → retrieved `/etc/passwd` ✅
- `use exploit/mcp/shell_exec` → `exploit` against `target_server` → ran `id` via `execute_shell` ✅
- `use exploit/mcp/prompt_injection` → `exploit` against `target_server` (`web_fetch` URL=`https://evil.test/article`) → response contained the injected `AI-AGENT-INSTRUCTION` HTML comment, both injection markers detected ✅
- `use exploit/mcp/tool_schema_abuse` → `exploit` against `target_server` (`search_logs`/`query`) → 5/5 malformed payloads ACCEPTED (no schema enforcement) ✅
- `use auxiliary/scanner/mcp_auth_bypass` → `run` against `target_server` → unauthenticated `initialize` + `tools/list` both succeeded, flagged VULNERABLE ✅
- `use auxiliary/scanner/mcp_policy_probe` → `run` against `target_server` (no gateway) → all 8 probes `[ALLOWED]`/`[ALLOWED-NOOP]` (no policy in front) ✅
- **Purple team vs mcp-aegis (default policy, port 8766 → upstream 8765):**
  - `exploit/mcp/shell_exec` → **BLOCKED** by `block_shell_execution` (JSON-RPC error -32600) ✅
  - `exploit/mcp/file_exfiltration` (FILE=`~/.ssh/id_rsa`, via `tools/call read_file`) → **NOT BLOCKED**, decision=`ALLOW`/`default_allow` ⚠️

**Known gap found via purple-team testing (mcp-aegis, not yet fixed):** `block_credential_reads` and `log_home_directory_crawl` in `policy_default.toml` only match `resource_patterns` against `MCPRequest.resource_uri`, which is populated **only for `method == "resources/read"`**. A `tools/call` to `read_file` with `arguments.path` pointing at `~/.ssh/id_rsa` or `.env` bypasses both rules entirely (falls through to `default_allow`) — `auxiliary/scanner/mcp_policy_probe` surfaces this directly via its `credential_read_ssh`/`credential_read_env` probes. To close this, `policy.py`'s `_rule_matches` would need to also check tool-call argument values (e.g. `path`, `file`, `uri` keys in `params.arguments`) against `resource_patterns` for `tools/call` requests. Separately, `mcp-aegis logs` (non-`--tail`) currently crashes (`AttributeError: 'AuditEvent' object has no attribute 'get'` in `cli.py:226`) — `_print_table` calls `.get()` on a dataclass row.

**Roadmap:** re-run `mcp_policy_probe` against the mcp-aegis gateway (port 8766) once the `tools/call` argument-matching gap above is fixed, to confirm `credential_read_ssh`/`credential_read_env` flip to `[BLOCKED]`; community modules (e.g. `exploit/mcp/sql_injection`); AegisTrace dashboard view for mcp-sploit run history.

**Discoverability/community assets added (June 2026):** `.github/workflows/ci.yml` (pytest matrix on 3.10/3.11/3.12 — created on disk, must be added via GitHub web UI since the local PAT lacks `workflow` scope), `CITATION.cff`, `CONTRIBUTING.md`, README "Why mcp-sploit?" section (positions mcp-sploit as the dynamic/offensive complement to static scanners like `mcp-scan`, links OWASP MCP Top 10 + MITRE ATLAS), `pyproject.toml` keywords/classifiers for PyPI search, `demo.tape` + `demo.gif` (VHS-recorded console walkthrough embedded in README). Package builds clean (`python -m build` + `twine check` pass) and is ready for `twine upload` to PyPI under the unclaimed name `mcp-sploit` — pending the user's PyPI account/API token.

**Published to PyPI (June 2026):** `pip install mcp-sploit` works — v0.2.0 live at https://pypi.org/project/mcp-sploit/0.2.0/.

### prompt-fuzz — Companion Project (v0.1.0, built June 2026)

**Standalone repo:** `~/Documents/Claude/Projects/prompt-fuzz/` · GitHub: `https://github.com/Prasanna-27eng/prompt-fuzz` (pushed, public)
**Description:** Async CLI that fuzzes OpenAI-compatible chat completion endpoints (`/v1/chat/completions`) with a curated jailbreak/prompt-injection payload library and reports which payloads bypass the target's guardrails. Where `mcp-sploit` attacks the AI's *tools* (MCP layer), `prompt-fuzz` attacks the AI's *brain* (the LLM/system-prompt layer). Second tool in the "Grassroots Expansion Pack" (`mcp-sploit` → `prompt-fuzz` → `nhi-hunter` → `shadow-sniffer`, all feeding the AegisTrace enterprise dashboard).

**Why it's a natural fit for AegisTrace:** AegisTrace already ships a *defensive* prompt-injection layer — `backend/core/prompt_shield.py` (singleton `shield`, 24 regex patterns across 9 categories: `system_override`, `instruction_inject`, `role_hijack`, `jailbreak`, `delimiter_inject`, `role_delimiter`, `exfiltration`, `xml_inject`, `template_inject`, `encoding_bypass`, wired into every `ai_router.py` Groq call). `prompt-fuzz`'s built-in payload library tags each payload with the **same category names**, so it doubles as a literal purple-team test suite for `prompt_shield.py` — the `mcp-sploit`/`mcp-aegis` purple-team pattern, one layer up the stack (LLM guardrails instead of MCP tool policy).

**Files shipped (v0.1.0, Core + Wrapper architecture):**
- `src/promptfuzz/engine.py` — `FuzzEngine`: async `httpx` executor with bounded concurrency (`asyncio.Semaphore`), posts `[system?, user=payload]` to `/v1/chat/completions`, optional `transport=` override for in-process ASGI testing; `summarize()` computes total/blocked/bypassed + per-category breakdown
- `src/promptfuzz/payloads.py` — loader for built-in/custom payload JSON, category filtering, `make_canary()` (random `AEGIS-CANARY-<hex>` token per scan) + `make_system_prompt()` (default canary-bearing system prompt)
- `src/promptfuzz/data/payloads.json` — **51 built-in payloads across 10 categories** (the 9 `prompt_shield` categories + `jailbreak`), each with `id`/`category`/`severity`/`prompt`/optional `success_markers`/MITRE ATLAS or CWE `references`. Includes DAN 6.0, STAN, AIM, Developer Mode, DUDE, grandma exploit, base64/ROT13/fromCharCode encoding bypasses, fake `[SYSTEM]`/`<|im_start|>system`/XML delimiter injections, etc.
- `src/promptfuzz/detectors.py` — `evaluate()` combines 3 signals into a `Verdict`: canary-leak (token from system prompt appears in response), compliance markers (payload-specific phrases like "DAN Mode enabled"), and refusal-absence (regex bank of refusal phrases — every built-in payload is an attack, so no refusal = bypass)
- `src/promptfuzz/cli.py` — Typer CLI: `prompt-fuzz scan --target <url> [--api-key --model --concurrency --categories --payloads --no-system-prompt --output --show-responses --aegistrace-url --aegistrace-key]` (rich tables, exits non-zero if any bypass — usable as a CI gate) + `prompt-fuzz list-payloads`
- `src/promptfuzz/reporter.py` — posts bypassed payloads to AegisTrace's `/api/ingest/promptfuzz-event`
- `mock_target/app.py` — deliberately weak FastAPI OpenAI-compatible `/v1/chat/completions` mock (complies with DAN/STAN/AIM/`[SYSTEM]`/encoding triggers, refuses everything else) — same role as `mcp-sploit`'s `target_server/`
- `tests/` — 17/17 passing: payload-library integrity, detector unit tests, engine tests via `httpx.ASGITransport` against `mock_target` (no live server needed), CLI `list-payloads` tests
- MIT `LICENSE`, `CITATION.cff`, `CONTRIBUTING.md`, `README.md` (quick start, payload table, AegisTrace integration section, companion-projects links), `.github/workflows/ci.yml` (pytest matrix 3.10-3.12 — on disk only, same `workflow`-scope PAT issue as mcp-sploit, needs manual add via GitHub web UI)

**AegisTrace backend (this session):** `POST /api/ingest/promptfuzz-event` added to `routers/ingest.py` (mirrors `/mcp-event`) — creates `AgentAction(agent_name="prompt-fuzz", action_type="prompt_fuzz_bypass")` entries visible in `/app/agent-security`. Same `X-AegisTrace-Key`/`INGEST_API_KEY` auth as mcp-aegis and endpoint agents. No new frontend needed.

**Verified end-to-end (June 2026):** ran `prompt-fuzz scan` against the bundled `mock_target` (live uvicorn on :8090) — 51/51 payloads, 0 errors, 23 bypassed (45.1%), with `jailbreak` and `encoding_bypass` categories at 100% bypass and `exfiltration`/`instruction_inject`/`template_inject` fully blocked by the mock's refusal path. `--output`/JSON results and `--categories` filtering both verified.

**Published to PyPI (June 2026):** `pip install prompt-fuzz-cli` works — v0.1.0 live at https://pypi.org/project/prompt-fuzz-cli/0.1.0/ (PyPI rejected the literal name `prompt-fuzz` as "too similar" to an existing unrelated package `promptfuzz`; CLI command stays `prompt-fuzz`, GitHub repo stays `prompt-fuzz`, only the PyPI distribution name changed).

**Roadmap:** demo GIF for README (same VHS approach as mcp-sploit); `nhi-hunter` (3rd tool in the Grassroots Expansion Pack) — see new section below.

### nhi-hunter — Companion Project (v0.1.0, built June 2026)

**Standalone repo:** `~/Documents/Claude/Projects/nhi-hunter/` · GitHub: `https://github.com/Prasanna-27eng/nhi-hunter` (pushed, public)
**Description:** Non-Human Identity (NHI) attacker — an AWS IAM privilege-escalation graph builder and pathfinder. Where `mcp-sploit` attacks the AI's *tools* and `prompt-fuzz` attacks the AI's *brain*, `nhi-hunter` attacks the *identity layer* underneath an AI agent's cloud deployment: the IAM roles, trust policies, and permission chains that let a low-privilege role (e.g. a CI/CD OIDC role) pivot to Admin/PowerUser. Third tool in the "Grassroots Expansion Pack" (`mcp-sploit` → `prompt-fuzz` → `nhi-hunter` → `shadow-sniffer`).

**Why it's a natural fit for AegisTrace:** AegisTrace's Identity Graph + Risk Engine (`/app` Identity Graph view) already models identities and relationships; `nhi-hunter` produces the same kind of graph (nodes = IAM roles/users, edges = `sts:AssumeRole`/`iam:PassRole`+`lambda:*` permissions) from a local AWS IAM JSON dump, so its output can feed or cross-validate AegisTrace's Identity Graph Risk Engine — a purple-team check for "can our identity graph actually find this escalation path."

**Files shipped (v0.1.0, Core + Wrapper architecture):**
- `src/nhi_hunter/parsers.py` — parses a real `aws iam get-account-authorization-details` JSON dump (`RoleDetailList`/`UserDetailList`/`GroupDetailList`/`Policies`) into `Identity` records: name, ARN, kind (role/user), flattened `Allow` statements (inline + attached managed + group policies resolved), trust-policy principals, and an `is_admin` flag (AdministratorAccess/PowerUserAccess attached, a `*`/`*` statement, or "admin"/"poweruser" in the name). Documented V1 limitations: `NotAction`/`NotResource` statements skipped, `Condition` blocks ignored, resource policies (S3/Lambda) not modeled.
- `src/nhi_hunter/graph_builder.py` — builds a `networkx.MultiDiGraph`: edge `A -> B` = "A can obtain B's permissions" via **`sts:AssumeRole`** (A's policy allows AssumeRole on B's ARN *and* B's trust policy allows A) or **`iam:PassRole + lambda:*`** (A can PassRole to B *and* create/update/invoke Lambda functions). Both techniques tagged with MITRE ATT&CK **T1078.004** (Valid Accounts: Cloud Accounts).
- `src/nhi_hunter/pathfinder.py` — `find_escalation_paths()` runs `networkx.shortest_path` from `--start-role` to every `is_admin` identity, sorted shortest-first; `EscalationPath.render()` produces the readable attack-tree text.
- `src/nhi_hunter/cli.py` — Typer CLI: `nhi-hunter scan --input <dump.json> --start-role <name> [--output --aegistrace-url --aegistrace-key]` (rich tables, exits non-zero if any path found — usable as a CI gate) + `nhi-hunter list-identities`.
- `src/nhi_hunter/reporter.py` — posts discovered paths to AegisTrace's `/api/ingest/nhihunter-event`.
- `tests/fixtures/vulnerable_iam.json` — 5-identity dump with a 2-hop `sts:AssumeRole` chain (`CIRunner` → `DevRole` → `AdminRole`) and a 1-hop `iam:PassRole`+Lambda chain (`GitHubActionsOIDC` → `LambdaAdminRole`); `tests/fixtures/clean_iam.json` — a `ReadOnlyRole` with zero outgoing escalation edges, demonstrating no false positives.
- `examples/sample_iam_dump.json` (copy of the vulnerable fixture, for `pip install`-only trying-out without AWS credentials).
- `tests/` — 24/24 passing: parser, graph-builder, pathfinder, and Typer CLI (`CliRunner`) tests.
- MIT `LICENSE`, `CITATION.cff`, `CONTRIBUTING.md`, `README.md` (quick start, attack-tree examples, edge-technique table, AegisTrace integration, companion-projects links), `.github/workflows/ci.yml` (pytest matrix 3.10-3.12 — on disk only, same `workflow`-scope PAT issue as mcp-sploit/prompt-fuzz, needs manual add via GitHub web UI).

**AegisTrace backend (this session):** `POST /api/ingest/nhihunter-event` added to `routers/ingest.py` (mirrors `/promptfuzz-event`) — creates `AgentAction(agent_name="nhi-hunter", action_type="iam_privesc_path_found")` entries visible in `/app/agent-security`. Same `X-AegisTrace-Key`/`INGEST_API_KEY` auth. No new frontend needed.

**Verified end-to-end (June 2026):** `nhi-hunter scan --input examples/sample_iam_dump.json --start-role CIRunner` → found the 2-hop `sts:AssumeRole` chain to `AdminRole` and a 3-hop chain to `LambdaAdminRole`, exit code 1; `--start-role GitHubActionsOIDC` → found the 1-hop `iam:PassRole + lambda:*` chain to `LambdaAdminRole` (and a 2-hop chain onward to `AdminRole`, since an AdministratorAccess holder has wildcard permissions over every other identity too); `clean_iam.json` / `ReadOnlyRole` → "No privilege-escalation path found", exit code 0. Clean `pip install` of the built wheel verified in a fresh venv.

**Published to PyPI (June 2026):** `pip install nhi-hunter` works — v0.1.0 live at https://pypi.org/project/nhi-hunter/0.1.0/ (no name collision this time).

**Roadmap:** demo GIF for README; add `shadow-sniffer` (4th and final tool in the Grassroots Expansion Pack) next.

### shadow-sniffer — Companion Project (v0.1.0, built June 2026)

**Standalone repo:** `~/Documents/Claude/Projects/shadow-sniffer/` · GitHub: `https://github.com/Prasanna-27eng/shadow-sniffer` (pushed, public)
**Description:** Shadow AI detector — scans a local network connection log (JSON or CSV) against a curated catalog of known third-party AI service domains, cross-references matches against an organization's approved-services allowlist, and reports unsanctioned AI usage. Where `mcp-sploit` attacks the AI's *tools*, `prompt-fuzz` attacks its *brain*, and `nhi-hunter` attacks the *identity layer*, `shadow-sniffer` looks at the *data layer* — where is data actually going. Fourth and final tool in the "Grassroots Expansion Pack" (`mcp-sploit` → `prompt-fuzz` → `nhi-hunter` → `shadow-sniffer`).

**Why it's a natural fit for AegisTrace:** AegisTrace's endpoint agent (v3.0+) already ships a live `detect_shadow_ai()` detector (`agent/aegistrace_agent.py`) with a 14-domain `AI_API_DOMAINS` list, an `ApprovedAIService` allowlist model, a `ShadowAIEvent` table, and an `/app/shadow-ai` dashboard — but it requires the endpoint agent to be installed and running. `shadow-sniffer` is the offline/standalone counterpart: point it at an exported connection log (no agent install needed) to do the same cross-reference, expanded to a 39-domain catalog across 8 categories (LLM Chat, LLM API, Code Assistant, Image/Video Generation, Voice & Audio, etc. — vs. the agent's 14 LLM-API-only domains).

**Files shipped (v0.1.0, Core + Wrapper architecture):**
- `src/shadow_sniffer/catalog.py` — `AI_SERVICE_CATALOG`: 39 `AIService(name, domain, category)` entries across 8 categories; `match_domain()` does case-insensitive suffix matching (e.g. `eu.api.openai.com` matches `api.openai.com`, but `api.openai.com.attacker.net` does not).
- `src/shadow_sniffer/parsers.py` — `ConnectionRecord` dataclass; `parse_json_log()`/`parse_csv_log()`/`parse_log()` (extension dispatch) with flexible field aliases (`dest_domain`/`destination_domain`/`remote_hostname` all map to `dest_host`, etc., reusing the same field names as the endpoint agent's `connections` list); `load_approved_domains()` reads a JSON `{"approved_domains": [...]}` file or a plain-text one-domain-per-line allowlist.
- `src/shadow_sniffer/engine.py` — `scan_connections()` matches each connection's `dest_host` against the catalog and flags it as a `ShadowAIFinding` unless covered by the allowlist (suffix-matched, so `openai.com` in the allowlist covers both `api.openai.com` and `chat.openai.com`); tagged **MITRE ATT&CK T1567 (Exfiltration Over Web Service)**. `summarize()` aggregates by category/service/host and total bytes sent. V1 limitation (documented): hostname-based matching only, no DNS/reverse-DNS lookups for IP-only logs.
- `src/shadow_sniffer/cli.py` — Typer CLI: `shadow-sniffer scan --input <log.json|csv> [--approved <allowlist>] [--output --aegistrace-url --aegistrace-key]` (rich tables, exits non-zero if any shadow AI usage found — usable as a CI gate) + `shadow-sniffer list-services`.
- `src/shadow_sniffer/reporter.py` — posts findings to AegisTrace's `/api/ingest/shadowsniffer-event`.
- `tests/fixtures/sample_connections.json` (8 connections: 1 normal, 1 internal, 6 AI-service hits across LLM API/Chat/Code Assistant/Image Generation) + `approved_services.json` (allowlists `api.anthropic.com`) + `clean_connections.json` (3 connections, 0 findings) + `sample_connections.csv` (CSV format variant).
- `examples/sample_connections.json` + `examples/approved_services.json` (copies of the fixtures, for `pip install`-only trying-out with no setup).
- `tests/` — 24/24 passing: catalog matching, parser (JSON/CSV/allowlist), engine (scan/summarize/subdomain-allowlist), and Typer CLI (`CliRunner`) tests.
- MIT `LICENSE`, `CITATION.cff`, `CONTRIBUTING.md`, `README.md` (quick start, connection-log field reference, AegisTrace integration, companion-projects links), `.github/workflows/ci.yml` (pytest matrix 3.10-3.12 — on disk only, same `workflow`-scope PAT issue as the other three tools, needs manual add via GitHub web UI).

**AegisTrace backend (this session):** `POST /api/ingest/shadowsniffer-event` added to `routers/ingest.py` (mirrors `/nhihunter-event`) — creates `AgentAction(agent_name="shadow-sniffer", action_type="shadow_ai_usage_detected")` entries visible in `/app/agent-security`. Same `X-AegisTrace-Key`/`INGEST_API_KEY` auth. No new frontend needed.

**Verified end-to-end (June 2026):** `shadow-sniffer scan --input examples/sample_connections.json --approved examples/approved_services.json` → 8 connections scanned, 5 shadow AI findings (OpenAI API, Claude, ChatGPT, GitHub Copilot, Midjourney — `api.anthropic.com` excluded via allowlist), 623,005 bytes sent to unapproved services, exit code 1; `clean_connections.json` → "No shadow AI usage found", exit code 0; `list-services` → all 39 catalog entries across 8 categories.

**Published to PyPI (June 2026):** `pip install shadow-sniffer` works — v0.1.0 live at https://pypi.org/project/shadow-sniffer/0.1.0/ (no name collision).

**Grassroots Expansion Pack complete:** all four tools (`mcp-sploit` → `prompt-fuzz` → `nhi-hunter` → `shadow-sniffer`) are built, tested, published to PyPI, and feeding the AegisTrace `/app/agent-security` dashboard via `/api/ingest/<tool>-event`.

**Roadmap:** demo GIFs for all four tools.

### Priority 8 — NVIDIA NIM Phases (v7.0–v9.0 built)

**v7.0 Already Built (all free on build.nvidia.com):**
- [x] Phase 1: Nemotron-70B function-calling triage agent (triage_agent.py)
- [x] Phase 2: NV-EmbedQA-E5-v5 case memory + semantic search (embeddings.py)
- [x] Phase 3: Llama Guard 3 safety classifier on chat (guardrails.py)
- [x] Phase 4: Multi-agent coordinator — Email/Endpoint/IOC/Identity/Report agents in parallel (agents/)
- [x] Phase 5: Llama-70B alert normalization for any source format (ingest_normalizer.py)

**v8.0 Built (June 2026):**
- [x] Phase 6: Hermes-3 70B swapped in as triage model — better multi-step tool calling
- [x] Phase 7: NV-RerankQA-Mistral-4B reranker in embeddings.py + case similar-case search
- [x] Phase 8: Llama 3.2 Vision 11B — screenshot analysis tab in CaseDetail + /api/vision router
- [x] Phase 9: Codestral 22B — YARA/Sigma/KQL/SPL rule generation + /api/rules router

**v9.0 Built (June 2026) — Endpoint Agent + NVIDIA Deep Integration:**
- [x] **EndpointAgent agentic loop**: Upgraded from single-shot prompt to Hermes-3 iterative tool-calling loop (max 5 iterations, Groq fallback) in agents/specialist.py
- [x] **Live EDR → Agent tool** (`get_live_processes`): New tool in agents/tools.py calls CrowdStrike RTR / SentinelOne / Carbon Black Live Response in real-time to fetch process lists during agent loop. Auto-tries all configured platforms.
- [x] **NVIDIA embedding process anomaly scoring** (`analyze_process_anomalies`): New tool in agents/tools.py scores process cmdlines against a malicious-pattern centroid using NV-EmbedQA-E5-v5 embeddings + rule-based keyword matching. Returns anomaly scores 0-100 per process.
- [x] **NV-RerankQA log batch selection**: EndpointAgent now uses `nvidia_rerank` to select the most relevant log batches for its context (was just `batches[:5]` — now semantically ranked by case description).
- [x] **Llama 3.2 Vision for screenshot evidence**: EndpointAgent checks for screenshot/image log batches and analyzes them with `nvidia_vision` before starting its investigation loop.
- [x] **Codestral auto-Sigma rule generation**: After EndpointAgent loop, if endpoint_risk is critical/high, Codestral 22B auto-generates a Sigma YAML detection rule from the suspicious process findings.
- [x] **Llama Guard 3 on EDR high-risk actions**: `isolate_endpoint`, `kill_process`, `run_command` in routers/edr.py now screen parameters through `_guard_edr_action()` (Llama Guard category S14) before executing. Blocks injection attempts in hostname/pid/command parameters.

**v9.1 Built (June 2026) — mcp-aegis v0.2.0:**
- [x] **mcp-aegis stdio transport**: `--transport stdio` mode; `run_stdio_http()` for HTTP upstream + `run_stdio_subprocess()` to spawn MCP server as child process. Claude Desktop compatible via `claude_desktop_config.json`.
- [x] **REQUIRE_APPROVAL decision**: 4th policy decision in Decision enum. Blocks call + adds to `pending_approvals` SQLite table. `mcp-aegis pending/approve/deny` CLI workflow.
- [x] **AegisTrace native integration**: `AEGISTRACE_URL` + `AEGISTRACE_INGEST_KEY` env vars. `_AegisSender` daemon thread POSTs BLOCK/REQUIRE_APPROVAL events to `/api/ingest/mcp-event`.
- [x] **`POST /api/ingest/mcp-event`** added to `routers/ingest.py`: accepts mcp-aegis payloads, creates `AgentAction(agent_name="mcp-aegis")` entries visible in `/app/agent-security`.

**Still planned:**
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
