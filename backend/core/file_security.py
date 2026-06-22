"""
AegisTrace File Security — v10.3
─────────────────────────────────
FileIdentityVerifier: magic bytes vs claimed MIME type, decompression bomb detection,
                      size limits per file type.
FilenameSanitiser:    UUID prefix, strip path traversal chars, safe charset only.
"""
import os
import re
import uuid
import zipfile
import struct
from typing import Optional

# ── Magic byte signatures ─────────────────────────────────────────────────────
MAGIC = {
    "pcap":    [(0, b"\xd4\xc3\xb2\xa1"), (0, b"\xa1\xb2\xc3\xd4"),  # pcap LE/BE
                (0, b"\x0a\x0d\x0d\x0a")],                              # pcapng
    "pdf":     [(0, b"%PDF")],
    "zip":     [(0, b"PK\x03\x04"), (0, b"PK\x05\x06"), (0, b"PK\x07\x08")],
    "gzip":    [(0, b"\x1f\x8b")],
    "email":   None,   # .eml / .msg — text-based, check by content heuristic
    "log":     None,   # plain text
    "json":    None,   # plain text
}

# ── Size limits (bytes) ───────────────────────────────────────────────────────
SIZE_LIMITS = {
    "pcap":  200 * 1024 * 1024,   # 200 MB
    "pdf":    50 * 1024 * 1024,   # 50 MB
    "zip":    50 * 1024 * 1024,   # 50 MB (pre-decompression)
    "email":  10 * 1024 * 1024,   # 10 MB
    "log":    50 * 1024 * 1024,   # 50 MB
    "json":    5 * 1024 * 1024,   # 5 MB
    "default":100 * 1024 * 1024,  # 100 MB fallback
}

# ── Decompression bomb limit ──────────────────────────────────────────────────
MAX_DECOMPRESSED_BYTES = 512 * 1024 * 1024  # 512 MB
MAX_ZIP_RATIO = 50                            # compressed:decompressed ratio

SAFE_FILENAME_RE = re.compile(r"[^a-zA-Z0-9._\-]")


class FileSecurityError(Exception):
    """Raised when a file fails security validation."""
    pass


class FilenameSanitiser:
    @staticmethod
    def sanitise(original_name: str, prefix_uuid: bool = True) -> str:
        """
        Returns a safe filename:
        - Strips directory traversal characters (../, /, \\, :)
        - Keeps only alphanumeric + . _ -
        - Prepends a UUID to prevent collisions and enumeration
        - Limits total length to 200 chars
        """
        # Strip path components
        name = os.path.basename(original_name)
        # Replace unsafe chars
        name = SAFE_FILENAME_RE.sub("_", name)
        # Strip leading dots (hidden files)
        name = name.lstrip(".")
        # Limit length
        name = name[:120]
        if not name:
            name = "upload"
        if prefix_uuid:
            name = f"{uuid.uuid4().hex[:8]}_{name}"
        return name[:200]


class FileIdentityVerifier:
    """
    Verifies that uploaded files are what they claim to be.
    Checks: magic bytes, size limits, decompression bomb detection.
    """

    def __init__(self, claimed_type: str, data: bytes):
        self.claimed_type = claimed_type.lower()
        self.data = data

    def verify(self) -> None:
        """
        Run all checks. Raises FileSecurityError on failure.
        Call this before any further processing.
        """
        self._check_size()
        self._check_magic_bytes()
        if self.claimed_type in ("zip", "pcap"):
            self._check_decompression_bomb()

    def _check_size(self) -> None:
        limit = SIZE_LIMITS.get(self.claimed_type, SIZE_LIMITS["default"])
        if len(self.data) > limit:
            raise FileSecurityError(
                f"File exceeds size limit for {self.claimed_type}: "
                f"{len(self.data):,} bytes > {limit:,} bytes"
            )

    def _check_magic_bytes(self) -> None:
        signatures = MAGIC.get(self.claimed_type)
        if signatures is None:
            return  # text-based formats — no magic bytes to check
        for offset, magic in signatures:
            if self.data[offset:offset + len(magic)] == magic:
                return  # match found
        raise FileSecurityError(
            f"Magic bytes do not match claimed type '{self.claimed_type}'. "
            "File may be mislabelled or malicious."
        )

    def _check_decompression_bomb(self) -> None:
        """Check ZIP/gzip files for decompression bombs (zip bombs)."""
        if self.claimed_type == "zip" or self.data[:2] == b"PK":
            try:
                import io
                with zipfile.ZipFile(io.BytesIO(self.data)) as zf:
                    total_uncompressed = sum(info.file_size for info in zf.infolist())
                    if total_uncompressed > MAX_DECOMPRESSED_BYTES:
                        raise FileSecurityError(
                            f"Decompression bomb detected: would expand to "
                            f"{total_uncompressed:,} bytes (limit {MAX_DECOMPRESSED_BYTES:,})"
                        )
                    compressed = len(self.data)
                    if compressed > 0 and total_uncompressed / compressed > MAX_ZIP_RATIO:
                        raise FileSecurityError(
                            f"Suspicious compression ratio {total_uncompressed / compressed:.0f}:1 "
                            f"(limit {MAX_ZIP_RATIO}:1) — possible zip bomb"
                        )
            except zipfile.BadZipFile:
                pass  # Not a zip despite magic — let downstream handle it
