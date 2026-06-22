"""
ATSP — AegisTrace Secure Protocol v1.0
───────────────────────────────────────
Formally verifiable, forward-secret protocol for security telemetry.

Modules:
  crypto      — X25519 + HKDF + ChaCha20-Poly1305 + HMAC primitives
  packet      — Wire format: 74-byte header + encrypted payload + HMAC-SHA256
  handshake   — Noise_XX key exchange (forward secrecy, mutual auth)
  session     — Replay protection: timestamp + seqnum + nonce cache
  obfuscator  — Padding + chaff injection (traffic analysis resistance)

Stage A (current): pure library — no server wiring, no agent wiring.
Stage B (Phase 7): server.py + agent-side ATSPClient integration.
"""
from .crypto import ATSPCrypto, generate_keypair, derive_session_key
from .packet import ATSPPacket, PacketType, MAGIC, HEADER_SIZE
from .session import ATSPSession, ReplayError
from .handshake import ATSPHandshake, HandshakeError
from .obfuscator import ATSPObfuscator

__all__ = [
    "ATSPCrypto", "generate_keypair", "derive_session_key",
    "ATSPPacket", "PacketType", "MAGIC", "HEADER_SIZE",
    "ATSPSession", "ReplayError",
    "ATSPHandshake", "HandshakeError",
    "ATSPObfuscator",
]
__version__ = "1.0.0"
