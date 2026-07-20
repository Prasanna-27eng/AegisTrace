# AegisTrace — GitHub Landscape Analysis Report
**Date:** June 29, 2026 (beenuar/AiSOC entry refreshed July 20, 2026)  
**Purpose:** Identify open-source GitHub projects in the same space as AegisTrace (ITDR, AI-SOC, NHI Security, Shadow AI Detection) and assess how AegisTrace compares.

---

## Executive Summary

Across four adjacent categories — AI-Augmented SOC platforms, SOC automation tools, Non-Human Identity (NHI) security, and Shadow AI detection — **no single open-source GitHub project covers the same ground as AegisTrace**. The closest competitors are general-purpose AI-SOC platforms that handle alert triage, but none combine ITDR + NHI Health + Shadow AI + Identity Graph + Simulation in a single web platform. AegisTrace occupies a largely uncontested open-source niche.

---

## Search Scope

Five search vectors were used:
- `ITDR "identity threat detection response" platform open source`
- `AI SOC platform web dashboard open source 2025`
- `non-human identity security detection open source NHI`
- `shadow AI detection security tool open source 2025`
- `ITDR identity security platform fastapi react`

**6 projects were profiled in depth. 3 additional market-level tools were noted.**

---

## Category 1: AI-Augmented SOC Platforms

### 1. FunnyWolf/agentic-soc-platform
> ⭐ **912 stars** · 151 forks · MIT · Latest release: v0.3.0 (April 2026)  
> https://github.com/FunnyWolf/agentic-soc-platform

**What it does:** Production-ready agentic SOC that ingests SIEM alerts, runs LLM-powered investigation, generates structured case reports, and executes playbooks. Claims 99% noise reduction. Has a documentation site (asp.viperrtp.com). Notably integrated with Claude Code via MCP.

**Stack:** Python 93% · JavaScript 7% · Docker · LangChain/LangGraph · Dify  
**Commits:** 381 | **Releases:** 4 | **Active:** Yes

**Strengths:**
- Most production-ready open-source AI-SOC found
- Multi-SIEM unified access (ELK, Splunk via YAML config)
- Playbook automation with one-click execution
- Knowledge accumulation from closed cases
- Proper release cadence and documentation

**Gaps vs AegisTrace:**
- Zero identity security focus (no ITDR, NHI, shadow AI)
- No React web frontend — JS is minimal dashboard scaffolding only
- No simulation lab or adversarial testing
- No threat feed integration or email analysis
- Pure alert triage platform, not a security product

---

### 2. zhadyz/AI_SOC
> ⭐ **123 stars** · 31 forks · Apache 2.0  
> https://github.com/zhadyz/AI_SOC

**What it does:** Research-grade AI-augmented SOC from a California State University research paper. Combines trained IDS models, local LLM triage (Ollama + Foundation-Sec-8B), RAG over MITRE/CVE/runbooks, Wazuh integration, incident correlation, Monte Carlo attack simulation, and a D3FEND response orchestrator.

**Stack:** Python 79% · HTML 13% · Docker Compose · ChromaDB · PostgreSQL  
**Commits:** 2 (newly published research release)

**Strengths:**
- Impressive research scope: 8 cooperating microservices
- ML models trained on CICIDS2017 (99.28% accuracy, Random Forest)
- Swarm simulation: 37,575 agent runs, 18 unique attack paths found
- D3FEND countermeasure mapping with approval tiers
- Fully local-first (Ollama, no cloud LLM APIs)

**Gaps vs AegisTrace:**
- Research prototype — 2 commits, no releases, production adapters are stubs
- No identity security or ITDR focus whatsoever
- No proper web UI (HTML pages only, no React)
- ML is binary BENIGN/ATTACK only, no identity-specific detections
- Acknowledged gaps: firewall/EDR/identity adapters all stubbed

---

### 3. beenuar/AiSOC
> ⭐ **1.6k stars** · Version **7.6.0** (July 13, 2026, up from 7.4.0/May) · MIT · Self-hostable  
> https://github.com/beenuar/AiSOC

**What it does:** Mature AI-powered SOC platform with alert fusion, purple-team drills, agent-assisted triage, and MITRE ATT&CK investigation. The most feature-complete general SOC platform found, and now the fastest-moving — v7.6.0 shipped 78 new connectors (incl. QRadar, Exabeam, Securonix, Zeek/Suricata), a replayable investigation ledger, a CI-gated "Detection-as-Code" workflow, an MCP server for Claude/Cursor/Cody, and a public weekly benchmark scoreboard. v7.4.0 (prior) added a prompt-injection sanitizer on classification agents and cross-tenant RBAC isolation.

**Notable features:**
- SLA Dashboard: MTTD, MTTR, MTTC metrics
- Compliance evidence export: SOC 2, ISO 27001, NIST CSF
- Immutable paginated audit log
- Purple-team drill automation
- Global time-window selector across all views
- 78-connector integration layer (QRadar, Exabeam, Securonix, Zeek/Suricata, and more)
- Replayable investigation ledger + public weekly benchmark scoreboard

**Gaps vs AegisTrace (unchanged despite the growth above):**
- General SOC — still no ITDR, NHI health, shadow AI, identity graph
- No simulation lab
- No companion CLI tools (no equivalent to mcp-sploit, nhi-hunter, shadow-sniffer)

*Worth watching* — this is the closest thing to a "fast follower" among general SOC platforms surveyed, but its growth has been in breadth of SIEM/connector coverage, not in AegisTrace's core identity differentiators.

---

## Category 2: SOC Automation Tools (Connector/CLI Layer)

### 4. M507/AI-SOC-Agent (SamiGPT)
> Black Hat 2025 · MCP server architecture  
> https://github.com/M507/AI-SOC-Agent

**What it does:** MCP server for SOC automation. Connects to ELK, TheHive, IRIS. Automates alert triage and case management. Operates at ~$0.18/alert cost. Presented at Black Hat 2025.

**Gaps vs AegisTrace:** Connector layer only, no platform, no UI, no identity focus.

---

### 5. Aaniket09/AI-SOC-Agent
> Azure-only CLI tool  
> https://github.com/Aaniket09/AI-SOC-Agent

**What it does:** ~10-file Python CLI. NL→KQL query translation, Microsoft Sentinel hunting, VM isolation, auto-deploy detection rules.

**Gaps vs AegisTrace:** Single-cloud (Azure), CLI only, no platform, no identity focus.

---

## Category 3: Non-Human Identity (NHI) Security

Open-source NHI tooling is almost entirely absent from GitHub. The market is dominated by commercial vendors.

| Tool | Type | What it covers |
|------|------|---------------|
| **GitGuardian** | Commercial (enterprise) | Secrets detection, one-click revocation, NHI governance, graph intelligence |
| **Astrix** | Commercial | SaaS-to-SaaS OAuth grants, API key sprawl |
| **AIM** | Open-source (early-stage) | Cryptographic identity for AI agents — not a security detection platform |
| **Token Security** | Commercial | Machine identity lifecycle |

**Finding:** No open-source platform on GitHub provides NHI health monitoring, service account risk scoring, or machine identity threat detection in a web UI. AegisTrace's NHI Health module is unique in the open-source space.

---

## Category 4: Shadow AI Detection

The Shadow AI detection space is nascent. Tools found:

| Tool | Approach | Limitation |
|------|----------|-----------|
| **FlagWise** (bluewave-labs/flagwise) | Kafka-based LLM traffic capture | Network-level only, no identity correlation |
| **Bifrost** | AI gateway / proxy | Requires traffic routing through it |
| **GitHub topic: shadow-ai-detector** | Multiple small scripts | Point tools, no integrated platform |
| **OpenClaw** (Lasso Security) | Agentic AI shadow discovery | Commercial, not open-source |

**Finding:** No open-source platform combines Shadow AI detection with identity security, threat correlation, and a web dashboard. AegisTrace is alone in this space.

---

## Category 5: ITDR (Identity Threat Detection & Response)

The commercial ITDR market is large but the open-source space is nearly empty.

| Vendor | Type | Notable |
|--------|------|---------|
| Microsoft Defender for Identity | Commercial | Integrates with Entra ID, Sentinel |
| Okta Threat Insights | Commercial | Identity-layer signals |
| Delinea | Commercial | PAM + ITDR |
| Stellar Cyber | Commercial | Open XDR with ITDR module |
| **ML-powered UEBA (academic)** | Open-source research | scikit-learn + FastAPI + Streamlit — detection-only, no response |

**Finding:** No open-source ITDR platform with a full web application (FastAPI + React) exists on GitHub. AegisTrace is the only open-source project building a full-stack ITDR product.

---

## Feature Comparison Matrix

| Feature | AegisTrace | agentic-soc-platform | AI_SOC (zhadyz) | AiSOC (beenuar) | SamiGPT |
|---------|:---:|:---:|:---:|:---:|:---:|
| **Full Web UI (React)** | ✅ | ❌ | ❌ | ✅ | ❌ |
| **FastAPI Backend** | ✅ | ❌ | ✅ | ✅ | ❌ |
| **Alert Triage (LLM)** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Case Management** | ✅ | ✅ | ❌ | ✅ | ✅ |
| **ITDR Module** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **NHI Health** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Shadow AI Detection** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Identity Graph** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Threat Hunt** | ✅ | ❌ | ❌ | ❌ | ⚠️ |
| **Simulation Lab** | ✅ | ❌ | ✅ | ⚠️ | ❌ |
| **Playbooks/SOAR** | ✅ | ✅ | ❌ | ✅ | ⚠️ |
| **ML Models (IDS)** | ❌ | ❌ | ✅ | ❌ | ❌ |
| **Multi-SIEM Connectors** | ⚠️ | ✅ | ⚠️ | ✅ | ✅ |
| **MITRE ATT&CK Mapping** | ✅ | ❌ | ✅ | ✅ | ✅ |
| **Threat Feed Integration** | ✅ | ⚠️ | ❌ | ✅ | ✅ |
| **Email Analysis** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **EDR Console** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **AI Defense (LLM sec)** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Compliance Evidence** | ❌ | ❌ | ❌ | ✅ | ❌ |
| **Docker Deployment** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Active Development** | ✅ | ✅ | ⚠️ | ✅ | ⚠️ |

✅ = Present · ⚠️ = Partial/Planned · ❌ = Absent

---

## AegisTrace Positioning

### Where AegisTrace is Uniquely Differentiated

**1. Only open-source platform with ITDR as a first-class concept.**  
Every other project treats security as generic alert triage. AegisTrace is the only one asking "which identity is compromised and what is its blast radius?"

**2. NHI Health is unclaimed territory.**  
No open-source GitHub project provides service account risk scoring, API key sprawl detection, or machine identity lifecycle visibility. This feature alone has no open-source equivalent.

**3. Shadow AI detection built-in.**  
The only open-source security platform that detects unauthorized AI tool usage and correlates it with identity risk. Existing shadow AI tools are network scanners — they don't know who the identity is.

**4. Identity Graph.**  
Modeling the relationships between users, machines, accounts, and permissions is what separates an ITDR platform from a generic SOC. No competitor has this.

**5. Full React web application.**  
Among platforms with any identity security capability, AegisTrace is the only one with a purpose-built React frontend with dock navigation, dark theme, and proper UX. Most competitors are dashboard scripts or Streamlit apps.

---

### Where Competitors Have an Advantage

| Advantage | Who Has It | AegisTrace Gap |
|-----------|-----------|----------------|
| Multi-SIEM unified connectors (ELK, Splunk, Sentinel) | agentic-soc-platform | Only partial connector support |
| Trained IDS ML models (99%+ accuracy on CICIDS2017) | zhadyz/AI_SOC | No ML anomaly detection yet |
| SLA metrics & compliance evidence export | beenuar/AiSOC | No compliance reporting |
| Stars/community credibility | agentic-soc-platform (912⭐) | Early-stage, not public yet |
| Live deployed production users | SamiGPT | AegisTrace still being built |

---

## Opportunities Identified from Research

The following features from peer projects are worth evaluating for AegisTrace's roadmap:

**From agentic-soc-platform:** Knowledge accumulation — automatically extract reusable investigation patterns from closed cases. This fits AegisTrace's threat intelligence layer perfectly.

**From zhadyz/AI_SOC:** D3FEND countermeasure mapping tied to detected techniques. Structured response recommendations are more defensible than freeform LLM suggestions.

**From beenuar/AiSOC:** Compliance evidence export (SOC 2, ISO 27001, NIST CSF). For enterprise buyers, automated evidence generation is a major purchasing factor.

**From SamiGPT:** Cost-per-alert tracking. Security teams need to justify AI tooling ROI — showing "$0.18/alert vs $120/analyst-hour" is a compelling business case.

---

## Conclusion

AegisTrace has no direct open-source competitor. The 6 projects surveyed are all general-purpose SOC platforms — they automate alert triage and incident response, which is valuable, but none address the identity threat layer.

The open-source gap is clearest in three areas: ITDR, NHI security, and Shadow AI — which happen to be AegisTrace's three core differentiators. If AegisTrace ships and publishes, it would be the first open-source ITDR platform on GitHub with a production-quality React web application.

The main risk is not competition from open-source — it's timeline. Agentic-soc-platform (912 stars, v0.3.0, April 2026) and beenuar/AiSOC (v7.4.0, May 2026) are actively shipping and building communities. As those platforms mature, they may add identity features. AegisTrace's window to be first-to-market in open-source ITDR is real, but not indefinite.

---

## Projects Referenced

- [FunnyWolf/agentic-soc-platform](https://github.com/FunnyWolf/agentic-soc-platform) — ⭐ 912, Agentic SOC Platform
- [zhadyz/AI_SOC](https://github.com/zhadyz/AI_SOC) — ⭐ 123, AI-Augmented SOC (research)
- [beenuar/AiSOC](https://github.com/beenuar/AiSOC) — AI-powered SOC, v7.4.0
- [M507/AI-SOC-Agent](https://github.com/M507/AI-SOC-Agent) — SamiGPT, Black Hat 2025
- [Aaniket09/AI-SOC-Agent](https://github.com/Aaniket09/AI-SOC-Agent) — Azure CLI SOC Agent
- [github.com/topics/identity-threat-detection](https://github.com/topics/identity-threat-detection) — ITDR topic landscape
- [github.com/topics/shadow-ai-detector](https://github.com/topics/shadow-ai-detector) — Shadow AI topic landscape
- [GitGuardian NHI Report Q3 2025](https://blog.gitguardian.com/q3-2025-nhi-security-gets-more-real/) — NHI market context

---

*Report generated by AegisTrace project analysis · June 29, 2026*
