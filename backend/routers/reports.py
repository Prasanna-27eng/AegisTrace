import json, io, os
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlmodel import Session
from models import Case
from database import get_session

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
