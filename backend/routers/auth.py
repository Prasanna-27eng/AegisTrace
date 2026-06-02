"""
AegisTrace Authentication
─────────────────────────
Passwords stored in User.hashed_password (SHA-256 + secret).
JWT tokens — 7-day expiry, pure Python (no extra deps).
Admin: prasanna80564@gmail.com / ADMIN_PIN env var (default: aegis2025)
"""
import os, json, hashlib, hmac, base64
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Header, Request
from sqlmodel import Session, select
from models import User, AuditLog
from database import get_session

SECRET = os.getenv("JWT_SECRET", "aegistrace-secret-change-me-2025")
TTL    = 60 * 60 * 24 * 7   # 7 days


# ── JWT helpers ───────────────────────────────────────────────────────────────
def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()

def _unb64(s: str) -> bytes:
    return base64.urlsafe_b64decode(s + "=" * (4 - len(s) % 4))

def hash_password(pw: str) -> str:
    return hashlib.sha256((pw + SECRET).encode()).hexdigest()

def create_token(payload: dict) -> str:
    import time
    p = {**payload, "exp": int(time.time()) + TTL, "iat": int(time.time())}
    h = _b64(json.dumps({"alg": "HS256", "typ": "JWT"}).encode())
    b = _b64(json.dumps(p).encode())
    s = _b64(hmac.new(SECRET.encode(), f"{h}.{b}".encode(), hashlib.sha256).digest())
    return f"{h}.{b}.{s}"

def verify_token(token: str) -> dict:
    import time
    try:
        h, b, s = token.split(".")
        expected = _b64(hmac.new(SECRET.encode(), f"{h}.{b}".encode(), hashlib.sha256).digest())
        if not hmac.compare_digest(s, expected):
            raise ValueError("bad signature")
        p = json.loads(_unb64(b))
        if p.get("exp", 0) < time.time():
            raise ValueError("token expired")
        return p
    except Exception as e:
        raise HTTPException(401, f"Invalid or expired token: {e}")


# ── Dependencies ──────────────────────────────────────────────────────────────
def get_current_user(
    authorization: Optional[str] = Header(None),
    session: Session = Depends(get_session),
) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Authorization header required")
    payload = verify_token(authorization.split(" ", 1)[1])
    user = session.get(User, payload["user_id"])
    if not user or not user.is_active:
        raise HTTPException(401, "User not found or inactive")
    return user

def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != "admin":
        raise HTTPException(403, "Admin access required")
    return user


# ── Audit helper ──────────────────────────────────────────────────────────────
def _audit(session: Session, action: str, entity_type: str, entity_id: str,
           user_id: int = None, user_email: str = None, new_value: str = None):
    session.add(AuditLog(
        user_id=user_id, user_email=user_email,
        action=action, entity_type=entity_type,
        entity_id=entity_id, new_value=new_value,
    ))


# ── Startup: ensure admin exists ──────────────────────────────────────────────
def ensure_admin(engine):
    from sqlmodel import Session as S
    email = "prasanna80564@gmail.com"
    pin   = os.getenv("ADMIN_PIN", "aegis2025")
    with S(engine) as session:
        admin = session.exec(select(User).where(User.email == email)).first()
        pw_hash = hash_password(pin)
        if not admin:
            admin = User(email=email, name="Prasanna Kumar", role="admin",
                         is_active=True, hashed_password=pw_hash)
            session.add(admin)
            session.commit()
            print(f"[auth] Admin created: {email}")
        else:
            # Always sync password hash from ADMIN_PIN on startup
            admin.hashed_password = pw_hash
            session.add(admin)
            session.commit()
            print(f"[auth] Admin password synced: {email}")


# ── Router ────────────────────────────────────────────────────────────────────
router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login")
def login(data: dict, session: Session = Depends(get_session)):
    email    = (data.get("email") or "").strip().lower()
    password = (data.get("password") or "").strip()
    if not email or not password:
        raise HTTPException(400, "Email and password required")

    user = session.exec(select(User).where(User.email == email)).first()
    if not user or not user.is_active:
        raise HTTPException(401, "Invalid credentials")

    stored = user.hashed_password
    # Fallback: check legacy AuditLog if column is empty (one-time migration window)
    if not stored:
        logs = session.exec(
            select(AuditLog)
            .where(AuditLog.entity_type == "user_pw")
            .where(AuditLog.entity_id == str(user.id))
            .order_by(AuditLog.timestamp.desc())
        ).all()
        for log in logs:
            if log.new_value and len(log.new_value) == 64:
                stored = log.new_value
                user.hashed_password = stored
                session.add(user)
                session.commit()
                break

    if not stored or not hmac.compare_digest(hash_password(password), stored):
        raise HTTPException(401, "Invalid credentials")

    token = create_token({
        "user_id": user.id, "email": user.email,
        "role": user.role, "name": user.name
    })
    _audit(session, "login", "user", str(user.id), user.id, user.email)
    session.commit()
    return {"token": token, "user": {
        "id": user.id, "email": user.email,
        "name": user.name, "role": user.role
    }}


@router.get("/me")
def me(user: User = Depends(get_current_user)):
    return {"id": user.id, "email": user.email, "name": user.name, "role": user.role}


# ── User management (admin only) ──────────────────────────────────────────────
@router.get("/users")
def list_users(admin: User = Depends(require_admin), session: Session = Depends(get_session)):
    users = session.exec(select(User)).all()
    return [{"id": u.id, "email": u.email, "name": u.name,
             "role": u.role, "is_active": u.is_active,
             "created_at": u.created_at} for u in users]


@router.post("/users")
def create_user(data: dict, admin: User = Depends(require_admin),
                session: Session = Depends(get_session)):
    email    = (data.get("email") or "").strip().lower()
    password = (data.get("password") or "").strip()
    name     = (data.get("name") or "").strip()
    role     = data.get("role", "analyst")
    if not email or not password or not name:
        raise HTTPException(400, "email, password, and name required")
    if role not in ("admin", "analyst", "viewer"):
        raise HTTPException(400, "Invalid role")
    if session.exec(select(User).where(User.email == email)).first():
        raise HTTPException(409, "Email already registered")

    user = User(email=email, name=name, role=role,
                is_active=True, hashed_password=hash_password(password))
    session.add(user)
    session.commit()
    session.refresh(user)
    _audit(session, "user_created", "user", str(user.id),
           admin.id, admin.email, f"Created {role}: {email}")
    session.commit()
    return {"id": user.id, "email": user.email, "name": user.name,
            "role": user.role, "is_active": user.is_active}


@router.patch("/users/{user_id}")
def update_user(user_id: int, data: dict, admin: User = Depends(require_admin),
                session: Session = Depends(get_session)):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(404, "User not found")
    if "name" in data:
        user.name = data["name"]
    if "role" in data and data["role"] in ("admin", "analyst", "viewer"):
        user.role = data["role"]
    if "is_active" in data:
        user.is_active = bool(data["is_active"])
    if "password" in data and data["password"]:
        user.hashed_password = hash_password(data["password"].strip())
    session.add(user)
    session.commit()
    session.refresh(user)
    _audit(session, "user_updated", "user", str(user.id), admin.id, admin.email)
    session.commit()
    return {"id": user.id, "email": user.email, "name": user.name,
            "role": user.role, "is_active": user.is_active}


@router.delete("/users/{user_id}")
def delete_user(user_id: int, admin: User = Depends(require_admin),
                session: Session = Depends(get_session)):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(404, "User not found")
    if user.role == "admin":
        count = len(session.exec(
            select(User).where(User.role == "admin", User.is_active == True)
        ).all())
        if count <= 1:
            raise HTTPException(400, "Cannot delete the last admin")
    _audit(session, "user_deleted", "user", str(user.id),
           admin.id, admin.email, user.email)
    session.delete(user)
    session.commit()
    return {"ok": True}


@router.post("/change-password")
def change_password(data: dict, user: User = Depends(get_current_user),
                    session: Session = Depends(get_session)):
    old_pw = (data.get("old_password") or "").strip()
    new_pw = (data.get("new_password") or "").strip()
    if not old_pw or not new_pw:
        raise HTTPException(400, "Both passwords required")
    if not user.hashed_password or not hmac.compare_digest(
            hash_password(old_pw), user.hashed_password):
        raise HTTPException(401, "Current password is incorrect")
    user.hashed_password = hash_password(new_pw)
    session.add(user)
    _audit(session, "password_changed", "user", str(user.id), user.id, user.email)
    session.commit()
    return {"ok": True}
