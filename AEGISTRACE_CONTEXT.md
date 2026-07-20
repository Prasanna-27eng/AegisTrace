# AEGISTRACE — MASTER CONTEXT FILE

**Version:** v11.1 | **Last updated:** June 2026
**Purpose:** Paste this file into Claude at the start of any session. It replaces re-reading the full codebase.

---

## INSTRUCTIONS FOR CLAUDE (READ THIS FIRST — EVERY SESSION)

**Before doing ANYTHING:** Read this file top to bottom. Then check the Future Work Backlog for what to build next.

### Mandatory rules

- **App theme — Anthropic Warm Cream (v11.1):** `--bg: #F5F0E8` · `--surface: #EDE7DC` · `--card: #E8E0D4` · `--text: #1A1612` · `--accent: #CC785C`. NEVER use `rgba(8,8,8,...)`, `rgba(90,138,159,...)`, `rgba(148,163,184,...)`, or any dark card backgrounds in app pages. For muted text use `rgba(26,22,18,0.5)`. Blue informational accent = `#2563EB`. Public website: deep navy gradient `#0A1628 → #0F3470 → #2563EB`.
- **Fonts:** Plus Jakarta Sans (display headings) + IBM Plex Sans (UI/body) + IBM Plex Mono (data/code)
- **Inline styles only** — this codebase does NOT use Tailwind CSS
- **Design tokens** in `frontend/src/styles/tokens.css` — always import first, never re-declare `:root` vars elsewhere
- **Database:** PostgreSQL on VPS (migrated v11.0). Use `TIMESTAMP` not `DATETIME`. Use `func.date_trunc` not `strftime`. All models go in `backend/models.py` — never create separate model files. No Alembic — `create_all()` handles schema. All `ALTER TABLE` must use `IF NOT EXISTS`.
- **No new packages** without explicit approval — no `@tanstack/react-query`, `recharts`, `alembic`, or others
- **JWT:** PyJWT is the standard (`import jwt`, `jwt.decode(...)`, catches `jwt.PyJWTError`). Never reintroduce `python-jose`.
- **Security:** All Groq calls automatically sanitised by `core/prompt_shield.py`. Connector tokens stored via `core/encryption.py enc.encrypt()`. All passwords minimum 8 characters. `current_user` in all routes MUST be typed as `User`, never `dict`.
- **Positioning:** "Accountability Infrastructure for the AI-agent era" (NOT "Trust Operating System" — retired)
- **Git:** `git push origin main` works in session. Never `git add -A`. Deploy to VPS: `ssh root@2.24.131.243` → `cd /opt/aegistrace && docker compose build --no-cache && docker compose down && docker compose up -d`

**When Prasanna says "start the next task":** Look at the Future Work Backlog, pick highest-priority unchecked item, confirm with him, then build it.

---

## TABLE OF CONTENTS

1. [Product Overview](#product-overview) — What is AegisTrace, positioning, vision
2. [Architecture](#architecture) — File tree, backend routers
3. [Database Models](#database-models) — All SQLModel tables
4. [Frontend](#frontend) — Pages, components, gotchas
5. [Key Features](#key-features) — 12 feature modules
6. [Deployment](#deployment) — VPS, Docker, env vars
7. [Security](#security) — All audits + fixes consolidated
8. [Future Work](#future-work) — Priorities + AI-speed frontier
9. [Companion Projects](#companion-projects) — mcp-aegis, mcp-sploit, prompt-fuzz, nhi-hunter, shadow-sniffer
10. [Changelog](#changelog) — Version history (newest first)
11. [How to Resume](#how-to-resume) — Quick start for new sessions
12. [Builder Profile](#builder-profile)

---

## PRODUCT OVERVIEW

**AegisTrace** is a free, open-source **Identity Threat Detection & Response (ITDR)** platform — the accountability layer for AI-agent deployments.

- **Live at:** https://aegistrace.uk
- **GitHub:** https://github.com/Prasanna-27eng/AegisTrace
- **Stack:** React 18 · FastAPI · PostgreSQL/SQLModel · Groq API · NVIDIA NIM · Docker · Hostinger KVM 2 VPS (Ubuntu 24.04, IP `2.24.131.243`)
- **Companion:** `mcp-aegis` at `~/Documents/Claude/Projects/aegistrace-mcp-gateway/`

**Core positioning:** "Autonomous AI has no audit trail. Until now." — AegisTrace gives every identity a risk score, every AI decision a reasoning chain, and every automated action a human approval gate.

**Three convictions:**
1. Identity is the perimeter — 83% of breaches involve stolen credentials
2. Black-box AI is unacceptable in security — every verdict must show its reasoning
3. Human control must be preserved — AI suggests, humans confirm

---

## ARCHITECTURE

```
frontend/                  React 18 SPA (react-router-dom, axios, zustand)
  src/pages/               Public pages + app pages
  src/components/          Reusable: Sidebar, CommandPalette, Logo, Toast, etc.
  src/store/               Zustand: useAuthStore, useCaseStore, useUIStore,
                           useIdentityStore, useConnectorStore + legacy useStore

backend/                   FastAPI (Python)
  main.py                  Entry point, router registration, startup, slowapi limiter
  models.py                ALL SQLModel table definitions (never split)
  database.py              PostgreSQL connection pool (pool_size=10, max_overflow=20)
  ai_router.py             Multi-model Groq routing with prompt shield
  adaptive_config.py       Runtime threshold config (thread-safe, AI-adjustable)
  adaptive_agent.py        Background agent — adjusts detection thresholds every 4h
  nvidia_client.py         NVIDIA NIM singleton (OpenAI-compatible, graceful fallback)
  qdrant_store.py          Qdrant Cloud vector store (graceful fallback)
  embeddings.py            NV-EmbedQA-E5-v5 + cosine similarity + reranker
  guardrails.py            Llama Guard 3 safety classifier
  ingest_normalizer.py     Alert format normalizer (Wazuh/osquery/Falco/Sysmon)
  geoip.py                 MaxMind GeoLite2 country lookups
  linker.py                Temporal Linker — correlated attack chain reconstruction
  routers/                 One file per feature area (see table below)
  core/
    identity_engine.py     Pluggable risk detectors
    cache.py               TTL cache
    events.py              Internal event bus
    prompt_shield.py       Prompt injection shield (v5.4) — ALL Groq calls go through this
    encryption.py          Fernet field encryption (v5.5)
    ssrf_guard.py          SSRF + DNS-rebind protection (v10.2)
    file_security.py       Magic bytes, size limits, decompression bomb checks (v10.3)
    file_store.py          ChaCha20-Poly1305 AEAD encrypted file storage (v10.3)
    file_sandbox.py        Subprocess isolation for file analysis, 30s timeout (v10.3)
    connectors/            azure_ad.py · okta.py · csv_import.py · base.py
  agents/
    triage_agent.py        Hermes-3 70B function-calling agentic loop (max 6 iter)
    specialist.py          EmailAgent, EndpointAgent, IOCAgent, IdentityAgent, ReportAgent
    coordinator.py         asyncio.gather parallel coordinator + Nemotron synthesis
    tools.py               7 tool definitions + executors
  atsp/                    ATSP Protocol library (Stage A — crypto, packet, session, handshake)

agent/                     aegistrace_agent.py (v6.1, ~3700 lines, production EDR)
Dockerfile                 Multi-stage: frontend build → FastAPI server
```

### Backend Routers

| Router | Prefix | Purpose |
|--------|--------|---------|
| auth | /api/auth | JWT login, bcrypt, logout, MFA (TOTP), lockout |
| cases | /api/cases | Case CRUD, autosave, share, status, AI generation |
| vt | /api/vt | VirusTotal v3 + history (10/min rate limit) |
| email_router | /api/email | Email forensics (SPF/DKIM/DMARC) |
| ioc | /api/ioc | IOC extraction + cross-case correlation |
| terminal_lab | /api/terminal | Terminal Lab sessions + command runner |
| reports | /api/reports | PDF/DOCX/DORA/DPDPA/Regulatory Package generation |
| public | /api/public | Public case gallery, demo-analyse |
| webhooks | /api/webhooks | Slack-compatible HMAC webhooks (SSRF-protected) |
| hunt | /api/hunt | Threat hunt: IOC correlation + DuckDB SQL console |
| audit | /api/audit | Audit log (all actions) |
| ingest | /api/ingest | Agent telemetry, HMAC-signed, command channel, stream SSE |
| enrichment | /api/enrichment | 7-source IOC enrichment (20/min rate limit) |
| edr | /api/edr | EDR integrations (CrowdStrike/SentinelOne/CarbonBlack) |
| pcap | /api/pcap | PCAP file analysis |
| feeds | /api/feeds | Live threat feeds (CISA/URLhaus/ThreatFox/MalwareBazaar) |
| identity | /api/identity | Identity Graph nodes + edges + attack-path BFS |
| provenance | /api/provenance | Provenance Ledger (hash-chained) + Trust Events |
| analytics | /api/analytics | Severity, SLA (MTTD/MTTR/MTTC), cost intelligence |
| policies | /api/policies | Access control policy engine |
| itdr | /api/itdr | ITDR: 6 detectors + alerts + analytics |
| agent_security | /api/agent-security | AI action approval queue |
| defense | /api/defense | Defense Engine: fingerprinting, honeypots, D3FEND mapping, HITL |
| semantic | /api/semantic | Similar-case search, case embedding, alert normalization |
| vision | /api/vision | Llama 3.2 Vision 11B — screenshot analysis |
| rules | /api/rules | Codestral 22B — YARA/Sigma/KQL/Splunk rule generation |
| simulation | /api/simulation | MITRE ATT&CK simulation engine (5 techniques) |
| orchestration | /api/orchestration | SOAR Playbook Engine — evaluate, execute, approve |
| graph | /api/graph | Temporal Linker — reconstruct attack chain |
| delegation | /api/delegation | Agent Delegation Tokens (OIDC-like, 11 capabilities) |
| response_tiers | /api/response-tiers | D3FEND tier approval: pending/execute/veto |
| knowledge | /api/knowledge | Case knowledge base: list, relevant, auto-extract |
| connectors | /api/connectors | Identity provider connections + approved AI services |
| nhi | /api/nhi | NHI lifecycle health + sprawl scores + trust decay |
| demo | /api/demo | Demo data seeder (idempotent) |
| health | /api/health | Platform health check (no auth) |
| memory | /api/memory | Volatility 3 memory dump analysis |

---

## DATABASE MODELS

All in `backend/models.py`. New tables auto-created by `create_db_and_tables()` on startup.

**Core:** `User`, `Case`, `IOCCorrelation`, `TimelineEvent`, `VTHistory`, `AuditLog`, `WebhookConfig`, `Endpoint`, `LogBatch`, `RawLogEvent`

**v3.0:** `TerminalSession` (+ `created_by_id` FK), `TerminalCommand`, `IdentityNode`, `IdentityEdge`, `TrustEvent`, `ProvenanceLedger` (+ `prev_hash`/`entry_hash` chain), `CaseComment`, `InvestigationTemplate`, `AgentAction`

**v4.3:** `IdentityConnector`, `ApprovedAIService`, `ShadowAIEvent`, `TokenBlocklist`, `AgentCommand`, `ITDRAlert`, `IdentityAnomaly`

**v5.3:** `DefenseEvent` — attacker_ip, attack_type, ai_confidence, ai_reasoning, ai_recommended_action, status, severity

**v5.2:** `SimulationRun` — technique_id, result, confidence, evidence, events_injected

**v7.0:** `CaseEmbedding` — case_id FK, embedding JSON, summary_text, timestamps

**v8.0:** `DetectionRule` — rule_name, mitre_technique, yara/sigma/kql/splunk_spl, status, generated_by

**v9.0:** `IdentityRiskHistory` — node_id FK, risk_score, trust_score, anomaly_count, recorded_at

**v10.5:** `MemoryDump` — agent_id, status, analysis_result JSON, malfind_hits, injections_found

**v10.6:** `AgentDelegationToken` — token_id UUID, authorized_by, capabilities[], not_before/not_after, is_revoked, signature

**v11.0:** `DefenseRecommendation`, `CaseKnowledge`, `AIUsageLog`, `AdaptiveThresholdLog`
- `Case` new fields: `response_tier`, `closed_at`, `first_event_at`, `org_id`, `playbook_state`
- `Playbook` + `PlaybookRun` — SOAR engine models

**Key field notes:**
- `ProvenanceLedger`: `approval_status` ∈ {auto|pending|approved|rejected}, `prev_hash`/`entry_hash` (SHA-256 hash chain)
- `IdentityNode`: `node_type` ∈ {user|service_account|api_key|token|device|agent|prompt}, `privilege_level` ∈ {low|medium|high|admin}
- All tables with user data scoped by `org_id: int = Field(default=1)` — 17+ tables have this column

---

## FRONTEND

### Public Pages (no auth)

| Route | File | Purpose |
|-------|------|---------|
| / | Landing.jsx | Accountability Infrastructure hero, 12-module grid, comparison table |
| /mission | Mission.jsx | Three Convictions, SOC analyst origin, 5-phase roadmap |
| /portfolio | Portfolio.jsx | Prasanna's portfolio — stats, tool cards |
| /platform | Platform.jsx | Deep dive: capability matrix, ASCII architecture, AI models |
| /tools | Tools.jsx | 5 PyPI companion tools |
| /features | Features.jsx | 12-module detail with sticky nav |
| /agent-setup | AgentSetup.jsx | Endpoint agent setup guide |
| /public | PublicGallery.jsx | Browse public cases |
| /public/:token | PublicCaseDetail.jsx | Story-format public case narrative |
| /app/login | Login.jsx | Split-screen: Iris Scanner animation + JWT auth + MFA step |

**Shared on all public routes:** `<InfiniteMenu/>` (3D rotating cylinder background via `App.jsx PublicLayout`), `<PillNav/>` (frosted-glass fixed header)

### App Pages (auth required, inside AppShell)

**Shell:** Sentinel-style topbar (blue gradient `#0A1628→#0A4DA6`) + cream sidebar (collapsible groups, Lucide icons)

| Route | Component | Purpose |
|-------|-----------|---------|
| /app/dashboard | Dashboard.jsx | KPI strip, alert stream, severity donut, approval queue, ITDR bars |
| /app/cases | CaseList.jsx | Case list, SLA badges, templates, filters |
| /app/cases/:id | CaseDetail/ | 15-tab investigation workspace |
| /app/hunt | ThreatHunt.jsx | Cross-case IOC correlation + MITRE heatmap + DuckDB SQL console |
| /app/endpoints | Endpoints.jsx | Endpoint agent console (6 tabs: Overview/Logs/Processes/Network/Alerts/Response) |
| /app/email | EmailAnalysis.jsx | Email header forensics + SPF/DKIM/DMARC |
| /app/pcap | PcapAnalysis.jsx | PCAP packet analysis |
| /app/feeds | ThreatFeeds.jsx | Live CISA/URLhaus/ThreatFox/MalwareBazaar feeds |
| /app/tools | ToolsHub.jsx | External tool links + IOC extractor + defang |
| /app/hardware/tools | HardwareTools.jsx | 18 hardware attack tool parsers (AI-powered) |
| /app/terminal-lab | TerminalLab.jsx | Named sessions, 20+ Linux commands, IOC push-to-case |
| /app/identity-graph | IdentityGraph.jsx | Force-directed canvas, click panel, risk sparkline, filter slider |
| /app/itdr | ITDRPage.jsx | 3 tabs: Detection / Alerts / Analytics; 6 detectors |
| /app/nhi-health | NHIHealth.jsx | NHI lifecycle health dashboard |
| /app/connectors | ConnectorHub.jsx | Identity provider connections + approved AI services |
| /app/analytics | Analytics.jsx | Severity/SLA/throughput/cost analytics |
| /app/policies | Policies.jsx | Access control policy engine |
| /app/agent-security | AgentSecurity.jsx | AI action approval queue + Delegation Tokens |
| /app/audit | AuditLog.jsx | Full platform audit trail |
| /app/admin | Admin.jsx | User management, MFA, webhooks, EDR integrations |
| /app/defense-console | DefenseConsole.jsx | Defense Engine — live attack feed, HITL approve/block/escalate |
| /app/control-plane | ControlPlane.jsx | Live: identity trust scores, agent actions, policy violations, heartbeats |
| /app/simulation | SimulationHub.jsx | MITRE ATT&CK simulation engine (5 techniques) |
| /app/playbooks | Playbooks.jsx | SOAR Playbook Engine — build, test, run history |
| /app/deploy | DeploymentHub.jsx | Endpoint Agent + Falco install guide, live endpoint status |
| /app/shadow-ai | ShadowAI.jsx | Shadow AI detection dashboard |
| /app/vt-lookup | VTLookup.jsx | VirusTotal v3 with history |

### CaseDetail Tabs (15 total)

`overview` · `investigation` · `iocs` · `terminal` · `timeline` · `trust-timeline` · `playbook` · `ai-analysis` · `ai-chat` · `vision` · `rules` · `comments` · `provenance` · `report` · `edr`

Notable tabs:
- **vision** — VisionTab.jsx: screenshot upload → Llama 3.2 Vision 11B → verdict, IOCs, MITRE, actions
- **rules** — RulesTab.jsx: Codestral 22B → YARA + Sigma + KQL + Splunk SPL with copy buttons
- **provenance** — hash-chain integrity banner, Export Trust Certificate, entry hashes
- **edr** — EDR tab (inline, navigates to /app/edr)

### Reusable Components

| Component | Purpose |
|-----------|---------|
| `Sidebar.jsx` | Collapsible groups, Lucide icons, active `#2563EB` left border |
| `PillNav.jsx` | Frosted-glass header, framer-motion sliding active pill, all public pages |
| `InfiniteMenu.jsx` | 3D CSS cylinder, 12 module cards, 0.10°/frame, fixed background all public routes |
| `PageTransition.jsx` | Navy curtain on route change |
| `Toast.jsx` | Bottom-right slide-up, auto-dismiss, type-aware persistence |
| `CommandPalette.jsx` | Cmd+K keyboard palette |
| `LoadingScreen.jsx` | MetallicPaint logo + letter-stagger — first visit only (`localStorage at_visited=1`) |
| `MetallicPaint.jsx` | Canvas per-pixel metallic: fbm noise, 7-stop palette, sweeping specular band |
| `AppLogo.jsx` | `variant='icon'` (PNG) or `'seal'` (emblem) |
| `ApprovalQueue.jsx` | Swipeable card stack — drag x>100px=approve, x<-100px=dismiss |
| `SceneController.jsx` | `useSceneCamera`, `PinnedScene`, `RackFocus`, `ScrollProgressBar` |
| `Dock.jsx` | macOS-style floating dock (neutral gray, 1.45x magnification) |
| `MagicRings.jsx` | Orbital ring animation (AppShell background) |
| `BorderGlow.jsx` | Spinning conic-gradient severity border (critical=red, high=amber, normal=blue) |
| `ThreatStream.jsx` | Live threat event stream |
| `InvestigationTemplates.jsx` | 6 pre-built case scaffolds |

### Frontend Gotchas (non-obvious)

- `caseData.iocs` and `caseData.mitre_techniques` are **JSON strings** — always `JSON.parse(caseData.iocs || '[]')`
- `useParams()` returns case ID as **string** — `parseInt(id)` if comparing client-side
- Report/file downloads need `{ responseType: 'blob' }` in Axios config
- `addToast` from `useStore()` — types: `'success' | 'error' | 'warning'` (no 'info')
- Admin-only UI: gate on `user?.role === 'admin'`
- `case.is_public: bool` controls public-share visibility

**Frontend dependencies:** `react`, `react-dom`, `react-router-dom`, `axios`, `zustand`, `lucide-react`, `react-scripts`, `framer-motion`, `gsap`, `three`, `@studio-freight/lenis`

---

## KEY FEATURES

1. **Case Management** — 15-tab lifecycle, MITRE ATT&CK mapping, SLA breach detection (Critical=4h, High=8h, Medium=48h, Low=168h), 6 investigation templates, report completeness preview, PDF/DOCX/DORA/DPDPA export

2. **ITDR — Identity Threat Detection & Response** — 6 real-time detectors: credential stuffing (multi-window 10min/1h/24h), impossible travel (MaxMind GeoLite2 offline), new device login, privilege escalation, token theft, shadow AI usage. ITDR analytics page with 3 tabs.

3. **Identity Graph + Risk Engine** — Force-directed HTML Canvas (no D3), node types: User/Service Account/API Key/Token/Device/AI Agent/Prompt. Pluggable risk detectors. Click any node → detail overlay + 30-day risk sparkline. Risk filter slider, type filter pills.

4. **Trust Timeline + Provenance Ledger** — SHA-256 hash chain on all AI decisions. Chain integrity verification. Trust Certificate export (JSON). Delegation Tokens (11 capabilities, OIDC-like). Regulatory Evidence Package (EU AI Act/DORA/DPDPA one-click export).

5. **Explainable AI (Groq + NVIDIA NIM)** — Groq: `llama-3.3-70b-versatile` (analysis/reports), `llama-3.1-70b-versatile` (email/phishing), `llama-3.1-8b-instant` (fast IOC). NVIDIA: Hermes-3 70B (triage agent), Nemotron-70B (coordinator), NV-EmbedQA-E5-v5 (embeddings), Llama Guard 3 (safety), Codestral 22B (rule gen), Llama 3.2 Vision 11B (screenshots). All degrade gracefully to Groq if NVIDIA key absent.

6. **AI Agent Security** — Human approval queue for all AI actions. Actions above 85% confidence auto-approve. Delegation Tokens with 11 scoped capabilities. Full ProvenanceLedger audit trail. OWASP Agentic coverage page.

7. **SOAR Playbook Engine** — Visual playbook builder + automated execution: trigger → action sequence → approval gate. 5 action types (isolate, create case, webhook, page oncall, enrich IOC, generate rules). Pre-built "Critical MCP Block → Contain" seed playbook.

8. **Adaptive Detection** — Background agent runs every 4h, computes FP/FN rates, asks Nemotron for threshold adjustments within hardcoded bounds, applies at runtime. Safety: agent can ONLY adjust 3 numeric thresholds, never disable detectors or change permissions.

9. **Endpoint Agent v6.1** (~3700 lines, zero external AI deps) — Honey Token Trap, DNS/DGA detection, YARA-lite (40 rules), Auto-Block Engine (iptables/pfctl/netsh), USB detector, Windows Registry Monitor, FIM (SHA-256 + mtime + size), Behavioural Baseline, Guardian Process, Multi-backend failover, HMAC-signed telemetry, PersistenceMonitor, VulnerabilityScanner, Falco companion (eBPF Layer 3), Memory Forensics (Volatility 3 Layer 4).

10. **7-Source IOC Enrichment** — VirusTotal v3 · Shodan · MalwareBazaar · URLhaus · ThreatFox · GreyNoise · IPInfo. All in parallel, cross-case campaign detection.

11. **Hardware Attack Tools** — 18 parsers: WiFi (Evil Twin, Deauth, Probe), RF/Radio (Replay, Jamming), USB/HID (Keystroke Injection, Payload Decoder), Network (Suricata, ARP, DNS, Lateral Movement), RFID/NFC, Endpoint (Sysmon, Process Tree), AI Universal Parser.

12. **DuckDB SQL Hunting Console** — Read-only SQL over live telemetry DB. Org-scoped views for `cases`, `itdr_alerts`, `audit_logs`. Keyword blocklist (DDL/DML/catalog introspection). 10s timeout, 1000-row cap. `raw_log_events`, `endpoints`, `agent_actions`, `defense_events`, `hardware_alerts` views.

---

## DEPLOYMENT

**Live URL:** https://aegistrace.uk
**Server:** Hostinger KVM 2 VPS, Ubuntu 24.04, IP `2.24.131.243`
**Startup:** `aegistrace-docker.service` systemd unit → `docker compose up -d` on boot

### Deploy Commands

```bash
# From local machine
git push origin main

# On VPS
ssh root@2.24.131.243
cd /opt/aegistrace
git pull origin main
docker compose build --no-cache
docker compose down && docker compose up -d
sleep 30 && curl http://localhost:8000/api/health
```

### Required Environment Variables (VPS `/opt/aegistrace/.env`)

```
DATABASE_URL        postgresql://aegistrace:<pw>@localhost/aegistrace_db
GROQ_API_KEY        Free at console.groq.com
VIRUSTOTAL_API_KEY  Free at virustotal.com
ADMIN_PIN           Surendran@2703
JWT_SECRET          Auto-generated on startup if unset (warn: rotates sessions)
FERNET_KEY          Base64url 32-byte key: python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
INGEST_API_KEY      Auto-generated on startup if unset
PUBLIC_URL          https://aegistrace.uk
NVIDIA_API_KEY      Free at build.nvidia.com — enables all 9 NVIDIA phases
NVIDIA_GUARDRAILS   true — enables Llama Guard safety layer
```

### Optional (EDR integrations)

```
CROWDSTRIKE_CLIENT_ID / CROWDSTRIKE_CLIENT_SECRET
SENTINELONE_BASE_URL / SENTINELONE_API_TOKEN
CARBONBLACK_ORG_KEY / CARBONBLACK_API_ID / CARBONBLACK_API_SECRET
MAXMIND_LICENSE_KEY     # Free MaxMind account — enables offline geo for impossible travel
SENDGRID_API_KEY        # ITDR email notifications
```

### Local Development

```bash
# Backend
cd backend && pip install -r requirements.txt
DATABASE_URL=sqlite:///./dev.db GROQ_API_KEY=... ADMIN_PIN=aegis2025 uvicorn main:app --reload --port 8000

# Frontend
cd frontend && npm install && npm start   # :3000, proxies /api to :8000
```

**Default admin login:** `prasanna80564@gmail.com` / `ADMIN_PIN` value

---

## SECURITY

### All Security Fixes Completed

| Version | Category | What was fixed |
|---------|----------|----------------|
| v4.3 | Auth | bcrypt passwords, sessionStorage, rate limiting, JWT server-side invalidation |
| v5.4 | IDOR + Auth | 15 issues: auth-less case endpoints, no-auth terminal sessions, no-auth case chat, SSRF webhooks, MFA token replay, login rate limit bypass, PCAP validation, public case data leaks |
| v5.5 | Hardening | PyJWT library, progressive lockout (5→60s/10→15min/20→1hr), admin 2FA enforcement, Fernet connector encryption, prompt injection shield, 10MB body limit |
| v10.1 | IDOR + CVEs | 17+ tables multi-tenancy org-scoped, JWT lib swap to PyJWT, install-token hardening, CORS/CSP tightening, 11 new `org_id` columns, portfolio endpoint auth added |
| v10.2 | SSRF + Auth | Okta SSRF via shared `ssrf_guard.py`, webhook redirect hardening, agent-command dispatch role-gating + allowlist, NVIDIA NIM prompt path now through PromptShield, provenance enum validation, frontend CVE (form-data CRLF) |
| v11.1 | Red Team | X-Forwarded-For spoofing, ingest auth bypass, plaintext TOTP secrets, missing nginx security headers (see detail below) |

### Security Audit v11.1 — Red Team Findings

**(a) X-Forwarded-For IP spoofing (`auth.py`):**
`_get_real_ip()` used `XFF.split(",")[0]` — attacker-controlled, trivially bypasses rate limits and lockout. Fixed: use `X-Real-IP` (nginx `$remote_addr`). Falls back to `XFF.split(",")[-1].strip()` (rightmost, network-set) if absent.

**(b) INGEST_API_KEY auth bypass (`routers/ingest.py`):**
`except HTTPException as e: if e.status_code == 503: pass` silently removed auth when key unset. Fixed: hard-fail 503 if key not configured; always enforce `X-Agent-Token` + HMAC comparison.

**(c) Plaintext TOTP secrets (`routers/auth.py`):**
`User.mfa_secret` stored plaintext. Fixed: `mfa_setup()` calls `_enc.encrypt()`, all reads call `_enc.decrypt()`. Existing `FieldEncryption.decrypt()` has legacy-plaintext fallback — zero-downtime upgrade.

**(d) Missing nginx security headers (VPS `/etc/nginx/sites-enabled/aegistrace`):**
Added: `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`, full `Content-Security-Policy`.

### Security Audit v10.2 — Notable Fixes

- **`backend/core/ssrf_guard.py`** (new shared module): `validate_external_host()` + `resolve_and_check()` (DNS-rebind recheck at send time). Used by Okta connector, webhooks.
- **`POST /agent/command/dispatch`**: Added `_VALID_AGENT_COMMANDS` allowlist (17 commands) + `role not in ("admin","analyst") → 403`.
- **NVIDIA NIM prompt path**: `triage_agent.py`, `specialist.py`, `coordinator.py` all now sanitise user-derived fields through `PromptShield` + append `AI_HARDENING_SUFFIX` to system prompts.
- **Provenance enums**: `approval_status`, `actor_type`, `trust_level` now validated against allowlists (400 on unknown value).

### SOC Mitigation Plan — Deferred Items

1. **`Endpoint.org_id` (HIGH)** — `Endpoint` model has no `org_id`. Admin/analyst in org B can target org A's endpoints by ID. Role-gating closes the "any viewer" hole; cross-org gap needs `org_id` column + agent-enrollment flow update.
2. **Default-secret hardening (HIGH)** — `JWT_SECRET`/`ADMIN_PIN`/`FERNET_KEY` fall back to hardcoded defaults when unset. Fix: hard-fail at startup if `ENV=production` and vars unset. Note: `FERNET_KEY` rotation requires a re-encryption migration for existing connector tokens.
3. **Dockerfile non-root user (MEDIUM)** — Containers run as root. Needs `USER` directive + `chown` on VPS volume data during maintenance window.
4. **starlette CVE PYSEC-2026-161 (MEDIUM)** — Host-header path mismatch can evade path-based middleware. Fix: bump `fastapi>=0.133.0` + `starlette>=1.0.1`. Needs regression testing (no test suite currently exists).
5. **CRA → Vite migration (LOW/long-term)** — 41 `npm audit` findings in CRA build toolchain (dev-only). Clearing them requires migrating to Vite.
6. **AWS IAM connector SSRF (LOW/forward-looking)** — When `aws_iam.py` connector is built, use `ssrf_guard.py` from day one.

---

## FUTURE WORK

### IMMEDIATE — AI-Speed Threat Frontier (Priority 0.5)

**The problem:** AegisTrace is built for human-speed security in a world about to be attacked at machine speed. ApprovalQueue swipe cards and 30-second telemetry cycles assume AI agents act slowly enough for humans to intervene. **The strategic pivot:** "AI immune system for AI infrastructure" — defensive AI outpaces attacker AI, humans review the scoreboard.

#### 1. RAG / Qdrant Poisoning Protection ← BUILD FIRST (live vulnerability)
Any case submitted today can poison future investigations. An attacker crafts `description`/`findings` text → embedding stored in Qdrant → future triage retrieves attacker-controlled "similar cases."
- **Fix:** (a) Sanitise every `search_similar()` result through `prompt_shield.py` before injecting into triage context. (b) Store SHA-256 hash of source text alongside each embedding; detect outlier embeddings at retrieval.
- **Files:** `backend/qdrant_store.py`, `backend/embeddings.py`
- **Effort:** 1–2 weeks

#### 2. DefenseAgent — Autonomous Sub-Second Response (HOTL model)
Convert from HITL to HOTL. On-device agent acts on 10 pre-approved rules without backend round-trip:
- `honey_token_accessed` → isolate + SIGKILL
- `YARA_match(reverse_shell)` → SIGKILL + iptables block outbound
- `DNS_DGA_score > 92` → iptables DROP + async log
- `FIM_change(critical_binary)` → snapshot + CRITICAL alert

`AUTO_RESPOND = True` flag in agent. Actions write ProvenanceLedger **asynchronously**. Human reviews in Defense Console with "undo" capability.
- **Files:** `agent/aegistrace_agent.py`, `backend/routers/defense.py`
- **Effort:** 2 weeks (reuses YARA-lite, FIM, honey token, auto-block infrastructure)

#### 3. Model Attestation (high sales value, low effort)
Detect model substitution attacks. Build per-model baseline fingerprint (perplexity, token-length distribution). Every AI call optionally checks response against baseline — divergence > 2σ → `ModelSubstitutionAlert`. Sign inference metadata (model version + timestamp) into ProvenanceLedger entries.
- **Effort:** 1–2 weeks

#### 4. Inter-Agent MCP Communication Monitor (platform path only)
Detect "slow poison" attacks: N benign agent interactions → one malicious action. Track agent trust decay (Agent A's outputs correlate with Agent B's bad actions → downgrade Agent A). Extends `mcp-aegis` with cross-session MCP call chain analysis.
- **Effort:** 4–6 weeks
- **Defer until:** Platform vs Product path decision made

#### 5. Dynamic AI Honeypots (defer until DefenseAgent done)
Background agent generates fake endpoints statistically indistinguishable from real ones. When attacker AI hits honeypot, deception AI responds with fake data + poisoned IOCs.
- **Effort:** 3–4 weeks

#### 6. Browser / LLM Runtime Visibility (2027 product line)
Browser extension for ChatGPT sidebar, Copilot, Claude Desktop — intercepts AI tool calls, monitors clipboard/file upload/cross-tab exfiltration. Separate product surface (different distribution model).
- **Defer:** Not a core platform addition for current version

### Active Sprint (Priority 0)

- [ ] **Auto-Rule Generation Trigger** — nightly job: 3+ cases with same MITRE technique in 7 days → auto-generate `DetectionRule` (pending_review). Files: `models.py` (DetectionRule exists), `backend/routers/rules.py` (add pending/approve/reject endpoints), scheduler.
- [ ] **Adaptive Thresholds Dashboard** — `/app/adaptive` page showing `AdaptiveThresholdLog`: threshold time-series, FP/FN trending, manual lock/override. (Priority 3.5 carry-over)
- [ ] **SQL Console saved queries + export** — `SavedHuntQuery` model, CSV/JSON export from ThreatHunt SQL Console.

### Backlog (Priorities 1–8)

**Platform independence:**
- [ ] Ollama local AI — `backend/core/ollama_client.py`, fallback chain: Ollama → Groq → NVIDIA NIM. Enables air-gap claim.
- [ ] Agent Verified Boot Chain — agent hashes own binary on startup, refuses if tampered, fires CRITICAL ITDRAlert.
- [ ] Native Python Embedding Engine — TF-IDF + cosine replacing NV-EmbedQA. Air-gapped semantic search.

**Identity & ITDR:**
- [ ] SCIM endpoint `/api/scim/v2` — enterprise push-based identity sync
- [ ] Least Agency enforcement — per-agent scope definition, auto-reject out-of-scope
- [ ] `Endpoint.org_id` migration — see SOC Mitigation Plan item 1 (HIGH priority security item)
- [ ] Device node detail panel in Identity Graph

**Compliance:**
- [ ] DPDPA Compliance Report (India market accelerator — last remaining v4.3 item)
- [ ] RBI Cybersecurity Framework mapping

**AI (NVIDIA):**
- [ ] Phase 10: NVIDIA Morpheus — GPU DGA detection, log anomaly scoring, network flow analysis (requires GPU + Kafka, post free-tier)

**Deferred / out of scope for now:** PIPROXY, NeMo fine-tuning, mcp-verify static analysis CLI, SBC Edge Agent, NVIDIA RAPIDS cuGraph.

---

## COMPANION PROJECTS

All four are published to PyPI and feed AegisTrace's `/app/agent-security` dashboard via `/api/ingest/<tool>-event`.

### mcp-aegis (v0.2.1)
**Repo:** `~/Documents/Claude/Projects/aegistrace-mcp-gateway/` · GitHub: `Prasanna-27eng/mcp-aegis`
**Install:** `pip install mcp-aegis`
**What:** MCP security gateway between any AI agent and any MCP server. Blocks dangerous tool calls, logs to SQLite, 7-rule default TOML policy, stdio transport (Claude Desktop compatible).

Policy decisions: `BLOCK` (shell execution, credential reads) · `LOG_ONLY` (home dir crawl, network requests, database writes) · `REQUIRE_APPROVAL` (configurable) · `ALLOW`

Key CLI: `mcp-aegis serve --upstream http://localhost:3000` · `mcp-aegis pending/approve/deny` · `mcp-aegis policy test bash`

v0.2.1 fixed: `tools/call` credential-read bypass (argument path-matching against `resource_patterns`), `mcp-aegis logs` crash.

### mcp-sploit (v0.2.0)
**Repo:** `~/Documents/Claude/Projects/mcp-sploit/` · **Install:** `pip install mcp-sploit`
**What:** Metasploit-style exploitation framework for MCP servers — purple-team validation for `mcp-aegis`. Speaks real JSON-RPC 2.0.

Modules: `exploit/mcp/file_exfiltration` (T1005) · `exploit/mcp/shell_exec` (T1059) · `exploit/mcp/prompt_injection` (ATLAS AML.T0051) · `exploit/mcp/tool_schema_abuse` (CWE-20) · `auxiliary/scanner/mcp_enum` · `auxiliary/scanner/mcp_auth_bypass` · `auxiliary/scanner/mcp_policy_probe`

### prompt-fuzz (v0.1.0)
**Repo:** `~/Documents/Claude/Projects/prompt-fuzz/` · **Install:** `pip install prompt-fuzz-cli` (PyPI name; CLI command stays `prompt-fuzz`)
**What:** Async CLI that fuzzes OpenAI-compatible endpoints with 51 built-in jailbreak/injection payloads across 10 categories. Purple-team test suite for `prompt_shield.py` (same category names). Exits non-zero if any bypass detected — usable as CI gate.

### nhi-hunter (v0.1.0)
**Repo:** `~/Documents/Claude/Projects/nhi-hunter/` · **Install:** `pip install nhi-hunter`
**What:** AWS IAM privilege-escalation graph builder. Parses `aws iam get-account-authorization-details` JSON, builds `networkx.MultiDiGraph`, finds shortest path from `--start-role` to any Admin identity via `sts:AssumeRole` + `iam:PassRole+lambda:*` (MITRE T1078.004).

### shadow-sniffer (v0.1.0)
**Repo:** `~/Documents/Claude/Projects/shadow-sniffer/` · **Install:** `pip install shadow-sniffer`
**What:** Offline Shadow AI detector. Scans connection logs (JSON or CSV) against 39-domain AI service catalog across 8 categories. Cross-references against approved-services allowlist. Complements the live endpoint agent detector. MITRE T1567.

---

## CHANGELOG

> Newest entries at the top. Historical versions are summarized.

### v11.1 (June 2026) — Current

**Anthropic Warm Cream Theme — Complete App Overhaul (57 files, 2 passes)**
- Round 1: Replaced pure-black hex values with cream CSS vars, fixed unquoted JSX CSS-variable syntax
- Round 2: Eliminated all remaining dark rgba patterns — `rgba(8,8,8,...)` card overlays, `rgba(148,163,184,...)` slate borders, `rgba(90,138,159,...)` steel-blue accents, dark text colors `#7A9DB8`/`#787878`/`#4A7EC8`. All 11 reported pages now fully cream.
- Active palette: `--bg: #F5F0E8` · `--surface: #EDE7DC` · `--card: #E8E0D4` · `--text: #1A1612` · `--accent: #CC785C`

**Security Hardening — /cso Red Team Audit (4 fixes)**
- X-Forwarded-For spoofing → `X-Real-IP` (nginx-set, cannot be forged)
- INGEST_API_KEY auth bypass (`pass` on 503) → hard-fail + always enforce token
- Plaintext TOTP secrets → Fernet encrypted via `core.encryption`
- Missing nginx security headers → X-Frame-Options, CSP, Referrer-Policy, Permissions-Policy added

**Infrastructure**
- Permanent Docker port fix: removed `aegistrace.service` (was running uvicorn outside Docker on port 8000), created `aegistrace-docker.service` (Docker Compose manages startup)
- VPS `.env` corrections: ADMIN_PIN typo fixed, PUBLIC_URL corrected to `https://aegistrace.uk`

---

### v11.0 (June 2026) — PostgreSQL + 8 New ITDR Features + Design System

- **PostgreSQL migration** — from SQLite, pool_size=10, max_overflow=20, pool_pre_ping, pool_recycle=1800
- **`aegistrace-docker.service`** systemd unit (later replaced pure-Docker approach with permanent fix in v11.1)
- **nginx** static file serving for SPA + proxy to port 8000
- **8 new ITDR features:** D3FEND Countermeasures (5 tiers), Approval Tiers (HITL gate), Case Knowledge Base (auto-extract on close), SLA Intelligence (MTTD/MTTR/MTTC), Cost Intelligence (per-operation AI cost tracking), Prompt Shield hardening, YAML Connector Config, Compliance Evidence export
- **Frontend:** DeploymentHub rewrite, LoadingScreen first-visit only, Dock redesign (neutral gray, 1.45x scale), Logo navigates to `/app/dashboard`, EDR tab inline
- **New models:** `DefenseRecommendation`, `CaseKnowledge`, `AIUsageLog`, new `Case` fields

---

### v10.x Summary (June 2026)

| Version | Key deliverable |
|---------|----------------|
| v10.7 | MetallicPaint logo, PillNav (shared public nav), InfiniteMenu 3D cylinder, DollyZoom removed |
| v10.6 | Agent Delegation Tokens (11 capabilities), Regulatory Evidence Package (EU AI Act/DORA/DPDPA) |
| v10.5 | Falco eBPF Layer 3, Volatility 3 Memory Forensics Layer 4, Attacker Path Reconstruction, Aether Seal brand overhaul |
| v10.4 | ATSP Stage A — formally verifiable secure telemetry protocol (ProVerif model, 17 unit tests) |
| v10.3 | SHA-256 hash chain on ProvenanceLedger, AFSL file security (ChaCha20-Poly1305, magic bytes, sandbox) |
| v10.2 | Security audit: Okta SSRF, agent-command auth, NVIDIA prompt injection path, provenance enums |
| v10.1 | Security audit: 17+ tables org-scoped (multi-tenancy IDOR), PyJWT migration, install-token hardening |
| v10.0 | Temporal Linker (auto attack chain reconstruction), SOAR Playbook Engine, Adaptive Thresholds Agent, DuckDB SQL Console |

---

### Earlier Versions Summary (June 2026)

| Version | Key deliverable |
|---------|----------------|
| v9.x | EndpointAgent agentic loop, live EDR tool, NVIDIA embedding anomaly scoring, Llama Guard on EDR actions |
| v8.0 | Vision tab (Llama 3.2 Vision 11B screenshots), Rules tab (Codestral 22B YARA/Sigma/KQL/SPL) |
| v7.0 | NVIDIA NIM 5-phase integration: Nemotron-70B triage, NV-EmbedQA embeddings, Llama Guard, multi-agent coordinator, alert normalization |
| v6.2 | mcp-aegis v0.2.1 (tools/call credential-read fix), MaxMind GeoLite2 offline geo |
| v6.1 | PersistenceMonitor, YARA-lite expanded to 40 rules, DNS tunnelling volume detection, HMAC-signed telemetry, ingest signature verification |
| v6.0 | VulnerabilityScanner (10 check categories), SSE real-time streaming, ConfirmModal, Skeleton loading |
| v5.6 | journalctl realtime follower, comprehensive Linux log collection, 6-tab Endpoints EDR console, ITDR alert dedup |
| v5.5 | Connector token Fernet encryption, progressive lockout, per-user Groq rate limiting, admin 2FA enforcement, INGEST_API_KEY auto-generate |
| v5.4 | Deep security audit (15 issues), Prompt Injection Shield (`core/prompt_shield.py`), security headers |
| v5.3 | AI Defense Engine, DefenseEvent model, Groq triage, HITL console, honeypot endpoints |
| v5.2 | MITRE ATT&CK Simulation Engine (5 real techniques), SimulationHub |
| v5.1 | ITDR 3-tab analytics, 2FA/TOTP, DB file permissions, UA fingerprinting |
| v5.0 | Endpoint Agent v5.0: Honey Token Trap, DNS/DGA, Auto-Block, USB detector, YARA-lite, Guardian Process, multi-backend failover |
| v4.3 | bcrypt, rate limiting, JWT invalidation, Connectors (Azure/Okta/CSV), NHI Health, ITDR hardening, store split, code splitting |

---

## IN PROGRESS — five repo-sourced improvements (started 2026-07-20)

Full plan saved at `/Users/prasannakumar/.claude/plans/validated-giggling-gadget.md` on the machine this was authored on — read that file for full design detail (SVG risk-ring replication, fcose layout config, exact field mappings, etc). This section is the resumable summary if that plan file isn't available.

**Source:** user asked for GitHub repos useful for AegisTrace, picked 5 concrete adoptions to implement: `semgrep/semgrep`, `auth0/auth0-customer-detections`, `@tanstack/react-table` (react-virtual explicitly dropped — data scale too small to justify it), `cytoscape.js` + `cytoscape-fcose`, and a `GITHUB_LANDSCAPE_REPORT.md` refresh for `beenuar/AiSOC`.

**Execution order:** Semgrep CI → doc update → TanStack Table (CaseList/AuditLog) → auth0 detections import + new DetectionLibrary page → IdentityGraph→Cytoscape rewrite. Sequential in main worktree (not parallel agents) since two steps touch `frontend/package.json`.

### Status
- [x] **Semgrep CI** — `.github/workflows/semgrep.yml` + `.semgrepignore` added (non-blocking first rollout, `p/security-audit` + `p/owasp-top-ten`). Ran locally once via a scratch venv: **18 findings (7 ERROR / 11 WARNING)** — 6 ERROR are `sqlalchemy.text()` usage in `backend/migration.py` (likely false-positive, fixed DDL strings not user input), 1 is a Dockerfile missing-USER hardening note. No secrets, nothing urgent. Real triage is an explicit follow-up, not done yet.
- [x] **`GITHUB_LANDSCAPE_REPORT.md`** — `beenuar/AiSOC` entry updated to 1.6k★/v7.6.0 with new features (78 connectors, investigation ledger, Detection-as-Code CI, MCP server, benchmark scoreboard). Gaps-vs-AegisTrace conclusion unchanged.
- [ ] **TanStack Table** (CaseList.jsx + AuditLog.jsx) — package installed (`@tanstack/react-table`). Component rewrites **not yet done** as of this checkpoint. Key design constraint discovered while reading the actual files: both pages are card-list layouts (`<div className="at-card">`), not literal `<table>` grids, and CaseList's sort is a global dropdown (`newest`/`severity` only — backend doesn't support generic per-column sort) — so the correct integration is TanStack Table in **headless mode** (row/column model only, `getRowModel().rows` mapped into the existing card JSX via `flexRender`), NOT literal `<table>/<tr>/<td>` markup. CaseList keeps `manualSorting: true` (server stays authoritative, existing dropdown unchanged); AuditLog gets a genuinely new client-side `getSortedRowModel()` (no sort control exists there today). Preserve exactly: CaseList's 4 stopPropagation action buttons + whole-row nav-on-click + SeverityBadge/StatusBadge/`at-card` styling; AuditLog's `isNew` per-row highlight + category-colored left border + existing (bug-compatible) client-side category re-filter.
- [x] **auth0-customer-detections import + DetectionLibrary page** — done. Vendored 33 real Sigma rules to `backend/data/detections/auth0/` (+ LICENSE + NOTICE.md, Apache 2.0). Added `severity` column to `DetectionRule` + migration. `backend/scripts/import_detections.py` tested end-to-end against a scratch SQLite DB (Python 3.11 venv — Python 3.13 can't build this repo's pinned `pydantic-core`/`psycopg2-binary`, use 3.11 for any future local backend testing): idempotent, imports 33/updates 0 on first run, imports 0/updates 33 on re-run, no duplicates. `Organisation` table is an empty multi-tenancy stub in practice (never seeded anywhere) — script falls back to `org_id=1` when it finds no rows there, matching the convention used everywhere else in this codebase. Exposed `severity` field on `GET /api/rules/pending` + `GET /api/rules/pending/{id}` (backend/routers/rules.py) which previously omitted it. New page `frontend/src/pages/app/DetectionLibrary.jsx` (nav entry in AppShell.jsx under the Detection group, route `/app/detections` in App.jsx) — lists rules with status-filter chips, sort control, expand-per-row to view full Sigma body, approve/reject wired to the existing endpoints. `npm run build` clean. Apache 2.0 license confirmed (vendoring OK, needs LICENSE copy + attribution). Vendor to `backend/data/detections/auth0/*.yml`. Add nullable `severity` column to `DetectionRule` (`backend/models.py:841-857`) + additive migration in `backend/migration.py`. Standalone `backend/scripts/import_detections.py` (manual run, not a startup hook), upsert one row per `Organisation`, `status="imported"` (new value, not `"deployed"` — don't bypass the human review gate), `rule_name` prefixed `"[auth0] {title}"` for provenance+idempotency key. New page `frontend/src/pages/app/DetectionLibrary.jsx` surfaces both imported and LLM-generated rules via the **already-built but currently uncalled** `GET /api/rules/pending` + approve/reject endpoints in `backend/routers/rules.py` — nav entry in `AppShell.jsx`, route in `App.jsx`. Also: dedupe the duplicate `pyyaml` line in `backend/requirements.txt` (`==6.0.2` at line 6, stray `>=6.0.0` at line 26) while touching that file.
- [x] **IdentityGraph.jsx → Cytoscape.js** — done, and genuinely earned its "highest-risk" label: live browser testing (via gstack `/browse`, backend spun up against the scratch SQLite DB with 7 manually-created identity nodes/5 edges) caught two real bugs the build alone never would have:
  1. **Cytoscape node and edge ids share ONE namespace.** This backend's `IdentityNode`/`IdentityEdge` ids are independent auto-increment sequences both starting at 1, so passing raw ids straight through collided (`cy.add()` threw on the first edge, silently aborting before `cy.layout()` ever ran — symptom was 6/6 nodes added but 0 edges, nodes stuck in a tiny default grid position with the whole viewport zoomed ~3x to "fit" that tiny bounding box, and totally garbled overlapping labels as a result). Fixed by prefixing every element id (`cyNodeId = id => 'n'+id`, `cyEdgeId = id => 'e'+id'`) everywhere an id is read or written in `GraphCanvas`.
  2. **Two `NODE_TYPES` colors were unusable strings**: `'var(--accent)'` (user/agent) and `'var(--text-muted)'` (prompt) — CSS custom properties that resolve fine in a live DOM `style` attribute but NOT inside a detached `data:image/svg+xml` background-image (no access to page CSS), so those nodes rendered as solid black circles. A third, subtler variant: `api_key`'s color was `'rgba(26,22,18,0.7)'`, and the SVG generator's `${color}22` hex-alpha-suffix trick silently produces an invalid string when concatenated onto an `rgba()` value instead of a hex value — also black. **This exact bug existed in the original canvas code too** (canvas `ctx.fillStyle =` silently no-ops on an invalid string rather than erroring, so it was invisibly broken — likely bleeding the previous node's fillStyle — rather than visibly black). Fixed by converting all four affected `NODE_TYPES`/`riskColor()` entries to flat hex (`user`/`agent` → `#CC785C`, `api_key` → `#1A1612`, `prompt` → `#928E88`, `riskColor`'s mid-tier → `#1A1612`) — resolved the "real" intended colors from `tokens.css`, not an approximation.
  Everything else matched the plan: risk-ring replicated via per-node SVG data-URI, `fcose` layout (correctly separates disconnected nodes — verified with a deliberately unconnected node), drag/click-select/click-empty-deselect/dim-filter/pan-zoom all manually verified working in-browser, `useIdentityStore.js` left untouched as flagged dead code. **Lesson for next time on this codebase:** don't trust a clean `npm run build` alone for anything touching Cytoscape/canvas/SVG rendering — these bug classes are invisible to the type checker and only show up as actual rendered pixels. Scope is strictly internal to the `GraphCanvas` sub-component (`IdentityGraph.jsx:300-516`) — confirmed nothing else in the repo touches its internals, so the external props contract (`nodes, edges, onNodeClick, selectedId, riskFilter, typeFilter`) must stay identical and none of the other ~800 lines (modals, side panel, sidebar list, attack path viz) need to change. Packages: `cytoscape` + `cytoscape-fcose` (skip `react-cytoscapejs`, manage the instance directly via ref). The one tricky part: today's "risk ring" is an arc drawn *outside* the node border (`r+4`), not a pie-fill — replicate via a per-node generated SVG data-URI as `background-image`. Layout: `fcose` (handles disconnected node clusters natively). Dim-filter via `.dimmed` class toggle, deliberately not touching edge opacity (preserves existing dim-inconsistency, not in scope to fix). Pan/zoom is net-new (today's canvas has none) — ship as a bonus. Leave `frontend/src/store/useIdentityStore.js` untouched (orphaned/unused store, flag as dead code, don't silently delete).
- [ ] **Final verification** — full `npm run build`, manual pass through all changed pages via dev server, confirm semgrep workflow runs green (non-blocking) on the resulting commit. **Do not commit/push/deploy without explicit user go-ahead** (same discipline as the earlier brag-video work this session).

### Repo state note
As of this checkpoint there are unrelated pre-existing uncommitted changes in the working tree (modified `AEGISTRACE_CONTEXT.md` itself, several deleted docs, a few untracked scratch files) that predate this task — don't fold those into commits for this workstream, keep `git add` scoped to only the files this plan touches, same discipline used for the earlier brag-video commit.

---

## HOW TO RESUME

Start a new Claude session, paste this file, then say:
> "Read AEGISTRACE_CONTEXT.md — I want to work on [task]"

### Top Priorities for Next Session

**Security first (live vulnerability):**
1. RAG/Qdrant poisoning protection — sanitise Qdrant retrievals through `prompt_shield.py` + hash embeddings. 1–2 weeks.

**Strategic features:**
2. DefenseAgent — `AUTO_RESPOND = True` with 10 pre-approved kill rules. 2 weeks. Reuses existing YARA/FIM/honey-token/auto-block.
3. Model attestation — statistical fingerprinting to detect model substitution. 1–2 weeks.

**Backlog:**
4. Auto-Rule Generation Trigger (Priority 0 → item 4)
5. Ollama local AI integration (air-gap claim)
6. Agent Verified Boot Chain
7. DPDPA Compliance Report (last remaining v4.3 item)

### Skills Installed

- **gstack** at `~/.claude/skills/gstack` — /review, /cso, /ship, /qa, /autoplan, /office-hours and 30+ more
- **impeccable** at `.claude/skills/impeccable` — production-grade frontend design
- **PRODUCT.md** at repo root — brand/register/positioning

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
