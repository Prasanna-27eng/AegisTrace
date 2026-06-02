import json, io, os
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlmodel import Session, select
from models import Case, TimelineEvent
from database import get_session
from routers.auth import get_current_user
from models import User

router = APIRouter(prefix="/api/reports", tags=["reports"])


def severity_color_rgb(severity: str):
    return {
        "critical": (192, 57, 43),
        "high": (234, 179, 8),
        "medium": (167, 139, 250),
        "low": (34, 197, 94),
        "info": (113, 113, 122),
    }.get(severity, (113, 113, 122))


@router.get("/{case_id}/pdf")
def download_pdf(case_id: int, session: Session = Depends(get_session)):
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

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4,
                            rightMargin=2*cm, leftMargin=2*cm,
                            topMargin=2*cm, bottomMargin=2*cm)

    r, g, b = severity_color_rgb(case.severity)
    accent = colors.Color(r/255, g/255, b/255)
    dark   = colors.Color(0.04, 0.03, 0.06)
    gray   = colors.Color(0.44, 0.44, 0.45)

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("title", fontName="Helvetica-Bold", fontSize=18, textColor=dark, spaceAfter=4)
    h2_style    = ParagraphStyle("h2",    fontName="Helvetica-Bold", fontSize=12, textColor=accent, spaceBefore=12, spaceAfter=4)
    body_style  = ParagraphStyle("body",  fontName="Helvetica",      fontSize=9,  textColor=gray,  spaceAfter=4, leading=14)
    label_style = ParagraphStyle("label", fontName="Helvetica-Bold", fontSize=8,  textColor=dark)
    mono_style  = ParagraphStyle("mono",  fontName="Courier",        fontSize=8,  textColor=gray,  spaceAfter=4, leading=12)

    story = []

    # Header
    story.append(Paragraph("AEGISTRACE", ParagraphStyle("brand", fontName="Helvetica-Bold", fontSize=8, textColor=accent, spaceAfter=2)))
    story.append(Paragraph(case.title, title_style))
    story.append(Paragraph(f"Case: {case.case_number} &nbsp;&nbsp; Severity: {case.severity.upper()} &nbsp;&nbsp; Status: {case.status.upper()}", body_style))
    story.append(HRFlowable(width="100%", thickness=1, color=accent, spaceAfter=12))

    # Case Details Table
    story.append(Paragraph("Case Details", h2_style))
    detail_data = [
        ["Analyst", case.analyst_name, "Customer", case.customer_name],
        ["Type", case.incident_type, "Classification", case.classification],
        ["Affected Systems", case.affected_systems, "Created", case.created_at.strftime("%Y-%m-%d %H:%M UTC")],
    ]
    t = Table(detail_data, colWidths=[3*cm, 6*cm, 3*cm, 5*cm])
    t.setStyle(TableStyle([
        ("FONTNAME", (0,0), (-1,-1), "Helvetica"),
        ("FONTSIZE", (0,0), (-1,-1), 8),
        ("FONTNAME", (0,0), (0,-1), "Helvetica-Bold"),
        ("FONTNAME", (2,0), (2,-1), "Helvetica-Bold"),
        ("BACKGROUND", (0,0), (-1,-1), colors.Color(0.95, 0.95, 0.96)),
        ("GRID", (0,0), (-1,-1), 0.5, colors.Color(0.8, 0.8, 0.82)),
        ("ROWBACKGROUNDS", (0,0), (-1,-1), [colors.Color(0.97,0.97,0.98), colors.white]),
        ("PADDING", (0,0), (-1,-1), 6),
    ]))
    story.append(t)
    story.append(Spacer(1, 0.3*cm))

    # Description
    if case.description:
        story.append(Paragraph("Description", h2_style))
        story.append(Paragraph(case.description.replace("\n", "<br/>"), body_style))

    # AI Executive Summary
    if case.ai_executive_summary:
        story.append(Paragraph("Executive Summary (AI)", h2_style))
        story.append(Paragraph(case.ai_executive_summary.replace("\n", "<br/>"), body_style))

    # Findings
    if case.findings:
        story.append(Paragraph("Findings", h2_style))
        story.append(Paragraph(case.findings.replace("\n", "<br/>").replace("**", ""), body_style))

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

    # Recommendations
    if case.recommendations:
        story.append(Paragraph("Recommendations", h2_style))
        story.append(Paragraph(case.recommendations.replace("\n", "<br/>").replace("**", ""), body_style))

    # Commands
    if case.commands_run:
        story.append(Paragraph("Commands Run", h2_style))
        for line in case.commands_run.split("\n")[:30]:
            story.append(Paragraph(line or "&nbsp;", mono_style))

    # Footer
    story.append(Spacer(1, 0.5*cm))
    story.append(HRFlowable(width="100%", thickness=0.5, color=gray))
    story.append(Paragraph(
        f"Generated by AegisTrace &nbsp;·&nbsp; {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')} &nbsp;·&nbsp; CONFIDENTIAL",
        ParagraphStyle("footer", fontName="Helvetica", fontSize=7, textColor=gray, alignment=TA_CENTER)
    ))

    doc.build(story)
    buffer.seek(0)
    filename = f"aegistrace_{case.case_number}.pdf"
    return StreamingResponse(buffer, media_type="application/pdf",
                             headers={"Content-Disposition": f'attachment; filename="{filename}"'})


@router.get("/{case_id}/docx")
def download_docx(case_id: int, session: Session = Depends(get_session)):
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
def download_dora(case_id: int, session: Session = Depends(get_session)):
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
