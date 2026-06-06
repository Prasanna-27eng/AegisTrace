"""
AegisTrace Authentication — v5.4
──────────────────────────────────
Passwords: bcrypt (transparent upgrade from SHA-256 on first login).
JWT tokens — python-jose HS256, 7-day expiry, server-side invalidation.
Progressive lockout: 5 fails→60s, 10 fails→15min, 20 fails→1hr.
Admin 2FA enforcement: admin accounts without 2FA are blocked after login.
Admin: prasanna80564@gmail.com / ADMIN_PIN env var (default: aegis2025)
"""
import os, json, hashlib, hmac, time, uuid
from datetime import datetime, timedelta
from collections import defaultdict
from typing import Optional
import bcrypt
import pyotp
from jose import jwt, JWTError
from fastapi import APIRouter, Depends, HTTPException, Header, Request
from sqlmodel import Session, select
from models import User, AuditLog, TokenBlocklist
from database import get_session

# ── Brute-force + progressive lockout ────────────────────────────────────────
_login_attempts: dict = defaultdict(list)   # ip → [timestamps]
_mfa_attempts:   dict = defaultdict(list)
_lockouts:       dict = {}                  # ip → unlock_timestamp
LOGIN_RATE_LIMIT = 10
MFA_RATE_LIMIT   = 5

# Progressive lockout thresholds: (fail_count, lockout_seconds)
_LOCKOUT_STEPS = [(5, 60), (10, 900), (20, 3600)]   # 1min, 15min, 1hr

def _check_lockout(ip: str) -> None:
    """Raise 429 if IP is in lockout period."""
    unlock_at = _lockouts.get(ip, 0)
    if time.time() < unlock_at:
        remaining = int(unlock_at - time.time())
        raise HTTPException(429, f"Too many failed attempts. Try again in {remaining}s.")

def _record_failure(ip: str) -> None:
    """Record a failed login attempt and apply progressive lockout if threshold crossed."""
    now = time.time()
    _login_attempts[ip] = [t for t in _login_attempts[ip] if now - t < 3600]
    _login_attempts[ip].append(now)
    count = len(_login_attempts[ip])
    for threshold, duration in reversed(_LOCKOUT_STEPS):
        if count >= threshold:
            _lockouts[ip] = now + duration
            break

def _clear_failures(ip: str) -> None:
    """Clear failed attempts on successful login."""
    _login_attempts[ip] = []
    _lockouts.pop(ip, None)

SECRET    = os.getenv("JWT_SECRET", "aegistrace-secret-change-me-2025")
ALGORITHM = "HS256"
TTL       = 60 * 60 * 24 * 7   # 7 days


def _get_real_ip(request: Request) -> str:
    """Extract the real client IP, respecting X-Forwarded-For from Render/proxy."""
    forwarded = request.headers.get("X-Forwarded-For", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return getattr(request.client, "host", "unknown")


# ── JWT helpers — python-jose (replaces custom implementation in v5.4) ─────────
def hash_password(pw: str) -> str:
    """Returns bcrypt hash. Used for new passwords and upgrades."""
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt(12)).decode()


def verify_password(pw: str, stored: str) -> bool:
    """
    Verify password against stored hash.
    Handles both bcrypt (new) and SHA-256 (legacy) hashes transparently.
    SHA-256 hashes are exactly 64 hex chars; bcrypt hashes start with '$2'.
    """
    if not stored:
        return False
    if stored.startswith("$2"):
        # bcrypt hash
        return bcrypt.checkpw(pw.encode(), stored.encode())
    # Legacy SHA-256 hash — verify then caller should upgrade
    legacy = hashlib.sha256((pw + SECRET).encode()).hexdigest()
    return hmac.compare_digest(legacy, stored)


def create_token(payload: dict, ttl: int = TTL) -> str:
    """Create a signed JWT using python-jose HS256."""
    jti  = str(uuid.uuid4())
    now  = datetime.utcnow()
    data = {
        **payload,
        "exp": now + timedelta(seconds=ttl),
        "iat": now,
        "jti": jti,
    }
    return jwt.encode(data, SECRET, algorithm=ALGORITHM)


def verify_token(token: str, session: Session = None) -> dict:
    """Verify JWT signature, expiry, and server-side revocation."""
    try:
        payload = jwt.decode(token, SECRET, algorithms=[ALGORITHM])
    except JWTError as e:
        raise HTTPException(401, f"Invalid or expired token: {e}")

    # Server-side invalidation (logout / forced expiry)
    if session and payload.get("jti"):
        blocked = session.exec(
            select(TokenBlocklist).where(TokenBlocklist.token_jti == payload["jti"])
        ).first()
        if blocked:
            raise HTTPException(401, "Token has been revoked. Please log in again.")
    return payload


# ── Session UA fingerprinting ─────────────────────────────────────────────────
def _ua_hash(request: Optional[Request]) -> Optional[str]:
    """
    Returns a short SHA-256 hash of the User-Agent header only.
    Accept-Language intentionally excluded — Render's proxy layer can strip/modify it,
    causing false positives for legitimate users.
    Returns None if no request context or UA is absent (e.g. server-to-server).
    """
    if not request:
        return None
    ua = request.headers.get("user-agent", "")
    if not ua:
        return None
    return hashlib.sha256(ua.encode()).hexdigest()[:16]   # 16-char prefix is sufficient


def _log_ua_mismatch(session: Session, user_id: int, user_email: str,
                     stored_hash: str, current_hash: str) -> None:
    """
    Silently log a UA mismatch as a token_theft ITDR event.
    Does NOT block the request — detection only.
    Mismatches are common on legitimate browser updates; blocking would cause lockouts.
    """
    try:
        session.add(AuditLog(
            user_id=user_id, user_email=user_email,
            action="session_ua_mismatch",
            entity_type="user",
            entity_id=str(user_id),
            new_value=json.dumps({
                "stored_ua_hash": stored_hash,
                "current_ua_hash": current_hash,
                "note": "UA fingerprint changed — possible session hijack or browser update",
            }),
        ))
        # Non-blocking commit in a nested try so a DB error doesn't affect the request
        session.commit()
    except Exception:
        pass


# ── Dependencies ──────────────────────────────────────────────────────────────
def get_current_user(
    authorization: Optional[str] = Header(None),
    request: Request = None,
    session: Session = Depends(get_session),
) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Authorization header required")
    payload = verify_token(authorization.split(" ", 1)[1], session)
    user = session.get(User, payload["user_id"])
    if not user or not user.is_active:
        raise HTTPException(401, "User not found or inactive")

    # ── UA fingerprint mismatch detection (non-blocking ITDR signal) ───────────
    stored_ua = payload.get("ua_hash")
    if stored_ua and request:
        current_ua = _ua_hash(request)
        if current_ua and stored_ua != current_ua:
            _log_ua_mismatch(session, user.id, user.email, stored_ua, current_ua)

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
            # Re-hash if still using legacy SHA-256
            if admin.hashed_password and not admin.hashed_password.startswith("$2"):
                admin.hashed_password = pw_hash
                session.add(admin)
                session.commit()
                print(f"[auth] Admin password upgraded to bcrypt: {email}")
            else:
                print(f"[auth] Admin password OK: {email}")


# ── Nightly cleanup of expired blocklist entries ──────────────────────────────
def cleanup_token_blocklist(engine):
    from sqlmodel import Session as S
    with S(engine) as session:
        now = datetime.utcnow()
        expired = session.exec(
            select(TokenBlocklist).where(TokenBlocklist.expires_at < now)
        ).all()
        for entry in expired:
            session.delete(entry)
        session.commit()
        if expired:
            print(f"[auth] Cleaned up {len(expired)} expired blocklist entries")


# ── Router ────────────────────────────────────────────────────────────────────
router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login")
def login(data: dict, request: Request, session: Session = Depends(get_session)):
    ip = _get_real_ip(request)

    # Progressive lockout check
    _check_lockout(ip)

    email    = (data.get("email") or "").strip().lower()
    password = (data.get("password") or "").strip()
    if not email or not password:
        raise HTTPException(400, "Email and password required")

    user = session.exec(select(User).where(User.email == email)).first()
    if not user or not user.is_active:
        _record_failure(ip)
        raise HTTPException(401, "Invalid credentials")

    stored = user.hashed_password
    if not stored or not verify_password(password, stored):
        _record_failure(ip)
        raise HTTPException(401, "Invalid credentials")

    # Transparent upgrade: if legacy SHA-256, upgrade to bcrypt on successful login
    if stored and not stored.startswith("$2"):
        user.hashed_password = hash_password(password)
        session.add(user)
        session.commit()

    # Clear lockout on successful credential verification
    _clear_failures(ip)

    # ── MFA gate: if user has 2FA enabled, issue a short-lived pending token ──
    if user.mfa_enabled and user.mfa_secret:
        pending = create_token({
            "user_id": user.id, "type": "mfa_pending",
        }, ttl=300)   # 5 minutes
        return {"mfa_required": True, "pending_token": pending}

    # ── Enforce 2FA for admin accounts ────────────────────────────────────────
    # Admins without 2FA enabled are given a grace token that forces setup.
    # They can view the dashboard but the frontend redirects them to /app/admin#mfa.
    if user.role == "admin" and not user.mfa_enabled:
        ua = _ua_hash(request)
        token = create_token({
            "user_id": user.id, "email": user.email,
            "role": user.role, "name": user.name,
            "mfa_setup_required": True,   # frontend reads this flag
            **({"ua_hash": ua} if ua else {}),
        })
        _audit(session, "login_admin_no_mfa", "user", str(user.id), user.id, user.email,
               "Admin logged in without 2FA — setup required")
        session.commit()
        return {
            "token": token,
            "mfa_setup_required": True,   # signal to frontend
            "user": {"id": user.id, "email": user.email, "name": user.name, "role": user.role},
        }

    ua = _ua_hash(request)
    token = create_token({
        "user_id": user.id, "email": user.email,
        "role": user.role, "name": user.name,
        **({"ua_hash": ua} if ua else {}),
    })
    _audit(session, "login", "user", str(user.id), user.id, user.email)
    session.commit()
    return {"token": token, "user": {
        "id": user.id, "email": user.email,
        "name": user.name, "role": user.role
    }}


@router.post("/logout")
def logout(
    authorization: Optional[str] = Header(None),
    session: Session = Depends(get_session),
):
    """Invalidate the current token server-side."""
    if not authorization or not authorization.startswith("Bearer "):
        return {"ok": True}
    token = authorization.split(" ", 1)[1]
    try:
        # Decode without verification to extract jti/exp (signature already verified by middleware)
        payload = jwt.decode(token, SECRET, algorithms=[ALGORITHM])
        jti = payload.get("jti")
        exp = payload.get("exp")
        if jti:
            expires_at = datetime.utcfromtimestamp(exp) if exp else datetime.utcnow()
            session.add(TokenBlocklist(
                token_jti=jti,
                blocked_at=datetime.utcnow(),
                expires_at=expires_at,
                user_id=payload.get("user_id"),
            ))
            session.commit()
    except Exception:
        pass
    return {"ok": True}


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
    if len(password) < 8:
        raise HTTPException(400, "Password must be at least 8 characters")
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
    if len(new_pw) < 8:
        raise HTTPException(400, "New password must be at least 8 characters")
    if not user.hashed_password or not verify_password(old_pw, user.hashed_password):
        raise HTTPException(401, "Current password is incorrect")
    user.hashed_password = hash_password(new_pw)
    session.add(user)
    _audit(session, "password_changed", "user", str(user.id), user.id, user.email)
    session.commit()
    return {"ok": True}


# ══════════════════════════════════════════════════════════════════════════════
# 2FA / TOTP  (v5.1)
# Flow:
#   Setup:  POST /mfa/setup  → returns secret + otpauth URI
#   Enable: POST /mfa/verify → verifies first code, sets mfa_enabled=True
#   Login:  POST /login returns {mfa_required, pending_token} when enabled
#           POST /login/mfa verifies code + pending_token → issues real JWT
#   Remove: POST /mfa/disable → disables (requires current TOTP code)
# ══════════════════════════════════════════════════════════════════════════════

@router.post("/mfa/setup")
def mfa_setup(user: User = Depends(get_current_user),
              session: Session = Depends(get_session)):
    """
    Generate a new TOTP secret for the current user.
    Returns the secret and an otpauth:// URI for any authenticator app.
    Does NOT enable MFA yet — user must verify a code first via /mfa/verify.
    """
    secret = pyotp.random_base32()
    # Store the pending secret (not yet active — mfa_enabled stays False)
    user.mfa_secret = secret
    session.add(user)
    session.commit()

    issuer = "AegisTrace"
    label  = user.email.replace(" ", "_")
    uri    = pyotp.totp.TOTP(secret).provisioning_uri(name=label, issuer_name=issuer)

    return {
        "secret": secret,
        "otpauth_uri": uri,
        "issuer": issuer,
        "account": label,
        "instructions": (
            "Scan the QR code in your authenticator app (Google Authenticator, "
            "Authy, etc.) or enter the secret manually. Then call POST /api/auth/mfa/verify "
            "with a valid TOTP code to activate 2FA."
        ),
    }


@router.post("/mfa/verify")
def mfa_verify(data: dict,
               user: User = Depends(get_current_user),
               session: Session = Depends(get_session)):
    """
    Verify the first TOTP code and activate 2FA for this user.
    Body: {code: "123456"}
    """
    code = str(data.get("code", "")).strip()
    if not code:
        raise HTTPException(400, "TOTP code required")
    if not user.mfa_secret:
        raise HTTPException(400, "Run /mfa/setup first to generate a secret")

    totp = pyotp.TOTP(user.mfa_secret)
    if not totp.verify(code, valid_window=1):   # ±30 s drift tolerance
        raise HTTPException(401, "Invalid or expired TOTP code")

    user.mfa_enabled = True
    session.add(user)
    _audit(session, "mfa_enabled", "user", str(user.id), user.id, user.email)
    session.commit()
    return {"ok": True, "message": "Two-factor authentication is now active on your account."}


@router.post("/login/mfa")
def login_mfa(data: dict, request: Request, session: Session = Depends(get_session)):
    """
    Second step of MFA login.
    Body: {pending_token: str, code: str}
    Verifies pending_token (type=mfa_pending), checks TOTP code, issues full JWT.
    """
    # Rate limit MFA attempts per IP
    ip  = _get_real_ip(request)
    now = time.time()
    _mfa_attempts[ip] = [t for t in _mfa_attempts[ip] if now - t < 60]
    if len(_mfa_attempts[ip]) >= MFA_RATE_LIMIT:
        raise HTTPException(429, "Too many MFA attempts. Try again in a minute.")
    _mfa_attempts[ip].append(now)

    pending_token = (data.get("pending_token") or "").strip()
    code          = str(data.get("code") or "").strip()
    if not pending_token or not code:
        raise HTTPException(400, "pending_token and code required")

    # Decode and validate the pending token using python-jose
    try:
        payload = jwt.decode(pending_token, SECRET, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(401, "Invalid or expired MFA session — please log in again")

    if payload.get("type") != "mfa_pending":
        raise HTTPException(401, "Not a valid MFA pending token")

    user_id = payload.get("user_id")
    user = session.get(User, user_id)
    if not user or not user.is_active or not user.mfa_enabled or not user.mfa_secret:
        raise HTTPException(401, "Invalid session")

    totp = pyotp.TOTP(user.mfa_secret)
    if not totp.verify(code, valid_window=1):
        raise HTTPException(401, "Invalid or expired TOTP code")

    # Invalidate the pending token so it cannot be replayed
    pending_jti = payload.get("jti")
    pending_exp = payload.get("exp", 0)
    if pending_jti:
        session.add(TokenBlocklist(
            token_jti=pending_jti,
            blocked_at=datetime.utcnow(),
            expires_at=datetime.utcfromtimestamp(pending_exp),
            user_id=user.id,
        ))

    ua = _ua_hash(request)
    token = create_token({
        "user_id": user.id, "email": user.email,
        "role": user.role, "name": user.name,
        **({"ua_hash": ua} if ua else {}),
    })
    _audit(session, "login_mfa", "user", str(user.id), user.id, user.email)
    session.commit()
    return {"token": token, "user": {
        "id": user.id, "email": user.email,
        "name": user.name, "role": user.role,
    }}


@router.post("/mfa/disable")
def mfa_disable(data: dict,
                user: User = Depends(get_current_user),
                session: Session = Depends(get_session)):
    """
    Disable 2FA. Requires the current TOTP code as confirmation.
    Body: {code: "123456"}
    """
    code = str(data.get("code", "")).strip()
    if not code:
        raise HTTPException(400, "TOTP code required to disable 2FA")
    if not user.mfa_enabled or not user.mfa_secret:
        raise HTTPException(400, "2FA is not currently enabled on this account")

    totp = pyotp.TOTP(user.mfa_secret)
    if not totp.verify(code, valid_window=1):
        raise HTTPException(401, "Invalid TOTP code — cannot disable 2FA")

    user.mfa_enabled = False
    user.mfa_secret  = None
    session.add(user)
    _audit(session, "mfa_disabled", "user", str(user.id), user.id, user.email)
    session.commit()
    return {"ok": True, "message": "Two-factor authentication has been disabled."}


@router.get("/mfa/status")
def mfa_status(user: User = Depends(get_current_user)):
    """Return whether 2FA is currently active for the authenticated user."""
    return {"mfa_enabled": user.mfa_enabled, "email": user.email}
