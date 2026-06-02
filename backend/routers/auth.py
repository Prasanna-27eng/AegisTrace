"""
AegisTrace Authentication
─────────────────────────
Admin credentials (set via env):
  Email : prasanna80564@gmail.com
  PIN   : value of ADMIN_PIN env var  (default: aegis2025)

Admin can add/edit/delete analyst and viewer accounts.
JWT tokens are returned on login and sent as Bearer tokens.
"""
import os, json
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlmodel import Session, select
from models import User, AuditLog
from database import get_session

# ── JWT (pure-Python, no extra deps) ────────────────────────────────────────
import base64, hashlib, hmac

SECRET = os.getenv("JWT_SECRET", "aegistrace-secret-change-me-in-prod-2025")
ALGO   = "HS256"
TTL    = 60 * 60 * 24 * 7  # 7 days


def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def _b64url_decode(s: str) -> bytes:
    pad = 4 - len(s) % 4
    return base64.urlsafe_b64decode(s + "=" * (pad % 4))


def create_token(payload: dict) -> str:
    import time
    payload = {**payload, "exp": int(time.time()) + TTL, "iat": int(time.time())}
    header = _b64url(json.dumps({"alg": ALGO, "typ": "JWT"}).encode())
    body   = _b64url(json.dumps(payload).encode())
    sig    = _b64url(hmac.new(SECRET.encode(), f"{header}.{body}".encode(), hashlib.sha256).digest())
    return f"{header}.{body}.{sig}"


def verify_token(token: str) -> dict:
    import time
    try:
        header, body, sig = token.split(".")
        expected = _b64url(hmac.new(SECRET.encode(), f"{header}.{body}".encode(), hashlib.sha256).digest())
        if not hmac.compare_digest(sig, expected):
            raise ValueError("bad signature")
        payload = json.loads(_b64url_decode(body))
        if payload.get("exp", 0) < time.time():
            raise ValueError("token expired")
        return payload
    except Exception as e:
        raise HTTPException(401, f"Invalid or expired token: {e}")


def hash_password(pw: str) -> str:
    return hashlib.sha256((pw + SECRET).encode()).hexdigest()


# ── Router ────────────────────────────────────────────────────────────────────
router = APIRouter(prefix="/api/auth", tags=["auth"])


def get_current_user(authorization: Optional[str] = Header(None),
                     session: Session = Depends(get_session)) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Authorization header required")
    token = authorization.split(" ", 1)[1]
    payload = verify_token(token)
    user = session.get(User, payload["user_id"])
    if not user or not user.is_active:
        raise HTTPException(401, "User not found or inactive")
    return user


def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != "admin":
        raise HTTPException(403, "Admin role required")
    return user


# ── Ensure admin exists on startup ───────────────────────────────────────────
def ensure_admin(engine):
    from sqlmodel import Session as S
    admin_email = "prasanna80564@gmail.com"
    admin_pin   = os.getenv("ADMIN_PIN", "aegis2025")
    with S(engine) as session:
        existing = session.exec(select(User).where(User.email == admin_email)).first()
        if not existing:
            admin = User(
                email=admin_email,
                name="Prasanna Kumar",
                role="admin",
                is_active=True,
                # Store hashed PIN as password
            )
            session.add(admin)
            session.commit()
            session.refresh(admin)
            # Store hashed pin in a simple way via audit log metadata
            pin_hash = hash_password(admin_pin)
            log = AuditLog(action="admin_created", entity_type="user",
                           entity_id=str(admin.id), new_value=pin_hash)
            session.add(log)
            session.commit()
            print(f"[auth] Admin account created: {admin_email} / PIN: {admin_pin}")


def get_user_pin_hash(user_id: int, session: Session) -> Optional[str]:
    """Retrieve stored password hash from audit log (used for admin) or user metadata."""
    log = session.exec(
        select(AuditLog)
        .where(AuditLog.entity_type == "user", AuditLog.entity_id == str(user_id))
        .order_by(AuditLog.timestamp.desc())
    ).first()
    if log and log.new_value and len(log.new_value) == 64:
        return log.new_value
    return None


# ── Login ────────────────────────────────────────────────────────────────────
@router.post("/login")
def login(data: dict, session: Session = Depends(get_session)):
    email    = (data.get("email") or "").strip().lower()
    password = (data.get("password") or "").strip()

    if not email or not password:
        raise HTTPException(400, "Email and password required")

    user = session.exec(select(User).where(User.email == email)).first()
    if not user:
        raise HTTPException(401, "Invalid credentials")
    if not user.is_active:
        raise HTTPException(401, "Account is inactive")

    # Check password hash stored in audit log
    stored_hash = get_user_pin_hash(user.id, session)
    if not stored_hash:
        raise HTTPException(401, "Account not configured — contact admin")

    provided_hash = hash_password(password)
    if not hmac.compare_digest(provided_hash, stored_hash):
        raise HTTPException(401, "Invalid credentials")

    token = create_token({"user_id": user.id, "email": user.email, "role": user.role, "name": user.name})
    log = AuditLog(action="login", entity_type="user", entity_id=str(user.id))
    session.add(log)
    session.commit()
    return {
        "token": token,
        "user": {"id": user.id, "email": user.email, "name": user.name, "role": user.role}
    }


@router.get("/me")
def me(current_user: User = Depends(get_current_user)):
    return {"id": current_user.id, "email": current_user.email,
            "name": current_user.name, "role": current_user.role}


# ── User management (admin only) ─────────────────────────────────────────────
@router.get("/users")
def list_users(admin: User = Depends(require_admin), session: Session = Depends(get_session)):
    return session.exec(select(User)).all()


@router.post("/users")
def create_user(data: dict, admin: User = Depends(require_admin), session: Session = Depends(get_session)):
    email    = (data.get("email") or "").strip().lower()
    password = (data.get("password") or "").strip()
    name     = (data.get("name") or "").strip()
    role     = data.get("role", "analyst")

    if not email or not password or not name:
        raise HTTPException(400, "email, password, and name are required")
    if role not in ("admin", "analyst", "viewer"):
        raise HTTPException(400, "role must be admin, analyst, or viewer")
    existing = session.exec(select(User).where(User.email == email)).first()
    if existing:
        raise HTTPException(409, "Email already registered")

    user = User(email=email, name=name, role=role, is_active=True)
    session.add(user)
    session.commit()
    session.refresh(user)

    pw_hash = hash_password(password)
    log = AuditLog(action="user_created", entity_type="user",
                   entity_id=str(user.id), new_value=pw_hash)
    session.add(log)
    session.commit()
    return {"id": user.id, "email": user.email, "name": user.name, "role": user.role}


@router.patch("/users/{user_id}")
def update_user(user_id: int, data: dict, admin: User = Depends(require_admin),
                session: Session = Depends(get_session)):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(404)
    if "name" in data:
        user.name = data["name"]
    if "role" in data and data["role"] in ("admin", "analyst", "viewer"):
        user.role = data["role"]
    if "is_active" in data:
        user.is_active = bool(data["is_active"])
    if "password" in data and data["password"]:
        pw_hash = hash_password(data["password"].strip())
        log = AuditLog(action="password_changed", entity_type="user",
                       entity_id=str(user.id), new_value=pw_hash)
        session.add(log)
    session.add(user)
    session.commit()
    session.refresh(user)
    return {"id": user.id, "email": user.email, "name": user.name, "role": user.role, "is_active": user.is_active}


@router.delete("/users/{user_id}")
def delete_user(user_id: int, admin: User = Depends(require_admin), session: Session = Depends(get_session)):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(404)
    if user.role == "admin":
        # Count admins — prevent deleting last admin
        admins = session.exec(select(User).where(User.role == "admin", User.is_active == True)).all()
        if len(admins) <= 1:
            raise HTTPException(400, "Cannot delete the last admin account")
    session.delete(user)
    session.commit()
    return {"ok": True}


@router.post("/change-password")
def change_password(data: dict, current_user: User = Depends(get_current_user),
                    session: Session = Depends(get_session)):
    old_pw = (data.get("old_password") or "").strip()
    new_pw = (data.get("new_password") or "").strip()
    if not old_pw or not new_pw:
        raise HTTPException(400, "Both old and new passwords required")
    stored_hash = get_user_pin_hash(current_user.id, session)
    if not stored_hash or not hmac.compare_digest(hash_password(old_pw), stored_hash):
        raise HTTPException(401, "Current password is incorrect")
    new_hash = hash_password(new_pw)
    log = AuditLog(action="password_changed", entity_type="user",
                   entity_id=str(current_user.id), new_value=new_hash)
    session.add(log)
    session.commit()
    return {"ok": True, "message": "Password changed successfully"}
