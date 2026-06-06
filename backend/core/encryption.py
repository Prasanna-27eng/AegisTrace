"""
AegisTrace Field Encryption — v5.4
───────────────────��────────────────
Fernet symmetric encryption for sensitive database fields.
Used for: connector API tokens, OAuth credentials, secrets at rest.

Key derivation:
  1. Use FERNET_KEY env var if explicitly set (base64url-encoded 32-byte key)
  2. Derive from JWT_SECRET via HKDF if FERNET_KEY not set
     (changing JWT_SECRET will invalidate all encrypted fields — set FERNET_KEY explicitly)

Usage:
    from core.encryption import enc

    stored  = enc.encrypt("my_api_token")   # → encrypted string for DB
    plain   = enc.decrypt(stored)           # → "my_api_token"
    plain   = enc.decrypt(None)             # → None (safe for optional fields)
"""

import os
import base64
import hashlib
import logging

logger = logging.getLogger("aegistrace.encryption")

# ── Key setup ──────────────────────────────────────��──────────────────────────
def _build_fernet_key() -> bytes:
    """
    Build a 32-byte Fernet key.
    Priority: FERNET_KEY env var → derive from JWT_SECRET.
    """
    raw = os.getenv("FERNET_KEY", "")
    if raw:
        try:
            key = base64.urlsafe_b64decode(raw + "==")
            if len(key) == 32:
                return base64.urlsafe_b64encode(key)
        except Exception:
            pass
        logger.warning("[encryption] FERNET_KEY env var is set but invalid. Deriving from JWT_SECRET instead.")

    # Derive 32-byte key from JWT_SECRET via SHA-256
    secret = os.getenv("JWT_SECRET", "aegistrace-secret-change-me-2025")
    if secret in ("aegistrace-secret-change-me-2025", ""):
        logger.warning(
            "[SECURITY] Encryption key is derived from default JWT_SECRET. "
            "Set FERNET_KEY env var to a random base64url-encoded 32-byte key."
        )
    derived = hashlib.sha256(f"fernet-key-v1:{secret}".encode()).digest()
    return base64.urlsafe_b64encode(derived)


class FieldEncryption:
    """Fernet encryption/decryption for individual database field values."""

    def __init__(self):
        self._key = None   # lazy init — don't import cryptography at module load

    def _get_fernet(self):
        if self._key is None:
            from cryptography.fernet import Fernet
            self._key = Fernet(_build_fernet_key())
        return self._key

    def encrypt(self, plaintext: str) -> str:
        """Encrypt a string. Returns base64-encoded ciphertext string for DB storage."""
        if not plaintext:
            return plaintext
        try:
            f = self._get_fernet()
            return f.encrypt(plaintext.encode()).decode()
        except Exception as e:
            logger.error(f"[encryption] encrypt failed: {e}")
            raise

    def decrypt(self, ciphertext: str) -> str:
        """Decrypt a stored ciphertext string. Returns plaintext. None-safe."""
        if not ciphertext:
            return ciphertext
        try:
            f = self._get_fernet()
            return f.decrypt(ciphertext.encode()).decode()
        except Exception as e:
            # If decryption fails, the value might be a legacy plaintext (pre-v5.4)
            # Return it as-is so existing connectors don't break on upgrade
            logger.warning(f"[encryption] decrypt failed (returning raw — may be legacy plaintext): {e}")
            return ciphertext

    def is_encrypted(self, value: str) -> bool:
        """Heuristic check — Fernet tokens start with 'gAAAAA'"""
        return bool(value and value.startswith("gAAAAA"))


# ── Singleton ────────────────────���───────────────────────��────────────────────
enc = FieldEncryption()
