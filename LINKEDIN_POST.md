# AegisTrace — LinkedIn Post

---

🔐 I built a production-grade SOC investigation platform from scratch — and it's fully free to use.

**AegisTrace** is a complete Security Operations Centre tool that handles the full incident lifecycle — from the first alert to the signed-off report.

Here's what it does:

**🕵️ Investigation**
— 10-tab case workspace: IOCs, timeline, playbook, evidence, AI analysis, AI chat, terminal import, and report generation
— Playbook progress persists across sessions (milestone tracking, closure checklist)
— Full case lifecycle: open → investigate → correlate → close

**🤖 Multi-model AI engine (Groq)**
— llama-3.3-70b for deep case analysis and DORA reports
— mixtral-8x7b for phishing email classification
— gemma2-9b for fast IOC extraction from raw logs

**📡 Endpoint Agent**
— Silent Python agent for Windows, Linux, and Mac
— Collects auth logs, process snapshots, network connections
— Ships to AegisTrace every 5 minutes and auto-creates a case if threat score exceeds threshold

**🔍 7-source IOC enrichment (all free)**
— VirusTotal v3, Shodan InternetDB, MalwareBazaar, URLhaus, ThreatFox, GreyNoise Community, IPInfo
— All queried in parallel. Every result saved to history and correlated across cases.

**📧 Email forensics**
— Full header parsing, SPF/DKIM/DMARC validation, routing hop extraction
— AI phishing verdict with confidence score and MITRE ATT&CK mapping

**🗺️ MITRE ATT&CK correlation**
— Techniques extracted automatically from every case, log batch, and email analysis
— Campaign detection when the same IOC appears across 3+ cases

**📋 Compliance reporting**
— DORA Article 19 Major ICT Incident Report (one-click PDF)
— Full case report as PDF or editable DOCX
— Built for EU financial services firms

**🔔 Webhook alerting**
— Fires on: new critical case, malicious IOC confirmed, case status change, campaign detected
— Slack-compatible. HMAC-SHA256 signed.

**🔒 Security**
— Auth-protected report downloads
— Login brute-force protection (10 attempts/min)
— Security headers (X-Frame-Options, X-Content-Type-Options, CSP)
— HMAC-signed agent ingest key

**Stack:** React · FastAPI · SQLModel · Groq · VirusTotal · Docker · Render

🌐 Live: https://aegistrace-7qvn.onrender.com
🐙 GitHub: https://github.com/Prasanna-27eng/AegisTrace
📋 Agent setup guide: https://aegistrace-7qvn.onrender.com/agent-setup

Built as a portfolio project to demonstrate real SOC tooling — not tutorials, not demos. The same platform I use to practice blue team skills.

Happy to connect with anyone working in cybersecurity, SOC, or blue team. 👋

#Cybersecurity #SOC #BlueTeam #IncidentResponse #Python #FastAPI #React #MITRE #ThreatIntelligence #OpenSource #Portfolio #IrishTech #Dublin

---
*Post this on LinkedIn from your profile page. Attach a screenshot of the landing page or case detail view for maximum engagement.*
