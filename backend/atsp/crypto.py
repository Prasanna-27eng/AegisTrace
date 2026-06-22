"""
ATSP Cryptographic Primitives
──────────────────────────────
X25519 key exchange · HKDF-SHA256 derivation · ChaCha20-Poly1305 AEAD ·
HMAC-SHA256 authentication · secure nonce generation

All operations use `cryptography` PyPI package — no native extensions beyond what
that package already requires. Nonces always from os.urandom, never time-based.
"""
import os
import hmac as _hmac
import hashlib
from typing import Tuple

from cryptography.hazmat.primitives.asymmetric.x25519 import (
    X25519PrivateKey, X25519PublicKey,
)
from cryptography.hazmat.primitives.serialization import (
    Encoding, PublicFormat, PrivateFormat, NoEncryption,
)
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import ChaCha20Poly1305

PROTOCOL_INFO = b"aegistrace-atsp-v1"
NONCE_SIZE    = 12   # ChaCha20-Poly1305 nonce: 96 bits
TAG_SIZE      = 16   # Poly1305 tag: 128 bits
KEY_SIZE      = 32   # ChaCha20 key: 256 bits


def generate_keypair() -> Tuple[bytes, bytes]:
    """
    Generate an ephemeral X25519 keypair.
    Returns (private_key_bytes, public_key_bytes) — each 32 bytes.
    Keypairs are ephemeral: generate fresh per session, discard after handshake.
    """
    priv = X25519PrivateKey.generate()
    priv_bytes = priv.private_bytes(Encoding.Raw, PrivateFormat.Raw, NoEncryption())
    pub_bytes  = priv.public_key().public_bytes(Encoding.Raw, PublicFormat.Raw)
    return priv_bytes, pub_bytes


def derive_session_key(
    private_key_bytes: bytes,
    peer_public_key_bytes: bytes,
    nonce_a: bytes,
    nonce_s: bytes,
) -> bytes:
    """
    Derive a 32-byte session key via X25519 DH + HKDF-SHA256.

    shared_secret = X25519(private_key, peer_public_key)
    session_key   = HKDF(ikm=shared_secret, salt=nonce_a||nonce_s,
                         info=b"aegistrace-atsp-v1", len=32)

    Properties:
    - Forward secrecy: ephemeral private key discarded after this call
    - Both sides derive identical key from the same inputs
    """
    priv = X25519PrivateKey.from_private_bytes(private_key_bytes)
    peer = X25519PublicKey.from_public_bytes(peer_public_key_bytes)
    shared_secret = priv.exchange(peer)

    hkdf = HKDF(
        algorithm=hashes.SHA256(),
        length=KEY_SIZE,
        salt=nonce_a + nonce_s,
        info=PROTOCOL_INFO,
    )
    return hkdf.derive(shared_secret)


class ATSPCrypto:
    """
    Stateless crypto operations bound to a session key.
    Instantiate with a 32-byte session_key derived from derive_session_key().
    """

    def __init__(self, session_key: bytes):
        if len(session_key) != KEY_SIZE:
            raise ValueError(f"session_key must be {KEY_SIZE} bytes")
        self._key = session_key
        self._chacha = ChaCha20Poly1305(session_key)

    def encrypt(self, plaintext: bytes, aad: bytes = b"") -> Tuple[bytes, bytes]:
        """
        Encrypt plaintext with ChaCha20-Poly1305.
        Returns (nonce, ciphertext_with_tag).
        nonce is 12 random bytes — prepend to ciphertext in the packet.
        """
        nonce = os.urandom(NONCE_SIZE)
        ciphertext = self._chacha.encrypt(nonce, plaintext, aad or None)
        return nonce, ciphertext

    def decrypt(self, nonce: bytes, ciphertext: bytes, aad: bytes = b"") -> bytes:
        """
        Decrypt and verify ChaCha20-Poly1305 ciphertext.
        Raises cryptography.exceptions.InvalidTag on authentication failure.
        """
        return self._chacha.decrypt(nonce, ciphertext, aad or None)

    def hmac(self, data: bytes) -> bytes:
        """HMAC-SHA256 of data using session_key. Returns 32 bytes."""
        return _hmac.new(self._key, data, hashlib.sha256).digest()

    def verify_hmac(self, data: bytes, expected: bytes) -> bool:
        """Constant-time HMAC verification. Returns True if valid."""
        computed = self.hmac(data)
        return _hmac.compare_digest(computed, expected)

    @staticmethod
    def secure_nonce(size: int = NONCE_SIZE) -> bytes:
        """Generate cryptographically secure random bytes. Never time-based."""
        return os.urandom(size)

    @staticmethod
    def transcript_hmac(session_key: bytes, *transcript_parts: bytes) -> bytes:
        """
        HMAC-SHA256 over concatenated transcript parts.
        Used in HANDSHAKE_COMPLETE to bind the full handshake transcript.
        """
        payload = b"".join(transcript_parts)
        return _hmac.new(session_key, payload, hashlib.sha256).digest()
