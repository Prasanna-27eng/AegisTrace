# AegisTrace — Full Context Prompt
> Paste this entire document into a new conversation to resume exactly where we left off.
> Last updated: June 2026

---

## WHO I AM

**Name:** Prasanna Kumar Surendran  
**Role:** SOC Analyst · Blue Team L1 · Dublin, Ireland  
**Email:** prasanna80564@gmail.com  
**Phone:** +353 089 958 2880  
**LinkedIn:** https://www.linkedin.com/in/prasannakumarsurendran  
**GitHub:** https://github.com/prasanna80564 / https://github.com/Prasanna-27eng  

**Background:**
- MSc Information Systems & Computing — Dublin Business School (2024–2025)
- B.E. Electronics & Communication Engineering — PSG College of Technology, India (2021–2024)
- Technical Support & Security Intern — Lyca Mobile, Dublin (Nov 2024 – Oct 2025)
- Certifications: Microsoft SC-200 ✓, CompTIA Security+ ✓, TCM PEH ✓, TCM Help Desk ✓, AIG Shield Up ✓
- In Progress: BTL1 (55%), TryHackMe SOC Level 1 (70%), SC-300 (15%), eJPT (20%)

---

## WHAT IS AEGISTRACE

AegisTrace is a **production-grade SOC (Security Operations Centre) investigation platform** built by Prasanna Kumar as both a personal investigation tool and a public portfolio showcase. It is designed to feel like a real enterprise cybersecurity product.

**Tagline:** "When threats rise, we trace the storm."  
**Brand:** Dark ocean theme, crimson (#C0392B) accent, JetBrains Mono for code/IOCs, Inter for UI  
**Live URL:** https://aegistrace-7qvn.onrender.com  
**GitHub Repo:** https://github.com/Prasanna-27eng/AegisTrace  

---

## WHAT THE APP DOES

AegisTrace is a full SOC investigation platform with these capabilities:

1. **Case Management** — Full incident lifecycle: open → investigate → correlate → close. Evidence scoring, shift handoffs, 10-tab deep-dive case views, closure enforcement.

2. **Multi-Model AI Analysis** — Groq LLM routing: `llama-3.3-70b-versatile` for case analysis/chat, `mixtral-8x7b-32768` for email phishing classification, `gemma2-9b-it` for fast IOC extraction, `llama-3.1-8b-instant` for quick tasks. Each model has a purpose-built SOC system prompt.

3. **VirusTotal v3 Integration** — Single, bulk IOC lookup with persistent history and case correlation. All results auto-saved to VTHistory table.

4. **Email Forensics** — Header parsing, SPF/DKIM/DMARC analysis, routing hop extraction, phishing verdict with confidence scoring, MITRE mapping.

5. **IOC Correlation Engine** — Cross-case correlation. When the same IOC appears in multiple cases, a campaign alert fires. IOC table tracks first_seen, last_seen, case_count.

6. **Malware Tools** — Base64 encode/decode, URL encode/decode, hash generator (MD5/SHA1/SHA256/SHA512), defang/refang, YARA rule generator.

7. **Threat Hunting** — `/app/hunt` — IOC frequency table, MITRE ATT&CK heatmap with tactic colours, campaign detection (IOC in 3+ cases), cross-case search.

8. **Terminal Import** — Paste raw tool output (nmap, whois, tcpdump, etc.), AI parses it into structured findings, IOCs, MITRE techniques.

9. **DORA Compliance Reports** — Article 19 Major ICT Incident Report PDF mapping the 5 DORA pillars to case data. Targeted at Irish financial services firms.

10. **Webhook Engine** — HTTP POST webhooks fire on case events (case_created, case_closed, critical_case, malicious_ioc, status_changed). Slack-compatible with HMAC signing.

11. **SIEM Alert Import** — `POST /api/cases/import-alert` accepts Microsoft Sentinel, Splunk, and generic JSON alert payloads. Auto-creates cases from SIEM alerts.

12. **Live Audit Log** — Real-time audit trail of every action in the app. Polling every 4 seconds. Categories: auth, case, AI, evidence, intel, import, admin. Export to CSV. Activity chart (7-day). Stats dashboard.

13. **Public Case Library** — Cases can be published publicly. Read-only, polished, watermarked with AegisTrace branding. PDF download.

14. **Portfolio Page** — `/portfolio` — Prasanna's full cybersecurity portfolio with live DB stats, certifications, skills, projects, featured case rundowns.

15. **Landing Page** — AXIS-style tunnel animation (nested boxes converging to vanishing point with cursor parallax), live AI demo (anyone can paste an IOC and get a real threat assessment), stats, features.

16. **Report Generation** — AI-enhanced PDF (uses `llama-3.3-70b` to write Executive Summary, Technical Analysis, Threat Actor Profile, Impact Assessment, Timeline). Also DOCX and DORA PDF.

17. **Admin Panel** — 4 tabs: Users (full CRUD, role management), Webhooks (create/test/manage), Audit Log (live), System Health (API key status, config).

---

## TECH STACK

**Backend:**
- FastAPI + SQLModel + SQLite (persisted at /var/data/aegistrace.db on Render)
- Uvicorn ASGI server
- Groq Python SDK for AI
- httpx for async HTTP (VirusTotal)
- ReportLab for PDF generation
- python-docx for Word generation

**Frontend:**
- React 18 (Create React App)
- Tailwind CSS
- Lucide React icons
- React Router v6
- Axios
- Zustand (state management)
- JetBrains Mono + Inter fonts

**Deployment:**
- Single Dockerfile (builds React → copies to FastAPI /static → serves everything)
- Render.com (free tier, Frankfurt region)
- 1GB persistent disk at /var/data
- Auto-deploy on push to main branch

---

## CREDENTIALS & API KEYS

**Admin login:**
- Email: prasanna80564@gmail.com
- Password: aegis2025 (set via ADMIN_PIN env var on Render)

**API Keys (set in Render dashboard — NOT in git):**
- GROQ_API_KEY: [set in Render dashboard — never commit to git]
- VIRUSTOTAL_API_KEY: [set in Render dashboard — never commit to git]
- ADMIN_PIN: aegis2025
- PUBLIC_URL: https://aegistrace-7qvn.onrender.com

**IMPORTANT — AI not working?**
If AI features return errors on Render, the GROQ_API_KEY is not set in the Render dashboard. Go to:
dashboard.render.com → aegistrace service → Environment → set GROQ_API_KEY manually.

---

## PROJECT STRUCTURE

```
aegistrace/
├── backend/
│   ├── main.py              ← FastAPI app, CORS, startup, rate limiting
│   ├── models.py            ← All SQLModel DB models
│   ├── database.py          ← SQLite engine + session
│   ├── migration.py         ← Safe ALTER TABLE migrations (runs on startup)
│   ├── seed.py              ← 3 demo cases seeded on first boot
│   ├── ai_router.py         ← Multi-model Groq routing with SOC system prompts
│   └── routers/
│       ├── auth.py          ← JWT auth, user CRUD (passwords in User.hashed_password)
│       ├── cases.py         ← Case CRUD, AI gen, chat, evidence, timeline, SIEM import
│       ├── vt.py            ← VirusTotal v3 lookup, history, bulk
│       ├── email_router.py  ← Email header analysis, SPF/DKIM/DMARC
│       ├── ioc.py           ← IOC extraction, defang/refang, correlation
│       ├── malware.py       ← Base64, hash, defang, URL encode, YARA
│       ├── terminal.py      ← Tool output parsing with AI
│       ├── reports.py       ← PDF (AI-enhanced), DOCX, DORA PDF
│       ├── public.py        ← Public case endpoints (no auth)
│       ├── portfolio.py     ← Portfolio stats
│       ├── webhooks.py      ← Webhook CRUD + event firing (background threads)
│       ├── hunt.py          ← Threat hunting: IOC freq, MITRE heatmap, campaigns
│       └── audit.py         ← Live audit log, SSE stream, stats, CSV export
├── frontend/
│   ├── src/
│   │   ├── App.jsx          ← React Router setup (all routes)
│   │   ├── api/client.js    ← Axios with JWT interceptor, 401 redirect
│   │   ├── store/useStore.js← Zustand (auth, toasts, cases, search, autosave)
│   │   ├── components/
│   │   │   ├── Logo.jsx     ← SVG connected nodes logo
│   │   │   ├── Sidebar.jsx  ← Collapsible sidebar with all nav items
│   │   │   ├── Toast.jsx    ← Toast notification system
│   │   │   └── SeverityBadge.jsx
│   │   └── pages/
│   │       ├── Landing.jsx  ← AXIS tunnel animation landing page + AI demo
│   │       ├── Login.jsx    ← Login with JWT
│   │       ├── Portfolio.jsx← Prasanna's portfolio with live stats
│   │       ├── PublicGallery.jsx
│   │       ├── PublicCaseDetail.jsx
│   │       └── app/
│   │           ├── AppShell.jsx       ← Protected wrapper + mobile bottom nav
│   │           ├── Dashboard.jsx
│   │           ├── CaseList.jsx       ← With delete button
│   │           ├── ThreatHunt.jsx     ← IOC freq, MITRE heatmap, campaigns, search
│   │           ├── AuditLog.jsx       ← Live audit log (4s polling)
│   │           ├── VTLookup.jsx
│   │           ├── EmailAnalysis.jsx
│   │           ├── MalwareTools.jsx
│   │           ├── ToolsHub.jsx
│   │           ├── Admin.jsx          ← 4 tabs: Users, Webhooks, Audit, System
│   │           └── CaseDetail/
│   │               ├── index.jsx      ← 9-tab case detail with autosave
│   │               ├── OverviewTab.jsx
│   │               ├── InvestigationTab.jsx
│   │               ├── IOCsTab.jsx
│   │               ├── TerminalTab.jsx
│   │               ├── TimelineTab.jsx
│   │               ├── PlaybookTab.jsx
│   │               ├── AIAnalysisTab.jsx
│   │               ├── AIChatTab.jsx
│   │               └── ReportTab.jsx  ← PDF + DOCX + DORA buttons
├── Dockerfile               ← Multi-stage: builds React → serves from FastAPI
├── render.yaml              ← Render.com deployment config
├── .env                     ← Local dev only (gitignored)
└── .env.example
```

---

## DATABASE MODELS

```
Organisation   id, name, slug, plan, is_active
User           id, email, name, role, is_active, hashed_password, org_id
Case           id, case_number, title, severity, status, incident_type,
               affected_systems, analyst_name, customer_name, classification,
               description, commands_run, findings, recommendations,
               iocs (JSON), mitre_techniques (JSON), tools_output (JSON),
               ai_executive_summary, ai_technical_summary, ai_severity_score,
               ai_severity_reasoning, email_analysis, vt_results,
               is_public, share_token, closure_notes, shift_handoff, org_id
EvidenceArtifact  id, case_id, artifact_type, source_module, raw_input,
                  normalized_output, extracted_iocs, verdict, ai_analysis,
                  confidence, evidence_score, analyst_confirmed
VTHistory      id, ioc, ioc_type, verdict, malicious_count, total_engines,
               full_result, looked_up_at, notes
EmailAnalysisRecord  id, raw_headers, raw_body, sender_ip, sender_domain,
                     spf_result, dkim_result, dmarc_result, routing_hops,
                     extracted_iocs, ai_verdict, ai_analysis, case_id
ToolRun        id, case_id, tool_name, command, output, ai_parsed_result
TimelineEvent  id, case_id, timestamp, event_type, description, evidence_id
AuditLog       id, user_id, user_email, action, entity_type, entity_id,
               old_value, new_value, ip_address, timestamp
IOCCorrelation id, ioc, ioc_type, case_ids (JSON), case_count, first_seen, last_seen
WebhookConfig  id, name, url, events (JSON), secret, is_active,
               last_fired_at, last_status_code
```

---

## DEMO DATA

Three demo cases seeded on first boot (case numbers start with SOC-DEMO-):

**SOC-DEMO-001** — BEC Phishing Campaign (High, Closed, Public)
- Finance department CFO impersonation
- IOCs: 185.220.101.34, evil-invoice.com, hr-acme-portal.com
- Full timeline, MITRE mapping, AI analysis, DORA closure notes
- Share token: demo-bec-aegistrace-2025

**SOC-DEMO-002** — Ransomware Pre-Stage / LockBit Dropper (Critical, Closed)
- Encoded PowerShell → downloads LockBit stager from same C2 as DEMO-001
- **Campaign alert**: 185.220.101.34 appears in both DEMO-001 and DEMO-002
- Shows IOC correlation / campaign detection feature

**SOC-DEMO-003** — Suspicious Cloud Login (Medium, In Progress)
- Impossible travel alert: Dublin → Nigeria same user 2h apart
- Shows active investigation with shift handoff notes

---

## ROUTES

**Public:**
- `/` — Landing page (AXIS tunnel animation)
- `/portfolio` — Prasanna's portfolio
- `/public` — Public case gallery
- `/public/:token` — Public case detail
- `/app/login` — Login

**Protected App:**
- `/app/dashboard` — Dashboard
- `/app/cases` — Case list (with delete)
- `/app/cases/:id` — Case detail (9 tabs)
- `/app/hunt` — Threat Hunting (IOC freq, MITRE, campaigns)
- `/app/audit` — Live Audit Log
- `/app/vt-lookup` — VirusTotal (single, history, bulk)
- `/app/email` — Email Analysis (headers, full email, history)
- `/app/malware` — Malware Tools
- `/app/tools` — Tools Hub (free external integrations)
- `/app/admin` — Admin (Users, Webhooks, Audit, System)

**API:**
- `/api/cases` — Case CRUD + share + close + AI generate + chat
- `/api/cases/import-alert` — SIEM alert import (Sentinel/Splunk/generic)
- `/api/cases/correlate/all` — Cross-case IOC correlations
- `/api/vt/*` — VirusTotal lookup, history
- `/api/email/*` — Email analysis
- `/api/ioc/*` — IOC extraction, defang/refang, correlation
- `/api/malware/*` — Encoding tools, YARA, hash
- `/api/terminal/analyse` — AI tool output parsing
- `/api/reports/:id/pdf` — AI-enhanced PDF report
- `/api/reports/:id/docx` — Word document
- `/api/reports/:id/dora` — DORA Article 19 PDF
- `/api/webhooks` — Webhook CRUD + test
- `/api/hunt/*` — IOC freq, MITRE heatmap, campaigns, search, stats
- `/api/audit/*` — Audit log, live polling, stats, stream
- `/api/public/*` — Public case endpoints
- `/api/portfolio/stats` — Live stats for landing/portfolio
- `/api/public/demo-analyse` — Public AI demo (rate limited 10/min/IP)
- `/api/health` — Health check

---

## PRIORITIES STATUS (6 originally planned)

| Priority | Feature | Status |
|---|---|---|
| 1 | DORA Compliance Report | ✅ DONE — Article 19 PDF in Report tab |
| 2 | Webhooks / Automation | ✅ DONE — Full CRUD, Slack-compatible, HMAC signed |
| 3 | Organisation / Multi-tenancy | ⚠️ STUB — Model exists, org_id on User+Case, NO enforcement or UI |
| 4 | SIEM Alert Import | ✅ DONE — /api/cases/import-alert (Sentinel/Splunk/generic) |
| 5 | Threat Hunting Dashboard | ✅ DONE — /app/hunt with IOC freq, MITRE, campaigns, search |
| 6 | Mobile Experience | ⚠️ PARTIAL — Mobile bottom nav done, PWA not done |

---

## PLANNED FEATURES (NOT YET BUILT)

### Priority A — Endpoint Log Agent (NEXT MAJOR BUILD)
Architecture: Silent agent runs on remote machine → sends logs to AegisTrace → analyst investigates in AegisTrace UI.

**What to build:**
- `agent/aegistrace_agent.py` — Single Python file, zero external dependencies, runs on Windows/Linux/Mac as background service
- Collects: Windows Security Events (4624/4625/4720/4698), Linux auth.log/syslog/journalctl, nginx/apache logs, running processes, network connections
- Ships to: `POST /api/ingest/logs` with `X-AegisTrace-Key` header
- New DB models: `Endpoint` (hostname, OS, IP, last_seen, agent_version), `LogBatch` (endpoint_id, content, ai_analysis, threat_score)
- New page: `/app/endpoints` — shows all connected machines, status, last seen, threat score
- Auto-create case if threat_score > 60
- The analyst NEVER touches the endpoint — everything arrives in AegisTrace

**Install on endpoint (3 steps):**
1. Copy `aegistrace_agent.py` to machine
2. Edit URL + key at top of file
3. Run `python3 aegistrace_agent.py` (or install as service)

### Priority B — Log Investigation Page
- New page `/app/logs` — paste any raw log (Windows Event, Syslog, Apache, Firewall, CloudTrail, etc.)
- Auto-detect format (AI + regex)
- Normalize to: timestamp, source_ip, dest_ip, user, action, status
- Extract IOCs + correlate against cases
- AI threat analysis + MITRE mapping
- Push to case or auto-create case

### Priority C — Free API Integrations (add to Tools Hub + IOC lookup)
All free, add to enrich any IOC lookup:
```
Shodan InternetDB   https://internetdb.shodan.io/{ip}          (no key, completely free)
MalwareBazaar       https://mb-api.abuse.ch/api/v1/            (no key, completely free)
URLhaus             https://urlhaus-api.abuse.ch/v1/           (no key, completely free)
ThreatFox           https://threatfox-api.abuse.ch/api/v1/     (no key, completely free)
GreyNoise Community https://api.greynoise.io/v3/community/{ip} (free key, reduces false positives)
AlienVault OTX      https://otx.alienvault.com/api/v1/         (free key, rich intel)
NVD CVE API         https://services.nvd.nist.gov/rest/json/cves/2.0 (no key, CVE lookup)
Have I Been Pwned   https://haveibeenpwned.com/api/v3/         (free personal use)
IPInfo.io           https://ipinfo.io/{ip}/json                (free 50k/month, no key)
```

### Priority D — SOAR Lite
- When a critical case is created or IOC confirmed malicious → fire webhook + optionally call a user-defined script
- Sigma rule matching against incoming logs (community rules from SigmaHQ GitHub, free)
- Auto-create case from Sigma rule match

### Priority E — Organisation Layer (Full Implementation)
- Currently only a stub (org_id fields exist but unused)
- Need: Admin can create organisations, assign cases to orgs, filter by org
- Unlocks MSSP use case

### Priority F — Process Tree Analysis
- Agent sends process snapshot (ps/tasklist)
- Groq AI checks for suspicious parent-child relationships
- Word.exe → cmd.exe = alert, PowerShell → encoded command = alert
- Visual tree in case investigation tab

### Priority G — CVE Vulnerability Tracking
- Agent reports installed software + versions
- NVD API lookup (free, no key) for CVEs
- Show per-endpoint vulnerability score
- Auto-create low-severity case for critical CVEs

### Priority H — Impossible Travel Detection
- Already have the data (agent ships login events)
- Logic: same user, two different country IPs, < 4 hours apart = auto-create case

### Priority I — AI Attack Narrative
- After case closure, Groq writes a 2-3 page forensic narrative in plain English
- "At 08:12 on Tuesday, an attacker based in Germany..."
- Usable in board-level reporting

### Priority J — Sigma Rule Generator from Case
- After AI analysis, generate a Sigma detection rule from the findings
- SOC analysts can deploy this rule in their own SIEM

---

## KNOWN ISSUES / TECHNICAL DEBT

1. **Passwords stored in audit log (legacy)** — Auth was fixed to use `User.hashed_password` but fallback to AuditLog still exists during migration window. Can be removed after one full deploy cycle.

2. **Organisation layer is a stub** — org_id exists on User and Case but is never enforced in queries. All users see all cases. Fine for personal use, needs implementation for multi-tenancy.

3. **Case.timeline_events JSON field** — This was the old approach. Timeline is now exclusively in the `TimelineEvent` table. The JSON field still exists in the DB but is never written to. Can be dropped in a future migration.

4. **Public demo rate limiter is in-memory** — Resets on server restart. Fine for personal use, would need Redis for production.

5. **CORS** — Locked to aegistrace-7qvn.onrender.com + localhost:3000. If the Render URL changes, update PUBLIC_URL env var.

6. **JWT has no server-side invalidation** — Tokens are valid for 7 days even if user is deactivated. Deactivation is checked on request but existing tokens keep working until expiry.

---

## AI MODEL ROUTING (ai_router.py)

```python
MODELS = {
    "analysis":       "llama-3.3-70b-versatile",  # deep case reasoning
    "chat":           "llama-3.3-70b-versatile",  # case-scoped assistant
    "classification": "mixtral-8x7b-32768",        # phishing classification
    "extraction":     "gemma2-9b-it",              # fast IOC extraction
    "fast":           "llama-3.1-8b-instant",      # quick single tasks
    "code":           "mixtral-8x7b-32768",        # YARA / code generation
    "report":         "llama-3.3-70b-versatile",  # narrative report writing
    "demo":           "gemma2-9b-it",              # public website demo
}
```

Each model has a purpose-built SOC system prompt in `SYSTEM_PROMPTS` dict.

---

## HOW TO DEPLOY CHANGES

```bash
cd ~/Documents/Claude/Projects/aegistrace
git add .
git commit -m "feat: description of changes"
git push origin main
# Render auto-deploys on push — takes ~8-10 minutes
```

**After deploy, verify:**
- `https://aegistrace-7qvn.onrender.com/api/health` returns `{"status":"ok","groq":true,"vt":true}`
- If `"groq":false` — update GROQ_API_KEY in Render dashboard manually

---

## WHAT CROWDSTRIKE FALCON HAS VS WHAT WE CAN BUILD FREE

**Can replicate (~65% of Falcon) with free tools:**
- Endpoint log collection → Our agent
- Behavioral analysis → Groq AI on process/log data
- IOC enrichment → VT + Shodan + MalwareBazaar + URLhaus + ThreatFox + GreyNoise
- Threat intelligence → AlienVault OTX (free)
- MITRE ATT&CK mapping → Already done
- IOC correlation → Already done
- Case management → Already done
- Compliance reporting (DORA, NIS2) → DORA done, NIS2 mappable
- Vulnerability tracking → NVD API (free, no key)
- Alert automation → Webhooks + Sigma rules

**Cannot replicate (requires enterprise resources):**
- Kernel-level process interception (requires signed kernel driver)
- Real-time ML malware prevention (needs billions of file training data)
- 24/7 managed threat hunting (requires human analysts)
- Zero-day detection at scale (needs cross-customer threat intel feeds)

---

## INSTRUCTIONS FOR NEXT SESSION

When you paste this prompt into a new conversation, tell Claude:

> "I am continuing to build AegisTrace. Read the context document above carefully. The project is at [state what was last done]. I need you to [next task]. The full codebase is at ~/Documents/Claude/Projects/aegistrace on my Mac. The live app is at https://aegistrace-7qvn.onrender.com"

**Current next tasks in priority order:**
1. Build the Endpoint Agent (`agent/aegistrace_agent.py`) + ingest API + Endpoints page
2. Build the Log Investigation page (`/app/logs`)
3. Add free API integrations (Shodan, MalwareBazaar, URLhaus, ThreatFox, GreyNoise)
4. Complete the Organisation layer (full enforcement + admin UI)
5. Add Sigma rule matching against incoming logs
6. Process tree analysis with AI anomaly detection
7. CVE tracking via NVD API

---

*AegisTrace — When threats rise, we trace the storm.*  
*Built by Prasanna Kumar Surendran, Dublin, Ireland, 2025–2026*
