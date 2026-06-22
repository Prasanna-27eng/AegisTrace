"""
AegisTrace Secure File Store — v10.3
──────────────────────────────────────
ChaCha20-Poly1305 authenticated encryption for every stored file.
Key derived from FERNET_KEY env var (already used by encryption.py) via HKDF-SHA256.
Storage path: /var/data/files/{uuid}.enc
Metadata stored as JSON alongside: /var/data/files/{uuid}.meta.json
"""
import os
import json
import uuid
import hashlib
from datetime import datetime
from pathlib import Path

try:
    from cryptography.hazmat.primitives.ciphers.aead import ChaCha20Poly1305
    from cryptography.hazmat.primitives.kdf.hkdf import HKDF
    from cryptography.hazmat.primitives import hashes
    _CRYPTO_AVAILABLE = True
except ImportError:
    _CRYPTO_AVAILABLE = False

STORE_DIR = Path(os.getenv("FILE_STORE_DIR", "/var/data/files"))
FERNET_KEY = os.getenv("FERNET_KEY", "")


def _derive_file_key() -> bytes:
    """Derive a 32-byte ChaCha20 key from FERNET_KEY via HKDF-SHA256."""
    if not FERNET_KEY:
        # Fallback: use a fixed dev key (not production-safe)
        return hashlib.sha256(b"aegistrace-dev-filestore-key").digest()
    hkdf = HKDF(
        algorithm=hashes.SHA256(),
        length=32,
        salt=b"aegistrace-filestore-v1",
        info=b"file-encryption-key",
    )
    return hkdf.derive(FERNET_KEY.encode()[:32].ljust(32, b"\x00"))


class SecureFileStore:
    """
    Store and retrieve files with ChaCha20-Poly1305 encryption.
    Falls back to plaintext if cryptography is unavailable (dev environments).
    """

    def __init__(self):
        STORE_DIR.mkdir(parents=True, exist_ok=True)
        self._key = _derive_file_key() if _CRYPTO_AVAILABLE else None

    def store(self, data: bytes, original_name: str, file_type: str, case_id: int = None, uploaded_by: str = "") -> str:
        """
        Encrypt and store file. Returns file_id (UUID string).
        Metadata (original_name, sha256, size, case_id, uploaded_by, stored_at) saved as JSON.
        """
        file_id = str(uuid.uuid4())
        sha256 = hashlib.sha256(data).hexdigest()

        if _CRYPTO_AVAILABLE and self._key:
            nonce = os.urandom(12)
            chacha = ChaCha20Poly1305(self._key)
            encrypted = nonce + chacha.encrypt(nonce, data, None)
            enc_path = STORE_DIR / f"{file_id}.enc"
            enc_path.write_bytes(encrypted)
        else:
            # Dev fallback — plaintext
            plain_path = STORE_DIR / f"{file_id}.bin"
            plain_path.write_bytes(data)

        meta = {
            "file_id": file_id,
            "original_name": original_name,
            "file_type": file_type,
            "sha256": sha256,
            "size_bytes": len(data),
            "case_id": case_id,
            "uploaded_by": uploaded_by,
            "stored_at": datetime.utcnow().isoformat(),
            "encrypted": _CRYPTO_AVAILABLE and bool(self._key),
        }
        (STORE_DIR / f"{file_id}.meta.json").write_text(json.dumps(meta))
        return file_id

    def retrieve(self, file_id: str) -> bytes:
        """Decrypt and return file bytes. Raises FileNotFoundError if not found."""
        enc_path = STORE_DIR / f"{file_id}.enc"
        plain_path = STORE_DIR / f"{file_id}.bin"

        if enc_path.exists() and _CRYPTO_AVAILABLE and self._key:
            raw = enc_path.read_bytes()
            nonce, ciphertext = raw[:12], raw[12:]
            chacha = ChaCha20Poly1305(self._key)
            return chacha.decrypt(nonce, ciphertext, None)
        elif plain_path.exists():
            return plain_path.read_bytes()
        raise FileNotFoundError(f"Stored file not found: {file_id}")

    def delete(self, file_id: str) -> None:
        """Cryptographic shredding: overwrite with zeros before deletion."""
        for suffix in [".enc", ".bin", ".meta.json"]:
            path = STORE_DIR / f"{file_id}{suffix}"
            if path.exists():
                size = path.stat().st_size
                # Overwrite with random bytes (shred)
                path.write_bytes(os.urandom(size))
                path.unlink()

    def get_metadata(self, file_id: str) -> dict:
        meta_path = STORE_DIR / f"{file_id}.meta.json"
        if not meta_path.exists():
            raise FileNotFoundError(f"Metadata not found: {file_id}")
        return json.loads(meta_path.read_text())


# Module-level singleton
_store = None

def get_file_store() -> SecureFileStore:
    global _store
    if _store is None:
        _store = SecureFileStore()
    return _store
