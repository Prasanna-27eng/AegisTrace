"""
AegisTrace Webhook Engine
─────────────────────────
Fires HTTP POST to configured URLs when SOC events occur.
Supports Slack-compatible and generic JSON payloads.
Events: case_created | case_closed | case_status_changed | critical_case | malicious_ioc
"""
import json, hashlib, hmac, threading, re
from datetime import datetime
from typing import Optional
import httpx
from urllib.parse import urlparse
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from models import WebhookConfig, AuditLog
from database import get_session
from routers.auth import get_current_user, require_admin
from models import User

router = APIRouter(prefix="/api/webhooks", tags=["webhooks"])

VALID_EVENTS = [
    "case_created", "case_closed", "case_status_changed",
    "critical_case", "malicious_ioc", "all",
]

# SSRF block list — private/internal IP ranges and cloud metadata endpoints
_SSRF_BLOCK = re.compile(
    r"^(localhost|127\.|0\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|"
    r"169\.254\.|::1|fc00:|fe80:|0\.0\.0\.0|metadata\.google\.internal)",
    re.IGNORECASE,
)

_ALLOWED_PORTS = {80, 443, 8080, 8443}   # only standard web ports

def _validate_webhook_url(url: str) -> None:
    """Block SSRF — internal IPs, localhost, cloud metadata endpoints, non-web ports."""
    if not url.startswith(("http://", "https://")):
        raise HTTPException(400, "Webhook URL must start with http:// or https://")
    try:
        parsed = urlparse(url)
        host = parsed.hostname or ""
        port = parsed.port
    except Exception:
        raise HTTPException(400, "Invalid webhook URL")
    if not host:
        raise HTTPException(400, "Invalid webhook URL — no hostname")
    if _SSRF_BLOCK.match(host):
        raise HTTPException(400, "Webhook URL cannot point to internal/private addresses")
    # Block AWS/GCP/Azure metadata endpoints by hostname
    if host in ("169.254.169.254", "metadata.google.internal",
                "169.254.170.2", "fd00:ec2::254"):
        raise HTTPException(400, "Webhook URL cannot point to cloud metadata endpoints")
    # Block non-standard ports — commonly used for SSRF via internal services
    if port is not None and port not in _ALLOWED_PORTS:
        raise HTTPException(400, f"Webhook port {port} not allowed. Use 80, 443, 8080, or 8443")


# ── CRUD ──────────────────────────────────────────────────────────────────────
@router.get("")
def list_webhooks(
    admin: User = Depends(require_admin),
    session: Session = Depends(get_session),
):
    return session.exec(select(WebhookConfig).order_by(WebhookConfig.created_at.desc())).all()


@router.post("")
def create_webhook(
    data: dict,
    admin: User = Depends(require_admin),
    session: Session = Depends(get_session),
):
    name   = (data.get("name") or "").strip()
    url    = (data.get("url") or "").strip()
    events = data.get("events", ["all"])
    if not name or not url:
        raise HTTPException(400, "name and url are required")
    _validate_webhook_url(url)
    invalid = [e for e in events if e not in VALID_EVENTS]
    if invalid:
        raise HTTPException(400, f"Invalid events: {invalid}. Valid: {VALID_EVENTS}")
    wh = WebhookConfig(
        name=name, url=url,
        events=json.dumps(events),
        secret=data.get("secret"),
        is_active=True,
    )
    session.add(wh)
    session.commit()
    session.refresh(wh)
    return wh


@router.patch("/{wh_id}")
def update_webhook(
    wh_id: int, data: dict,
    admin: User = Depends(require_admin),
    session: Session = Depends(get_session),
):
    wh = session.get(WebhookConfig, wh_id)
    if not wh:
        raise HTTPException(404)
    if "name" in data:
        wh.name = data["name"]
    if "url" in data:
        _validate_webhook_url(data["url"])
        wh.url = data["url"]
    if "events" in data:
        wh.events = json.dumps(data["events"])
    if "secret" in data:
        wh.secret = data["secret"]
    if "is_active" in data:
        wh.is_active = bool(data["is_active"])
    session.add(wh)
    session.commit()
    session.refresh(wh)
    return wh


@router.delete("/{wh_id}")
def delete_webhook(
    wh_id: int,
    admin: User = Depends(require_admin),
    session: Session = Depends(get_session),
):
    wh = session.get(WebhookConfig, wh_id)
    if not wh:
        raise HTTPException(404)
    session.delete(wh)
    session.commit()
    return {"ok": True}


@router.post("/{wh_id}/test")
def test_webhook(
    wh_id: int,
    admin: User = Depends(require_admin),
    session: Session = Depends(get_session),
):
    wh = session.get(WebhookConfig, wh_id)
    if not wh:
        raise HTTPException(404)
    payload = {
        "event": "test",
        "source": "AegisTrace",
        "timestamp": datetime.utcnow().isoformat(),
        "message": f"Test webhook from AegisTrace — {wh.name}",
        "case": {
            "case_number": "SOC-TEST-0001",
            "title": "Test Alert",
            "severity": "low",
        }
    }
    status_code = _send_webhook(wh, payload)
    # Update last_status_code
    wh.last_fired_at    = datetime.utcnow()
    wh.last_status_code = status_code
    session.add(wh)
    session.commit()
    return {"status_code": status_code, "ok": 200 <= (status_code or 0) < 300}


# ── Event firing (called from other routers) ──────────────────────────────────
def fire_event(event: str, payload: dict):
    """
    Fire webhooks for an event. Runs in a background thread so it doesn't
    block the request. Import this from other routers.
    """
    def _fire():
        try:
            from database import engine
            from sqlmodel import Session as S
            with S(engine) as session:
                hooks = session.exec(
                    select(WebhookConfig).where(WebhookConfig.is_active == True)
                ).all()
                for wh in hooks:
                    events = json.loads(wh.events or "[]")
                    if "all" in events or event in events:
                        body = {
                            "event": event,
                            "source": "AegisTrace",
                            "timestamp": datetime.utcnow().isoformat(),
                            **payload,
                        }
                        code = _send_webhook(wh, body)
                        wh.last_fired_at    = datetime.utcnow()
                        wh.last_status_code = code
                        session.add(wh)
                session.commit()
        except Exception as e:
            print(f"[webhook] Error firing {event}: {e}")

    t = threading.Thread(target=_fire, daemon=True)
    t.start()


def _send_webhook(wh: WebhookConfig, payload: dict) -> Optional[int]:
    """Send payload to webhook URL. Returns HTTP status code."""
    try:
        body = json.dumps(payload)
        headers = {"Content-Type": "application/json", "X-AegisTrace-Event": payload.get("event", "")}

        # HMAC signature if secret configured
        if wh.secret:
            sig = hmac.new(wh.secret.encode(), body.encode(), hashlib.sha256).hexdigest()
            headers["X-AegisTrace-Signature"] = f"sha256={sig}"

        # Detect Slack-compatible URL (send Slack block format)
        if "hooks.slack.com" in wh.url or "slack.com" in wh.url:
            sev_emoji = {"critical": "🔴", "high": "🟠", "medium": "🟡", "low": "🟢"}.get(
                payload.get("severity", ""), "⚪"
            )
            body = json.dumps({"text": (
                f"{sev_emoji} *AegisTrace* — `{payload.get('event','').upper()}`\n"
                f"*{payload.get('title', payload.get('message', 'Event'))}*\n"
                f"Case: `{payload.get('case_number', 'N/A')}`  |  "
                f"Severity: `{payload.get('severity', 'N/A').upper()}`"
            )})

        with httpx.Client(timeout=8) as client:
            resp = client.post(wh.url, content=body, headers=headers)
            return resp.status_code
    except Exception as e:
        print(f"[webhook] Failed to send to {wh.url}: {e}")
        return None
