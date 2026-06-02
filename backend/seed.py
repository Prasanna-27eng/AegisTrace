import json
from datetime import datetime, timezone
from sqlmodel import Session, select
from models import Case, TimelineEvent, IOCCorrelation, AuditLog


DEMO_IOCS = json.dumps([
    {"ioc": "185.220.101.34", "type": "ip", "verdict": "malicious", "confidence": 95},
    {"ioc": "evil-invoice.com", "type": "domain", "verdict": "malicious", "confidence": 92},
    {"ioc": "hr-acme-portal.com", "type": "domain", "verdict": "malicious", "confidence": 88},
    {"ioc": "4a7f2b3cd91e8f05a6c2d3b4e5f67890abcd1234ef5678901234567890abcdef", "type": "sha256", "verdict": "malicious", "confidence": 97},
    {"ioc": "secure-login-acme.ru", "type": "domain", "verdict": "malicious", "confidence": 90},
    {"ioc": "94.23.148.194", "type": "ip", "verdict": "suspicious", "confidence": 70},
    {"ioc": "http://evil-invoice.com/payload.exe", "type": "url", "verdict": "malicious", "confidence": 96},
    {"ioc": "cfo-acmecorp@secure-login-acme.ru", "type": "email", "verdict": "malicious", "confidence": 98},
])

DEMO_TIMELINE = json.dumps([
    {
        "id": 1,
        "timestamp": "2025-03-14T08:12:00Z",
        "event_type": "detection",
        "description": "Finance team member received suspicious email appearing to be from CFO requesting urgent wire transfer approval."
    },
    {
        "id": 2,
        "timestamp": "2025-03-14T08:45:00Z",
        "event_type": "escalation",
        "description": "IT helpdesk alerted after second employee reported identical email. Ticket escalated to SOC."
    },
    {
        "id": 3,
        "timestamp": "2025-03-14T09:15:00Z",
        "event_type": "action",
        "description": "SOC analyst began triage. Pulled email headers from Exchange Online. Sender IP 185.220.101.34 identified."
    },
    {
        "id": 4,
        "timestamp": "2025-03-14T09:32:00Z",
        "event_type": "action",
        "description": "VirusTotal lookup on 185.220.101.34 — 34/93 engines flagged malicious. Confirmed Tor exit node."
    },
    {
        "id": 5,
        "timestamp": "2025-03-14T09:48:00Z",
        "event_type": "action",
        "description": "Domain evil-invoice.com registered 14 days prior. WHOIS shows privacy-protected registrar. Lookalike of acme-corp.com."
    },
    {
        "id": 6,
        "timestamp": "2025-03-14T10:05:00Z",
        "event_type": "action",
        "description": "SPF FAIL, DKIM FAIL, DMARC FAIL on all three received emails. Authentication chain completely broken."
    },
    {
        "id": 7,
        "timestamp": "2025-03-14T10:22:00Z",
        "event_type": "action",
        "description": "Attached PDF analysed. Contains embedded URL redirecting to hr-acme-portal.com credential harvesting page."
    },
    {
        "id": 8,
        "timestamp": "2025-03-14T11:00:00Z",
        "event_type": "action",
        "description": "All three malicious domains blocked in Defender for Endpoint and Exchange mail flow rules. Emails quarantined."
    },
    {
        "id": 9,
        "timestamp": "2025-03-14T11:30:00Z",
        "event_type": "action",
        "description": "Confirmed no successful wire transfers were initiated. Finance team briefed. Phishing awareness reminder sent company-wide."
    },
    {
        "id": 10,
        "timestamp": "2025-03-14T14:00:00Z",
        "event_type": "closure",
        "description": "Case closed. Full incident report generated. Post-incident review scheduled for 2025-03-21."
    }
])

DEMO_MITRE = json.dumps([
    {"id": "T1566.002", "name": "Spearphishing Link", "tactic": "Initial Access"},
    {"id": "T1566.001", "name": "Spearphishing Attachment", "tactic": "Initial Access"},
    {"id": "T1078", "name": "Valid Accounts", "tactic": "Defense Evasion"},
    {"id": "T1534", "name": "Internal Spearphishing", "tactic": "Lateral Movement"},
    {"id": "T1656", "name": "Impersonation", "tactic": "Defense Evasion"},
    {"id": "T1598.003", "name": "Spearphishing Link (Reconnaissance)", "tactic": "Reconnaissance"},
])

DEMO_CLOSURE = json.dumps({
    "final_findings": "BEC phishing campaign targeting Finance department using CFO impersonation. Threat actor registered lookalike domain 14 days prior to attack. Three employees targeted; no successful wire transfers. All authentication checks (SPF/DKIM/DMARC) failed on malicious emails.",
    "remediation_steps": "1. Blocked all identified malicious domains and IPs at email gateway and endpoint. 2. Quarantined three phishing emails from Exchange Online. 3. Reset credentials of targeted employees as precaution. 4. Implemented DMARC enforcement policy. 5. Added lookalike domain monitoring rule.",
    "lessons_learned": "1. DMARC was in monitor mode only - needs enforcement. 2. Finance team requires targeted BEC awareness training. 3. Wire transfer approval process should require phone verification for amounts >€10,000. 4. Domain registration monitoring should be automated.",
    "evidence_complete": True,
    "closed_by": "Prasanna Kumar",
    "closed_at": "2025-03-14T14:00:00Z"
})

DEMO_COMMANDS = """# Email Header Analysis
$ python3 email_parser.py --headers phishing_email_1.eml
[+] From: cfo-acmecorp@secure-login-acme.ru (SPOOFED)
[+] Reply-To: cfo.acme@evil-invoice.com
[+] Sender IP: 185.220.101.34
[+] SPF: FAIL | DKIM: FAIL | DMARC: FAIL
[+] X-Mailer: Unknown bulk mailer

# VirusTotal IOC Lookup
$ vt ip 185.220.101.34
[+] Malicious: 34/93 engines
[+] Tags: tor-exit-node, malicious-activity
[+] Last analysis: 2025-03-14

# Domain WHOIS
$ whois evil-invoice.com
[+] Created: 2025-03-01 (14 days ago)
[+] Registrar: Namecheap (privacy-protected)
[+] IP: 94.23.148.194
[+] Status: Active

# Hash Analysis
$ sha256sum invoice_Q1_2025.pdf
4a7f2b3cd91e8f05a6c2d3b4e5f67890abcd1234ef5678901234567890abcdef

# Defender Endpoint Block
$ msonline block-url --url "http://evil-invoice.com" --reason "BEC phishing"
[+] Rule created: Block evil-invoice.com (ID: DEF-2025-0441)
[+] Propagation: 3/3 endpoints updated
"""

DEMO_FINDINGS = """## Investigation Findings

**Attack Vector:** Business Email Compromise (BEC) using CFO impersonation

**Threat Actor Profile:**
- Sophisticated BEC actor with domain pre-registration tradecraft
- Registered evil-invoice.com and hr-acme-portal.com 14 days before attack
- Used Tor exit node (185.220.101.34) to send phishing emails
- Emails crafted with high social engineering quality — urgency framing, correct signature blocks

**Technical Analysis:**
- All three emails failed SPF, DKIM, and DMARC authentication
- Embedded PDF contained hyperlink to credential harvesting page
- Harvesting page mimicked Acme Corp's Microsoft 365 login
- No credentials captured — employees did not click through

**Impact Assessment:**
- No financial loss confirmed
- No credentials compromised
- No lateral movement observed
- Business disruption: minimal (30-minute finance team disruption)

**MITRE ATT&CK Mapping:**
- T1566.002 - Spearphishing Link (Initial Access)
- T1656 - Impersonation (Defense Evasion)
- T1534 - Internal Spearphishing (Lateral Movement attempt)
"""

DEMO_RECOMMENDATIONS = """## Recommendations

**Immediate (0-48 hours):**
1. Enforce DMARC policy (p=reject) on acme-corp.com domain
2. Deploy lookalike domain monitoring for all registered company domains
3. Add wire transfer approval phone verification requirement for amounts >€10,000

**Short-term (1-2 weeks):**
1. Conduct targeted BEC phishing awareness training for Finance and HR departments
2. Review and harden Exchange Online mail flow rules
3. Enable Microsoft Defender Safe Links for all users
4. Implement MFA on all finance application accounts

**Long-term (1-3 months):**
1. Subscribe to domain monitoring service (e.g., DomainTools or free alternatives)
2. Implement email banner warnings for external senders
3. Review and test incident response playbooks quarterly
4. Consider deploying an email security gateway (Mimecast/Proofpoint)
"""


def seed_demo_data(engine):
    from sqlmodel import Session
    with Session(engine) as session:
        existing = session.exec(select(Case).where(Case.case_number == "SOC-2025-DEMO1")).first()
        if existing:
            return

        case = Case(
            case_number="SOC-2025-DEMO1",
            title="Phishing Campaign Targeting Finance Department — BEC Attempt",
            severity="high",
            status="closed",
            incident_type="phishing",
            affected_systems="Exchange Online, Finance Department Workstations",
            analyst_name="Prasanna Kumar",
            customer_name="Acme Corp",
            classification="confidential",
            description="Finance department was targeted by a sophisticated Business Email Compromise (BEC) campaign. Threat actors impersonated the CFO using a lookalike domain registered 14 days prior. Three employees received spearphishing emails requesting urgent wire transfer approval. Attack was detected before any financial loss occurred.",
            commands_run=DEMO_COMMANDS,
            findings=DEMO_FINDINGS,
            recommendations=DEMO_RECOMMENDATIONS,
            iocs=DEMO_IOCS,
            timeline_events=DEMO_TIMELINE,
            mitre_techniques=DEMO_MITRE,
            ai_executive_summary="A sophisticated BEC phishing campaign targeted Acme Corp's Finance department, impersonating the CFO to obtain fraudulent wire transfer approvals. The threat actor pre-registered lookalike domains and used Tor infrastructure. All three phishing emails failed SPF/DKIM/DMARC checks. No financial loss occurred; the attack was contained within 6 hours of initial detection.",
            ai_technical_summary="Threat actor operated from Tor exit node 185.220.101.34 (34/93 VT detections). Two lookalike domains (evil-invoice.com, hr-acme-portal.com) were registered 14 days prior via Namecheap with privacy protection. Emails contained PDF attachments with embedded URLs redirecting to a credential harvesting page mimicking Microsoft 365 login. Authentication chain was fully broken (SPF FAIL, DKIM FAIL, DMARC FAIL). No credentials were captured and no lateral movement observed. MITRE coverage: T1566.002, T1566.001, T1656, T1534.",
            ai_severity_score=78,
            ai_severity_reasoning="High severity due to financial targeting (BEC), sophisticated pre-attack infrastructure setup, and CFO-level impersonation. Downgraded from Critical because: no financial loss occurred, no credentials were captured, detection was rapid (< 6 hours), and no lateral movement was observed.",
            is_public=True,
            share_token="demo-public-case-aegistrace-2025",
            closure_notes=DEMO_CLOSURE,
            shift_handoff="Case fully closed. All IOCs blocked. No active threats remain. Post-incident review scheduled for 2025-03-21 with Finance team.",
        )
        session.add(case)
        session.commit()
        session.refresh(case)

        # Timeline events
        import json as _json
        timeline_data = _json.loads(DEMO_TIMELINE)
        for ev in timeline_data:
            te = TimelineEvent(
                case_id=case.id,
                timestamp=datetime.fromisoformat(ev["timestamp"].replace("Z", "+00:00")),
                event_type=ev["event_type"],
                description=ev["description"],
            )
            session.add(te)

        # IOC Correlations
        ioc_data = _json.loads(DEMO_IOCS)
        for ioc_item in ioc_data:
            corr = IOCCorrelation(
                ioc=ioc_item["ioc"],
                ioc_type=ioc_item["type"],
                case_ids=_json.dumps([case.id]),
                case_count=1,
            )
            session.add(corr)

        # Audit log
        audit = AuditLog(
            action="case_created",
            entity_type="case",
            entity_id=str(case.id),
            new_value=f"Created demo case {case.case_number}",
        )
        session.add(audit)

        session.commit()
        print("[seed] Demo case SOC-2025-DEMO1 seeded successfully.")
