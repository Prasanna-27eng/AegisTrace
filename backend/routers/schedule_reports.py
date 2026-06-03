"""
AegisTrace Scheduled PDF Report Delivery
─────────────────────────────────────────
Create, manage, and trigger scheduled email digests of SOC case data.

Supports:
  • Daily / Weekly / Monthly schedules
  • Report types: digest summary | open cases | critical-only
  • Email delivery via SMTP (or SendGrid if SENDGRID_API_KEY is set)
  • Background scheduler thread — starts on FastAPI startup event

Environment variables:
  SMTP_HOST          — e.g. smtp.gmail.com
  SMTP_PORT          — e.g. 587
  SMTP_USERNAME      — your email address
  SMTP_PASSWORD      — app password / SMTP credential
  SMTP_FROM          — From address (defaults to SMTP_USERNAME)
  SENDGRID_API_KEY   — Optional: use SendGrid instead of raw SMTP
"""

import os, json, io, threading, time
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from models import ReportSchedule, Case, User
from database import get_session, engine
from routers.auth import get_current_user, require_admin

router = APIRouter(prefix="/api/report-schedules", tags=["report-schedules"])

# ── Email delivery ────────────────────────────────────────────────────────────

def _send_email(to_list: list, subject: str, body_html: str, attachments: list = None):
    """
    Send email via SMTP or SendGrid (whichever is configured).
    attachments = [{"filename": "report.pdf", "data": bytes}]
    """
    sendgrid_key = os.getenv("SENDGRID_API_KEY", "")
    smtp_host    = os.getenv("SMTP_HOST", "")

    if sendgrid_key:
        return _send_sendgrid(to_list, subject, body_html, attachments or [], sendgrid_key)
    elif smtp_host:
        return _send_smtp(to_list, subject, body_html, attachments or [])
    else:
        print(f"[report-schedule] No email transport configured. Would have sent to: {to_list}")
        return False


def _send_smtp(to_list, subject, body_html, attachments):
    import smtplib
    from email.mime.multipart import MIMEMultipart
    from email.mime.text import MIMEText
    from email.mime.base import MIMEBase
    from email import encoders

    smtp_host = os.getenv("SMTP_HOST")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USERNAME", "")
    smtp_pass = os.getenv("SMTP_PASSWORD", "")
    from_addr = os.getenv("SMTP_FROM", smtp_user)

    msg = MIMEMultipart("mixed")
    msg["Subject"] = subject
    msg["From"]    = from_addr
    msg["To"]      = ", ".join(to_list)
    msg.attach(MIMEText(body_html, "html"))

    for att in attachments:
        part = MIMEBase("application", "octet-stream")
        part.set_payload(att["data"])
        encoders.encode_base64(part)
        part.add_header("Content-Disposition", f'attachment; filename="{att["filename"]}"')
        msg.attach(part)

    with smtplib.SMTP(smtp_host, smtp_port) as s:
        s.starttls()
        if smtp_user and smtp_pass:
            s.login(smtp_user, smtp_pass)
        s.sendmail(from_addr, to_list, msg.as_string())
    return True


def _send_sendgrid(to_list, subject, body_html, attachments, api_key):
    import base64, httpx
    payload = {
        "personalizations": [{"to": [{"email": e} for e in to_list]}],
        "from": {"email": os.getenv("SMTP_FROM", "noreply@aegistrace.app"), "name": "AegisTrace SOC"},
        "subject": subject,
        "content": [{"type": "text/html", "value": body_html}],
    }
    if attachments:
        payload["attachments"] = [
            {"content": base64.b64encode(a["data"]).decode(), "filename": a["filename"],
             "type": "application/pdf", "disposition": "attachment"}
            for a in attachments
        ]
    with httpx.Client(timeout=20) as c:
        r = c.post("https://api.sendgrid.com/v3/mail/send",
                   headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                   json=payload)
        return r.status_code == 202


# ── Report generation ─────────────────────────────────────────────────────────

def _build_digest_html(cases: list, report_type: str, org_name: str = "AegisTrace") -> str:
    now = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
    open_cases     = [c for c in cases if c.status != "closed"]
    critical       = [c for c in open_cases if c.severity == "critical"]
    pending        = [c for c in cases if c.status == "pending_closure"]
    closed_today   = [c for c in cases if c.status == "closed" and
                      c.updated_at >= datetime.utcnow() - timedelta(days=1)]

    sev_color = {"critical": "#C0392B", "high": "#EF4444", "medium": "#EAB308",
                 "low": "#22C55E", "info": "#71717A"}

    def case_row(c):
        color = sev_color.get(c.severity, "#71717A")
        return f"""
        <tr style="border-bottom:1px solid #eee">
          <td style="padding:7px 10px;font-family:monospace;font-size:12px;color:#666">{c.case_number}</td>
          <td style="padding:7px 10px;font-size:13px">{c.title}</td>
          <td style="padding:7px 10px"><span style="background:{color}22;color:{color};padding:2px 7px;border-radius:4px;font-size:11px;font-weight:600">{c.severity.upper()}</span></td>
          <td style="padding:7px 10px;font-size:12px;color:#666">{c.status.replace('_',' ').upper()}</td>
          <td style="padding:7px 10px;font-size:11px;color:#999;font-family:monospace">{c.analyst_name or '—'}</td>
        </tr>"""

    cases_html = "".join(case_row(c) for c in (critical if report_type == "critical_only" else open_cases)[:30])

    return f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>AegisTrace Report</title></head>
<body style="font-family:Inter,Arial,sans-serif;background:#f5f5f7;margin:0;padding:20px">
<div style="max-width:700px;margin:0 auto;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1)">
  <div style="background:#07080F;padding:20px 28px">
    <div style="color:#C0392B;font-size:11px;font-weight:700;letter-spacing:0.1em;font-family:monospace">AEGISTRACE SOC PLATFORM</div>
    <div style="color:#fff;font-size:20px;font-weight:700;margin-top:4px">{'Critical Incident Alert' if report_type == 'critical_only' else 'SOC Operations Digest'}</div>
    <div style="color:#71717A;font-size:12px;margin-top:4px">{now}</div>
  </div>
  <div style="padding:24px 28px">
    <div style="display:flex;gap:16px;margin-bottom:24px;flex-wrap:wrap">
      {''.join(f'<div style="background:#f8f8fa;border-radius:8px;padding:12px 18px;min-width:100px"><div style="font-size:11px;color:#999;text-transform:uppercase;letter-spacing:0.05em">{label}</div><div style="font-size:26px;font-weight:700;color:{color};font-family:monospace">{val}</div></div>' for label,val,color in [
          ('Open', len(open_cases), '#EF4444'),
          ('Critical', len(critical), '#C0392B'),
          ('Pending', len(pending), '#EAB308'),
          ('Closed Today', len(closed_today), '#22C55E'),
      ])}
    </div>
    <table style="width:100%;border-collapse:collapse">
      <thead>
        <tr style="background:#f3f3f5">
          <th style="padding:8px 10px;text-align:left;font-size:11px;color:#999;font-weight:500">Case #</th>
          <th style="padding:8px 10px;text-align:left;font-size:11px;color:#999;font-weight:500">Title</th>
          <th style="padding:8px 10px;text-align:left;font-size:11px;color:#999;font-weight:500">Severity</th>
          <th style="padding:8px 10px;text-align:left;font-size:11px;color:#999;font-weight:500">Status</th>
          <th style="padding:8px 10px;text-align:left;font-size:11px;color:#999;font-weight:500">Analyst</th>
        </tr>
      </thead>
      <tbody>{cases_html if cases_html else '<tr><td colspan="5" style="padding:16px;text-align:center;color:#999">No active cases</td></tr>'}</tbody>
    </table>
  </div>
  <div style="background:#f8f8fa;padding:14px 28px;font-size:11px;color:#999;text-align:center">
    Generated by AegisTrace SOC Platform · {now} · CONFIDENTIAL
  </div>
</div>
</body></html>"""


def _generate_pdf_for_schedule(cases: list) -> bytes:
    """Generate a summary PDF for scheduled delivery."""
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import ParagraphStyle
        from reportlab.lib.units import cm
        from reportlab.lib import colors
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
        from reportlab.lib.enums import TA_CENTER

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4,
                                rightMargin=2*cm, leftMargin=2*cm,
                                topMargin=2*cm, bottomMargin=2*cm)

        dark  = colors.Color(0.04, 0.03, 0.06)
        red   = colors.Color(0.75, 0.22, 0.17)
        gray  = colors.Color(0.44, 0.44, 0.45)
        light = colors.Color(0.97, 0.97, 0.98)

        def S(name, **kw):
            base = {"fontName": "Helvetica", "fontSize": 9, "textColor": gray, "spaceAfter": 4, "leading": 14}
            base.update(kw)
            return ParagraphStyle(name, **base)

        story = [
            Paragraph("AEGISTRACE SOC PLATFORM", S("brand", fontName="Helvetica-Bold", fontSize=8, textColor=red, spaceAfter=2)),
            Paragraph("SCHEDULED SOC DIGEST REPORT", S("h1", fontName="Helvetica-Bold", fontSize=14, textColor=dark, spaceAfter=6)),
            Paragraph(f"Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}", S("ts")),
            Spacer(1, 0.3*cm),
        ]

        open_cases = [c for c in cases if c.status != "closed"]
        sev_map    = {"critical": 0, "high": 1, "medium": 2, "low": 3, "info": 4}
        open_cases.sort(key=lambda c: sev_map.get(c.severity, 5))

        if open_cases:
            story.append(Paragraph(f"Open Cases ({len(open_cases)})", S("h2", fontName="Helvetica-Bold", fontSize=11, textColor=red, spaceBefore=10)))
            tdata = [["Case #", "Title", "Severity", "Status", "Analyst"]] + [
                [c.case_number, c.title[:50], c.severity.upper(), c.status.replace("_"," ").upper(), c.analyst_name or "—"]
                for c in open_cases[:40]
            ]
            t = Table(tdata, colWidths=[2.8*cm, 8*cm, 2.2*cm, 3*cm, 3*cm])
            t.setStyle(TableStyle([
                ("FONTNAME",  (0,0), (-1,0), "Helvetica-Bold"),
                ("FONTSIZE",  (0,0), (-1,-1), 8),
                ("BACKGROUND",(0,0), (-1,0), dark),
                ("TEXTCOLOR", (0,0), (-1,0), colors.white),
                ("ROWBACKGROUNDS", (0,1), (-1,-1), [light, colors.white]),
                ("GRID",      (0,0), (-1,-1), 0.5, colors.Color(0.85,0.85,0.86)),
                ("PADDING",   (0,0), (-1,-1), 5),
            ]))
            story.append(t)

        story.append(Spacer(1, 0.4*cm))
        story.append(Paragraph(
            f"AegisTrace Automated Digest · {datetime.utcnow().strftime('%Y-%m-%d')} · CONFIDENTIAL",
            S("footer", fontSize=7, textColor=gray, alignment=TA_CENTER)
        ))

        doc.build(story)
        buffer.seek(0)
        return buffer.read()
    except ImportError:
        return b""


# ── Background scheduler ──────────────────────────────────────────────────────

def _compute_next_run(schedule: ReportSchedule) -> datetime:
    now = datetime.utcnow()
    if schedule.schedule_type == "daily":
        candidate = now.replace(hour=schedule.schedule_hour, minute=0, second=0, microsecond=0)
        if candidate <= now:
            candidate += timedelta(days=1)
        return candidate
    elif schedule.schedule_type == "weekly":
        target_dow = schedule.schedule_day or 0  # 0=Monday
        days_ahead = (target_dow - now.weekday()) % 7
        if days_ahead == 0 and now.hour >= schedule.schedule_hour:
            days_ahead = 7
        candidate = (now + timedelta(days=days_ahead)).replace(
            hour=schedule.schedule_hour, minute=0, second=0, microsecond=0)
        return candidate
    else:  # monthly
        target_day = schedule.schedule_day or 1
        candidate = now.replace(day=min(target_day, 28), hour=schedule.schedule_hour, minute=0, second=0, microsecond=0)
        if candidate <= now:
            if now.month == 12:
                candidate = candidate.replace(year=now.year + 1, month=1)
            else:
                candidate = candidate.replace(month=now.month + 1)
        return candidate


def _run_schedule(sched: ReportSchedule):
    """Execute one schedule run — fetch cases, build report, send email."""
    print(f"[report-schedule] Running '{sched.name}' (id={sched.id})")
    try:
        from sqlmodel import Session as S
        with S(engine) as session:
            query = select(Case).where(Case.org_id == sched.org_id)
            if not sched.include_closed:
                query = query.where(Case.status != "closed")
            if sched.report_type == "critical_only":
                query = query.where(Case.severity == "critical")
            cases = session.exec(query.order_by(Case.created_at.desc())).all()

            emails = json.loads(sched.recipient_emails or "[]")
            if not emails:
                print(f"[report-schedule] No recipients for schedule {sched.id}")
                return

            subject  = f"AegisTrace SOC {'Critical Alert' if sched.report_type == 'critical_only' else 'Digest'} — {datetime.utcnow().strftime('%Y-%m-%d')}"
            html     = _build_digest_html(cases, sched.report_type)
            pdf_data = _generate_pdf_for_schedule(cases)

            attachments = [{"filename": f"AegisTrace_Digest_{datetime.utcnow().strftime('%Y%m%d')}.pdf", "data": pdf_data}] if pdf_data else []
            _send_email(emails, subject, html, attachments)

            # Update last/next run
            sched.last_sent_at = datetime.utcnow()
            sched.next_run_at  = _compute_next_run(sched)
            session.add(sched)
            session.commit()
            print(f"[report-schedule] Sent to {emails}. Next run: {sched.next_run_at}")
    except Exception as e:
        print(f"[report-schedule] Error running schedule {sched.id}: {e}")


def _scheduler_loop():
    """Background thread — checks every 60s for due schedules."""
    while True:
        try:
            from sqlmodel import Session as S
            with S(engine) as session:
                now = datetime.utcnow()
                due = session.exec(
                    select(ReportSchedule)
                    .where(ReportSchedule.is_active == True)
                    .where(ReportSchedule.next_run_at <= now)
                ).all()
                for sched in due:
                    threading.Thread(target=_run_schedule, args=(sched,), daemon=True).start()
        except Exception as e:
            print(f"[report-schedule] Scheduler error: {e}")
        time.sleep(60)


def start_scheduler():
    """Call from FastAPI startup to launch the background scheduler thread."""
    t = threading.Thread(target=_scheduler_loop, daemon=True, name="report-scheduler")
    t.start()
    print("[report-schedule] Background scheduler started")


# ═══════════════════════════════════════════════════════════════════════════════
#  CRUD API
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("")
def list_schedules(
    admin: User = Depends(require_admin),
    session: Session = Depends(get_session),
):
    return session.exec(
        select(ReportSchedule).where(ReportSchedule.org_id == admin.org_id)
        .order_by(ReportSchedule.created_at.desc())
    ).all()


@router.post("")
def create_schedule(
    data: dict,
    admin: User = Depends(require_admin),
    session: Session = Depends(get_session),
):
    name   = (data.get("name") or "").strip()
    emails = data.get("recipient_emails", [])
    if not name:
        raise HTTPException(400, "name is required")
    if not emails or not isinstance(emails, list):
        raise HTTPException(400, "recipient_emails must be a non-empty list")

    sched = ReportSchedule(
        name=name,
        recipient_emails=json.dumps(emails),
        schedule_type=data.get("schedule_type", "weekly"),
        schedule_day=data.get("schedule_day", 0),
        schedule_hour=data.get("schedule_hour", 8),
        report_type=data.get("report_type", "digest"),
        include_closed=data.get("include_closed", False),
        org_id=admin.org_id,
        is_active=True,
        created_by=admin.id,
    )
    sched.next_run_at = _compute_next_run(sched)
    session.add(sched)
    session.commit()
    session.refresh(sched)
    return sched


@router.patch("/{sched_id}")
def update_schedule(
    sched_id: int,
    data: dict,
    admin: User = Depends(require_admin),
    session: Session = Depends(get_session),
):
    sched = session.get(ReportSchedule, sched_id)
    if not sched or sched.org_id != admin.org_id:
        raise HTTPException(404)
    for field in ["name", "schedule_type", "schedule_day", "schedule_hour",
                  "report_type", "include_closed", "is_active"]:
        if field in data:
            setattr(sched, field, data[field])
    if "recipient_emails" in data:
        sched.recipient_emails = json.dumps(data["recipient_emails"])
    sched.next_run_at = _compute_next_run(sched)
    session.add(sched)
    session.commit()
    session.refresh(sched)
    return sched


@router.delete("/{sched_id}")
def delete_schedule(
    sched_id: int,
    admin: User = Depends(require_admin),
    session: Session = Depends(get_session),
):
    sched = session.get(ReportSchedule, sched_id)
    if not sched or sched.org_id != admin.org_id:
        raise HTTPException(404)
    session.delete(sched)
    session.commit()
    return {"ok": True}


@router.post("/{sched_id}/send-now")
def send_now(
    sched_id: int,
    admin: User = Depends(require_admin),
    session: Session = Depends(get_session),
):
    """Trigger immediate delivery of a scheduled report (for testing)."""
    sched = session.get(ReportSchedule, sched_id)
    if not sched or sched.org_id != admin.org_id:
        raise HTTPException(404)
    threading.Thread(target=_run_schedule, args=(sched,), daemon=True).start()
    return {"ok": True, "message": f"Report queued for delivery to {json.loads(sched.recipient_emails)}"}


@router.get("/email-config")
def email_config_status(admin: User = Depends(require_admin)):
    """Check which email transport is configured."""
    return {
        "sendgrid":  bool(os.getenv("SENDGRID_API_KEY")),
        "smtp":      bool(os.getenv("SMTP_HOST")),
        "smtp_host": os.getenv("SMTP_HOST", ""),
        "smtp_from": os.getenv("SMTP_FROM", os.getenv("SMTP_USERNAME", "")),
        "configured": bool(os.getenv("SENDGRID_API_KEY") or os.getenv("SMTP_HOST")),
    }
