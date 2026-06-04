# AEGISTRACE — MASTER CONTEXT FILE
**Version:** v4.2 | **Last updated:** June 2026  
**Purpose:** Give this file to Claude at the start of any new session. It replaces the need to re-read all source files.

---

## WHAT IS AEGISTRACE?

AegisTrace is a **free, open-source SOC (Security Operations Center) control plane** built for the AI-agent era. It is the only free platform that combines identity-first threat detection, explainable AI, hardware attack tool forensics, a terminal lab, and an AI agent approval queue — all on free-tier infrastructure.

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

backend/            FastAPI (Python)
  main.py           Entry point, router registration, startup
  models.py         SQLModel table definitions (all DB tables)
  database.py       SQLite connection + create_db_and_tables()
  routers/          One file per feature area (see below)
  core/             identity_engine.py (pluggable risk detectors)

agent/              aegistrace_agent.py (zero-dep Python agent)
Dockerfile          Multi-stage: frontend build → FastAPI server
render.yaml         Render free-tier deploy config (autoDeploy: true)
```

### Backend Routers (all registered in main.py)
| Router | Prefix | Purpose |
|--------|--------|---------|
| auth | /api/auth | JWT login, user management |
| cases | /api/cases | Case CRUD, autosave, share, status |
| vt | /api/vt | VirusTotal v3 + history |
| email_router | /api/email | Email forensics (SPF/DKIM/DMARC) |
| ioc | /api/ioc | IOC extraction + cross-case correlation |
| terminal_lab | /api/terminal | Terminal Lab sessions + command runner |
| reports | /api/reports | PDF/DOCX/DORA report generation |
| public | /api/public | Public case gallery, demo-analyse |
| portfolio | /api/portfolio | Stats for public portfolio page |
| webhooks | /api/webhooks | Slack-compatible HMAC webhooks |
| hunt | /api/hunt | Threat hunt: cross-case IOC correlation |
| audit | /api/audit | Audit log (all actions) |
| ingest | /api/ingest | Endpoint agent data ingestion |
| enrichment | /api/enrichment | Multi-source IOC enrichment |
| edr | /api/edr | EDR integrations (CS/SentinelOne/CB) |
| pcap | /api/pcap | PCAP file analysis |
| feeds | /api/feeds | Live threat feeds (CISA/URLhaus/etc.) |
| identity | /api/identity | Identity Graph nodes + edges |
| provenance | /api/provenance | Provenance Ledger + Trust Events |
| analytics | /api/analytics | Aggregated stats (severity, SLA, etc.) |
| comments | /api/cases/{id}/comments | Case comments CRUD |
| policies | /api/policies | Access control policy engine |
| itdr | /api/itdr | Identity Threat Detection & Response |
| agent_security | /api/agent-security | AI action approval queue |
| schedule_reports | — | Scheduled email reports (SendGrid) |
| malware | /api/malware | Base64/hash/defang utilities |
| hardware_tools | /api/hardware | Hardware attack tool log analysis |

---

## DATABASE MODELS (backend/models.py)

Core: `User`, `Case`, `IOCCorrelation`, `TimelineEvent`, `VTHistory`, `AuditLog`, `WebhookConfig`, `EndpointAgent`, `EndpointLog`

v3.0 additions: `TerminalSession`, `TerminalCommand`, `IdentityNode`, `IdentityEdge`, `TrustEvent`, `ProvenanceLedger`, `CaseComment`, `InvestigationTemplate`, `AgentAction`

Key model fields:
- `ProvenanceLedger` has: `action_type`, `model_used`, `actor`, `confidence_score`, `approval_status` (auto|pending|approved|rejected), `approved_by`, `evidence_used`, `reasoning`, `case_id`, `timestamp`
- `Case` has: `title`, `description`, `findings`, `severity`, `status`, `iocs` (JSON), `mitre_techniques` (JSON), `ai_executive_summary`, `recommendations`, `closure_notes`, `analyst_name`, `case_number`, `is_public`, `share_token`, `incident_type`
- `IdentityNode` has: `label`, `node_type` (user|service_account|api_key|token|device|agent|prompt), `risk_score`, `is_compromised`, `metadata_json`

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
| /app/itdr | ITDRPage.jsx | Identity Threat Detection (4 detectors) |
| /app/analytics | Analytics.jsx | Severity/SLA/throughput analytics |
| /app/policies | Policies.jsx | Access control policy engine |
| /app/agent-security | AgentSecurity.jsx | AI action approval queue (v4.2) |
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

## KEY FEATURES (current v4.2)

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

## WHAT'S NEXT (v4.2 → v5.0)

### v4.2 In Progress
- [ ] Shadow AI Detection — detect data sent to unauthorized AI services from endpoints
- [ ] SOAR Playbooks — automated response sequences per incident type (builder UI + engine)
- [ ] Control Plane View — live dashboard: identity trust scores, active agent actions, policy violations, endpoint heartbeats

### v5.0 Planned
- [ ] Agent Supervision Console — per-AI-agent kill switches + task scope enforcement
- [ ] Attacker Path Reconstruction — visual kill-chain across human + machine actors
- [ ] AI Memory across cases — pattern recognition from investigation history
- [ ] Crypto + Quantum Readiness — certificate inventory, post-quantum algorithm flags
- [ ] Machine Identity incidents — rogue API keys, service account abuse detection

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

## HOW TO RESUME BUILDING

Start a new Claude session and say:

> "Read AEGISTRACE_CONTEXT.md then continue from WHERE_I_LEFT_OFF. Next task: [task name from v4.2 In Progress list above]"

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
