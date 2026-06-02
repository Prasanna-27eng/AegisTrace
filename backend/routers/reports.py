import json, io, os
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlmodel import Session, select
from models import Case, TimelineEvent
from database import get_session
from routers.auth import get_current_user
from models import User
from ai_router import call_ai, call_ai_json

router = APIRouter(prefix="/api/reports", tags=["reports"])


def severity_color_rgb(severity: str):
    return {
        "critical": (192, 57, 43),
        "high":     (234, 179, 8),
        "medium":   (167, 139, 250),
        "low":      (34, 197, 94),
        "info":     (113, 113, 122),
    }.get(severity, (113, 113, 122))


def ai_enrich_case(case: Case) -> dict:
    """
    Use AI to generate detailed narrative sections if not already present.
    Returns a dict with enriched text fields.
    """
    iocs  = json.loads(case.iocs or "[]")
    mitre = json.loads(case.mitre_techniques or "[]")

    # If we already have AI summaries, just enhance them for the report
    existing_exec = case.ai_executive_summary or ""
    existing_tech = case.ai_technical_summary or ""

    prompt = f"""You are a senior SOC analyst writing a formal incident report.
Generate detailed, professional narrative sections for the following case.

Case: {case.case_number} — {case.title}
Severity: {case.severity.upper()} | Type: {case.incident_type}
Affected Systems: {case.affected_systems}
Analyst: {case.analyst_name} | Customer: {case.customer_name}
Description: {case.description[:600]}
Findings: {case.findings[:800]}
Commands Run: {(case.commands_run or '')[:600]}
IOCs ({len(iocs)}): {json.dumps(iocs[:8])}
MITRE Techniques: {json.dumps(mitre)}
Existing Summary: {existing_exec[:300]}

Generate a comprehensive, well-written incident report. Respond ONLY with valid JSON:
{{
  "executive_summary": "3-4 professional sentences for senior management and legal. Include business impact, attack vector, and outcome.",
  "technical_narrative": "4-6 detailed technical paragraphs covering: initial detection, attack analysis, threat actor TTPs, evidence collected, containment actions, and forensic findings.",
  "attack_timeline_summary": "2-3 sentences summarising the chronological attack progression.",
  "impact_assessment": "Paragraph assessing: data loss, financial impact, service disruption, reputational risk, regulatory implications.",
  "threat_actor_profile": "2-3 sentences on threat actor sophistication, likely motivation, and attribution confidence.",
  "remediation_summary": "3-4 specific, actionable remediation steps taken or recommended.",
  "lessons_learned": "2-3 specific operational improvements identified from this incident.",
  "risk_rating": "Overall risk rating with justification (Critical/High/Medium/Low and why)"
}}"""

    result = call_ai_json("report", prompt, temperature=0.3, max_tokens=2000)
    if result.get("parse_error"):
        return {
            "executive_summary": existing_exec or case.description,
            "technical_narrative": existing_tech or case.findings,
            "attack_timeline_summary": "",
            "impact_assessment": "",
            "threat_actor_profile": "",
            "remediation_summary": case.recommendations or "",
            "lessons_learned": "",
            "risk_rating": f"{case.severity.upper()} — Score: {case.ai_severity_score or 'N/A'}/100",
        }
    return result


@router.get("/{case_id}/pdf")
def download_pdf(case_id: int, session: Session = Depends(get_session),
                 user: User = Depends(get_current_user)):
    case = session.get(Case, case_id)
    if not case:
        raise HTTPException(404)

    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import cm
        from reportlab.lib import colors
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
        from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
    except ImportError:
        raise HTTPException(503, "reportlab not installed")

    # Generate AI-enriched report content
    ai = ai_enrich_case(case)

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4,
                            rightMargin=2*cm, leftMargin=2*cm,
                            topMargin=2*cm, bottomMargin=2*cm)

    r, g, b = severity_color_rgb(case.severity)
    accent = colors.Color(r/255, g/255, b/255)
    dark   = colors.Color(0.04, 0.03, 0.06)
    gray   = colors.Color(0.44, 0.44, 0.45)
    lgray  = colors.Color(0.97, 0.97, 0.98)

    def S(name, **kw):
        base = dict(fontName="Helvetica", fontSize=9, textColor=gray, spaceAfter=4, leading=14)
        base.update(kw)
        return ParagraphStyle(name, **base)

    title_style = S("title", fontName="Helvetica-Bold", fontSize=16, textColor=dark, spaceAfter=4)
    h2_style    = S("h2",    fontName="Helvetica-Bold", fontSize=11, textColor=accent, spaceBefore=14, spaceAfter=4)
    body_style  = S("body")
    mono_style  = S("mono",  fontName="Courier", fontSize=8, leading=12)
    note_style  = S("note",  fontName="Helvetica-Oblique", fontSize=8, textColor=gray)

    def clean(text):
        return (text or "").replace("\n", "<br/>").replace("**", "").replace("##", "").replace("#", "")

    story = []

    # ── Cover ─────────────────────────────────────────────────────────────────
    story.append(Paragraph("AEGISTRACE SOC PLATFORM", S("brand", fontName="Helvetica-Bold", fontSize=8, textColor=accent, spaceAfter=2)))
    story.append(Paragraph("INCIDENT INVESTIGATION REPORT", S("rep", fontName="Helvetica-Bold", fontSize=10, textColor=dark, spaceAfter=6)))
    story.append(Paragraph(case.title, title_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=accent, spaceAfter=10))

    detail_data = [
        ["Case Number",     case.case_number,    "Severity",        case.severity.upper()],
        ["Status",          case.status.replace("_"," ").upper(), "Incident Type", case.incident_type.replace("_"," ").title()],
        ["Analyst",         case.analyst_name,   "Customer",        case.customer_name or "—"],
        ["Classification",  case.classification, "Affected Systems",case.affected_systems or "—"],
        ["Report Date",     datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC"), "Case Opened", case.created_at.strftime("%Y-%m-%d %H:%M UTC")],
    ]
    dt = Table(detail_data, colWidths=[3.5*cm, 5.5*cm, 3.5*cm, 5*cm])
    dt.setStyle(TableStyle([
        ("FONTNAME",  (0,0), (0,-1), "Helvetica-Bold"),
        ("FONTNAME",  (2,0), (2,-1), "Helvetica-Bold"),
        ("FONTNAME",  (1,0), (1,-1), "Helvetica"),
        ("FONTNAME",  (3,0), (3,-1), "Helvetica"),
        ("FONTSIZE",  (0,0), (-1,-1), 8),
        ("ROWBACKGROUNDS", (0,0), (-1,-1), [lgray, colors.white]),
        ("GRID",      (0,0), (-1,-1), 0.5, colors.Color(0.85,0.85,0.86)),
        ("PADDING",   (0,0), (-1,-1), 6),
    ]))
    story.append(dt)
    story.append(Spacer(1, 0.4*cm))

    # ── AI Executive Summary ──────────────────────────────────────────────────
    if ai.get("executive_summary"):
        story.append(Paragraph("Executive Summary", h2_style))
        story.append(Paragraph(clean(ai["executive_summary"]), body_style))

    # ── Risk Rating ───────────────────────────────────────────────────────────
    if ai.get("risk_rating"):
        story.append(Paragraph("Risk Rating", h2_style))
        story.append(Paragraph(clean(ai["risk_rating"]), body_style))
        if case.ai_severity_score:
            story.append(Paragraph(f"AI Severity Score: {case.ai_severity_score}/100  |  {case.ai_severity_reasoning or ''}", note_style))

    # ── Attack Timeline Summary ───────────────────────────────────────────────
    if ai.get("attack_timeline_summary"):
        story.append(Paragraph("Attack Timeline Summary", h2_style))
        story.append(Paragraph(clean(ai["attack_timeline_summary"]), body_style))

    # ── Technical Narrative ───────────────────────────────────────────────────
    if ai.get("technical_narrative"):
        story.append(Paragraph("Technical Analysis", h2_style))
        story.append(Paragraph(clean(ai["technical_narrative"]), body_style))

    # ── Threat Actor Profile ──────────────────────────────────────────────────
    if ai.get("threat_actor_profile"):
        story.append(Paragraph("Threat Actor Profile", h2_style))
        story.append(Paragraph(clean(ai["threat_actor_profile"]), body_style))

    # ── Impact Assessment ─────────────────────────────────────────────────────
    if ai.get("impact_assessment"):
        story.append(Paragraph("Impact Assessment", h2_style))
        story.append(Paragraph(clean(ai["impact_assessment"]), body_style))

    # ── Analyst Findings (raw) ────────────────────────────────────────────────
    if case.findings:
        story.append(Paragraph("Analyst Findings", h2_style))
        story.append(Paragraph(clean(case.findings), body_style))

    # IOCs
    try:
        iocs = json.loads(case.iocs or "[]")
        if iocs:
            story.append(Paragraph("Indicators of Compromise", h2_style))
            ioc_data = [["IOC", "Type", "Verdict", "Confidence"]]
            for ioc in iocs[:20]:
                ioc_data.append([
                    ioc.get("ioc", "")[:50],
                    ioc.get("type", ""),
                    ioc.get("verdict", ""),
                    f"{ioc.get('confidence', 0)}%",
                ])
            ti = Table(ioc_data, colWidths=[9*cm, 2*cm, 3*cm, 3*cm])
            ti.setStyle(TableStyle([
                ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"),
                ("FONTSIZE", (0,0), (-1,-1), 8),
                ("BACKGROUND", (0,0), (-1,0), colors.Color(0.07, 0.03, 0.06)),
                ("TEXTCOLOR", (0,0), (-1,0), colors.white),
                ("ROWBACKGROUNDS", (0,1), (-1,-1), [colors.Color(0.97,0.97,0.98), colors.white]),
                ("GRID", (0,0), (-1,-1), 0.5, colors.Color(0.85, 0.85, 0.86)),
                ("PADDING", (0,0), (-1,-1), 5),
                ("FONTNAME", (0,1), (0,-1), "Courier"),
            ]))
            story.append(ti)
    except Exception:
        pass

    # MITRE
    try:
        mitre = json.loads(case.mitre_techniques or "[]")
        if mitre:
            story.append(Paragraph("MITRE ATT&CK Techniques", h2_style))
            mitre_data = [["Technique ID", "Name", "Tactic"]]
            for m in mitre:
                mitre_data.append([m.get("id", ""), m.get("name", ""), m.get("tactic", "")])
            tm = Table(mitre_data, colWidths=[3*cm, 8*cm, 6*cm])
            tm.setStyle(TableStyle([
                ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"),
                ("FONTSIZE", (0,0), (-1,-1), 8),
                ("BACKGROUND", (0,0), (-1,0), colors.Color(0.33, 0.29, 0.73)),
                ("TEXTCOLOR", (0,0), (-1,0), colors.white),
                ("ROWBACKGROUNDS", (0,1), (-1,-1), [colors.Color(0.97,0.97,0.98), colors.white]),
                ("GRID", (0,0), (-1,-1), 0.5, colors.Color(0.85, 0.85, 0.86)),
                ("PADDING", (0,0), (-1,-1), 5),
                ("FONTNAME", (0,1), (0,-1), "Courier"),
            ]))
            story.append(tm)
    except Exception:
        pass

    # ── Remediation ───────────────────────────────────────────────────────────
    if ai.get("remediation_summary"):
        story.append(Paragraph("Remediation Actions", h2_style))
        story.append(Paragraph(clean(ai["remediation_summary"]), body_style))
    elif case.recommendations:
        story.append(Paragraph("Recommendations", h2_style))
        story.append(Paragraph(clean(case.recommendations), body_style))

    # ── Lessons Learned ───────────────────────────────────────────────────────
    if ai.get("lessons_learned"):
        story.append(Paragraph("Lessons Learned", h2_style))
        story.append(Paragraph(clean(ai["lessons_learned"]), body_style))

    # ── Closure Notes ─────────────────────────────────────────────────────────
    try:
        closure = json.loads(case.closure_notes or "{}")
        if closure:
            story.append(Paragraph("Case Closure", h2_style))
            if closure.get("final_findings"):
                story.append(Paragraph(f"<b>Final Findings:</b> {closure['final_findings']}", body_style))
            story.append(Paragraph(f"<b>Closed by:</b> {closure.get('closed_by','—')}  |  <b>Closed at:</b> {closure.get('closed_at','—')}", note_style))
    except Exception:
        pass

    # ── Commands Run ──────────────────────────────────────────────────────────
    if case.commands_run:
        story.append(Paragraph("Commands &amp; Tool Output", h2_style))
        for line in case.commands_run.split("\n")[:40]:
            story.append(Paragraph(line or "&nbsp;", mono_style))

    # ── Timeline ──────────────────────────────────────────────────────────────
    tl_events = session.exec(
        select(TimelineEvent)
        .where(TimelineEvent.case_id == case_id)
        .order_by(TimelineEvent.timestamp)
    ).all()
    if tl_events:
        story.append(Paragraph("Investigation Timeline", h2_style))
        tl_data = [["Timestamp", "Type", "Description"]]
        for ev in tl_events:
            tl_data.append([
                ev.timestamp.strftime("%Y-%m-%d %H:%M"),
                ev.event_type.upper(),
                (ev.description or "")[:80],
            ])
        tlt = Table(tl_data, colWidths=[3.5*cm, 2.5*cm, 11.5*cm])
        tlt.setStyle(TableStyle([
            ("FONTNAME",  (0,0), (-1,0), "Helvetica-Bold"),
            ("FONTSIZE",  (0,0), (-1,-1), 7.5),
            ("BACKGROUND",(0,0), (-1,0), dark),
            ("TEXTCOLOR", (0,0), (-1,0), colors.white),
            ("ROWBACKGROUNDS", (0,1), (-1,-1), [lgray, colors.white]),
            ("GRID",      (0,0), (-1,-1), 0.5, colors.Color(0.85,0.85,0.86)),
            ("PADDING",   (0,0), (-1,-1), 4),
            ("FONTNAME",  (0,1), (0,-1), "Courier"),
        ]))
        story.append(tlt)

    # ── Footer ────────────────────────────────────────────────────────────────
    story.append(Spacer(1, 0.6*cm))
    story.append(HRFlowable(width="100%", thickness=0.5, color=gray))
    story.append(Paragraph(
        f"Generated by AegisTrace SOC Platform &nbsp;·&nbsp; "
        f"{datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')} &nbsp;·&nbsp; "
        f"AI-Assisted Analysis (Groq llama-3.3-70b) &nbsp;·&nbsp; CONFIDENTIAL",
        S("footer", fontName="Helvetica", fontSize=7, textColor=gray, alignment=TA_CENTER)
    ))

    doc.build(story)
    buffer.seek(0)
    filename = f"AegisTrace_Report_{case.case_number}.pdf"
    return StreamingResponse(buffer, media_type="application/pdf",
                             headers={"Content-Disposition": f'attachment; filename="{filename}"'})


@router.get("/{case_id}/docx")
def download_docx(case_id: int, session: Session = Depends(get_session),
                  user: User = Depends(get_current_user)):
    case = session.get(Case, case_id)
    if not case:
        raise HTTPException(404)
    try:
        from docx import Document
        from docx.shared import Pt, RGBColor, Cm
        from docx.enum.text import WD_ALIGN_PARAGRAPH
    except ImportError:
        raise HTTPException(503, "python-docx not installed")

    doc = Document()
    r, g, b = severity_color_rgb(case.severity)

    # Title
    h = doc.add_heading(case.title, 0)
    h.runs[0].font.color.rgb = RGBColor(r, g, b)
    doc.add_paragraph(f"Case: {case.case_number}  |  Severity: {case.severity.upper()}  |  Status: {case.status.upper()}")
    doc.add_paragraph(f"Analyst: {case.analyst_name}  |  Customer: {case.customer_name}")
    doc.add_paragraph(f"Type: {case.incident_type}  |  Date: {case.created_at.strftime('%Y-%m-%d')}")
    doc.add_paragraph("")

    def add_section(title, content):
        if not content:
            return
        doc.add_heading(title, level=2)
        doc.add_paragraph(content)

    add_section("Description", case.description)
    add_section("Executive Summary", case.ai_executive_summary)
    add_section("Findings", case.findings)
    add_section("Recommendations", case.recommendations)

    try:
        iocs = json.loads(case.iocs or "[]")
        if iocs:
            doc.add_heading("Indicators of Compromise", level=2)
            table = doc.add_table(rows=1, cols=4)
            table.style = "Table Grid"
            hdr = table.rows[0].cells
            hdr[0].text, hdr[1].text, hdr[2].text, hdr[3].text = "IOC", "Type", "Verdict", "Confidence"
            for ioc in iocs[:20]:
                row = table.add_row().cells
                row[0].text = ioc.get("ioc", "")
                row[1].text = ioc.get("type", "")
                row[2].text = ioc.get("verdict", "")
                row[3].text = f"{ioc.get('confidence', 0)}%"
    except Exception:
        pass

    if case.commands_run:
        doc.add_heading("Commands Run", level=2)
        p = doc.add_paragraph(case.commands_run)
        p.runs[0].font.name = "Courier New"
        p.runs[0].font.size = Pt(9)

    doc.add_paragraph(f"\nGenerated by AegisTrace · {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')} · CONFIDENTIAL")

    buffer = io.BytesIO()
    doc.save(buffer)
    buffer.seek(0)
    filename = f"aegistrace_{case.case_number}.docx"
    return StreamingResponse(buffer,
                             media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                             headers={"Content-Disposition": f'attachment; filename="{filename}"'})


# ── DORA Compliance Report ────────────────────────────────────────────────────
@router.get("/{case_id}/dora")
def download_dora(case_id: int, session: Session = Depends(get_session),
                  user: User = Depends(get_current_user)):
    """
    Generate a DORA Article 19 Major ICT-related Incident Report.
    Maps the 5 DORA pillars to AegisTrace case data.
    """
    case = session.get(Case, case_id)
    if not case:
        raise HTTPException(404)

    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import ParagraphStyle
        from reportlab.lib.units import cm
        from reportlab.lib import colors
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
        from reportlab.lib.enums import TA_CENTER
    except ImportError:
        raise HTTPException(503, "reportlab not installed")

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4,
                            rightMargin=2.2*cm, leftMargin=2.2*cm,
                            topMargin=2*cm, bottomMargin=2*cm)

    dark   = colors.Color(0.04, 0.03, 0.06)
    red    = colors.Color(0.75, 0.22, 0.17)
    gray   = colors.Color(0.44, 0.44, 0.45)
    light  = colors.Color(0.97, 0.97, 0.98)

    def S(name, **kw):
        base = {"fontName": "Helvetica", "fontSize": 9, "textColor": gray, "spaceAfter": 4, "leading": 14}
        base.update(kw)
        return ParagraphStyle(name, **base)

    h1   = S("h1", fontName="Helvetica-Bold", fontSize=14, textColor=dark, spaceAfter=6)
    h2   = S("h2", fontName="Helvetica-Bold", fontSize=11, textColor=red, spaceBefore=16, spaceAfter=4)
    body = S("body")
    mono = S("mono", fontName="Courier", fontSize=8, textColor=gray, leading=12)
    note = S("note", fontSize=8, textColor=gray, fontName="Helvetica-Oblique")

    # Parse data
    closure = {}
    try:
        closure = json.loads(case.closure_notes or "{}")
    except Exception:
        pass
    iocs = []
    try:
        iocs = json.loads(case.iocs or "[]")
    except Exception:
        pass
    mitre = []
    try:
        mitre = json.loads(case.mitre_techniques or "[]")
    except Exception:
        pass

    # Timeline from DB
    timeline = session.exec(
        select(TimelineEvent)
        .where(TimelineEvent.case_id == case_id)
        .order_by(TimelineEvent.timestamp)
    ).all()

    first_detected = timeline[0].timestamp.strftime("%Y-%m-%d %H:%M UTC") if timeline else case.created_at.strftime("%Y-%m-%d %H:%M UTC")
    last_event     = timeline[-1].timestamp.strftime("%Y-%m-%d %H:%M UTC") if timeline else "Ongoing"

    story = []

    # EU / DORA Header
    story.append(Paragraph("EUROPEAN UNION — DIGITAL OPERATIONAL RESILIENCE ACT (DORA)", S("eu", fontName="Helvetica-Bold", fontSize=8, textColor=gray, spaceAfter=2)))
    story.append(Paragraph("MAJOR ICT-RELATED INCIDENT REPORT — Article 19(1)", h1))
    story.append(HRFlowable(width="100%", thickness=1.5, color=red, spaceAfter=10))

    story.append(Paragraph("REPORT IDENTIFICATION", h2))
    id_data = [
        ["Report Reference", case.case_number],
        ["Incident Title",   case.title],
        ["Classification",   case.classification.upper()],
        ["Report Date",      datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")],
        ["Entity Name",      case.customer_name or "—"],
        ["Prepared By",      case.analyst_name or "—"],
    ]
    t = Table(id_data, colWidths=[5.5*cm, 11*cm])
    t.setStyle(TableStyle([
        ("FONTNAME", (0,0), (0,-1), "Helvetica-Bold"),
        ("FONTSIZE", (0,0), (-1,-1), 8),
        ("ROWBACKGROUNDS", (0,0), (-1,-1), [light, colors.white]),
        ("GRID", (0,0), (-1,-1), 0.5, colors.Color(0.85,0.85,0.86)),
        ("PADDING", (0,0), (-1,-1), 5),
    ]))
    story.append(t)

    # Pillar 1 — ICT Risk Management
    story.append(Paragraph("PILLAR 1 — ICT RISK MANAGEMENT", h2))
    story.append(Paragraph(f"<b>Incident Type:</b> {case.incident_type.replace('_',' ').title()}", body))
    story.append(Paragraph(f"<b>Severity Classification:</b> {case.severity.upper()}", body))
    story.append(Paragraph(f"<b>Affected Systems / Services:</b> {case.affected_systems or 'Not specified'}", body))
    story.append(Paragraph(f"<b>Description:</b>", body))
    story.append(Paragraph(case.description or "—", body))

    # Pillar 2 — Incident Detection
    story.append(Paragraph("PILLAR 2 — INCIDENT DETECTION & CLASSIFICATION", h2))
    story.append(Paragraph(f"<b>Initial Detection:</b> {first_detected}", body))
    story.append(Paragraph(f"<b>Detection Method:</b> {timeline[0].description if timeline else 'Manual detection'}", body))
    story.append(Paragraph(f"<b>AI Severity Score:</b> {case.ai_severity_score or 'Not assessed'}/100", body))
    if case.ai_severity_reasoning:
        story.append(Paragraph(f"<b>Severity Reasoning:</b> {case.ai_severity_reasoning}", body))

    # Pillar 3 — Incident Reporting
    story.append(Paragraph("PILLAR 3 — INCIDENT REPORTING & NOTIFICATION", h2))
    story.append(Paragraph(f"<b>Case Opened:</b> {case.created_at.strftime('%Y-%m-%d %H:%M UTC')}", body))
    story.append(Paragraph(f"<b>Last Updated:</b> {case.updated_at.strftime('%Y-%m-%d %H:%M UTC')}", body))
    story.append(Paragraph(f"<b>Current Status:</b> {case.status.replace('_',' ').upper()}", body))

    if mitre:
        story.append(Paragraph("<b>MITRE ATT&amp;CK Techniques Identified:</b>", body))
        m_data = [["Technique ID", "Name", "Tactic"]] + [[m.get("id",""), m.get("name",""), m.get("tactic","")] for m in mitre]
        mt = Table(m_data, colWidths=[3*cm, 9*cm, 4.5*cm])
        mt.setStyle(TableStyle([
            ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"),
            ("FONTSIZE", (0,0), (-1,-1), 8),
            ("BACKGROUND", (0,0), (-1,0), dark),
            ("TEXTCOLOR", (0,0), (-1,0), colors.white),
            ("ROWBACKGROUNDS", (0,1), (-1,-1), [light, colors.white]),
            ("GRID", (0,0), (-1,-1), 0.5, colors.Color(0.85,0.85,0.86)),
            ("PADDING", (0,0), (-1,-1), 4),
            ("FONTNAME", (0,1), (0,-1), "Courier"),
        ]))
        story.append(mt)

    # Pillar 4 — Resilience Testing (IOC evidence)
    story.append(Paragraph("PILLAR 4 — DIGITAL OPERATIONAL RESILIENCE TESTING", h2))
    story.append(Paragraph(f"<b>Indicators of Compromise ({len(iocs)}):</b>", body))
    if iocs:
        ioc_data = [["IOC Value", "Type", "Verdict"]] + [
            [i.get("ioc","")[:55], i.get("type",""), i.get("verdict","—")] for i in iocs[:20]
        ]
        it = Table(ioc_data, colWidths=[9.5*cm, 2.5*cm, 4.5*cm])
        it.setStyle(TableStyle([
            ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"),
            ("FONTSIZE", (0,0), (-1,-1), 8),
            ("BACKGROUND", (0,0), (-1,0), dark),
            ("TEXTCOLOR", (0,0), (-1,0), colors.white),
            ("ROWBACKGROUNDS", (0,1), (-1,-1), [light, colors.white]),
            ("GRID", (0,0), (-1,-1), 0.5, colors.Color(0.85,0.85,0.86)),
            ("PADDING", (0,0), (-1,-1), 4),
            ("FONTNAME", (0,1), (0,-1), "Courier"),
        ]))
        story.append(it)

    # Pillar 5 — ICT Third-Party Risk / Recovery
    story.append(Paragraph("PILLAR 5 — RECOVERY & LESSONS LEARNED", h2))
    if closure:
        story.append(Paragraph(f"<b>Final Findings:</b>", body))
        story.append(Paragraph(closure.get("final_findings", "—"), body))
        story.append(Paragraph(f"<b>Remediation Steps Taken:</b>", body))
        story.append(Paragraph(closure.get("remediation_steps", "—"), body))
        story.append(Paragraph(f"<b>Lessons Learned:</b>", body))
        story.append(Paragraph(closure.get("lessons_learned", "—"), body))
        story.append(Paragraph(f"<b>Case Closed By:</b> {closure.get('closed_by','—')}  |  <b>Closed At:</b> {closure.get('closed_at','—')}", body))
    else:
        story.append(Paragraph("Case not yet closed. Closure notes pending.", note))

    if case.recommendations:
        story.append(Paragraph("<b>Recommendations:</b>", body))
        story.append(Paragraph(case.recommendations.replace("\n","<br/>").replace("**",""), body))

    # Executive Summary
    if case.ai_executive_summary:
        story.append(Paragraph("AI-ASSISTED EXECUTIVE SUMMARY", h2))
        story.append(Paragraph(case.ai_executive_summary, body))

    # Footer
    story.append(Spacer(1, 0.5*cm))
    story.append(HRFlowable(width="100%", thickness=0.5, color=gray))
    story.append(Paragraph(
        f"Generated by AegisTrace SOC Platform · {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')} · DORA Article 19 Format · CONFIDENTIAL",
        S("footer", fontName="Helvetica", fontSize=7, textColor=gray, alignment=TA_CENTER)
    ))

    doc.build(story)
    buffer.seek(0)
    filename = f"DORA_{case.case_number}.pdf"
    return StreamingResponse(buffer, media_type="application/pdf",
                             headers={"Content-Disposition": f'attachment; filename="{filename}"'})
