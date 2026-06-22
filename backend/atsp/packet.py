"""
ATSP Packet Wire Format
────────────────────────
Fixed 74-byte header:
  Magic(4) | Version(1) | Type(1) | SeqNum(8) | Timestamp(8) |
  AgentID(16) | SessionToken(32) | PayloadLen(4)

Followed by:
  EncryptedPayload(PayloadLen bytes) | HMAC-SHA256(32)

Minimum packet: 74 + 0 + 32 = 106 bytes
"""
import struct
import time
from enum import IntEnum
from dataclasses import dataclass, field
from typing import Optional

MAGIC        = b"\xAE\x61\x53\x50"   # "AeSP"
VERSION      = 0x01
HEADER_SIZE  = 74
HMAC_SIZE    = 32
HEADER_FMT   = "!4sBBQQ16s32sI"      # big-endian
HEADER_STRUCT = struct.Struct(HEADER_FMT)
assert HEADER_STRUCT.size == HEADER_SIZE, f"Header size mismatch: {HEADER_STRUCT.size}"


class PacketType(IntEnum):
    HANDSHAKE_INIT     = 0x01
    HANDSHAKE_ACK      = 0x02
    HANDSHAKE_COMPLETE = 0x03
    TELEMETRY          = 0x10
    ALERT              = 0x11
    COMMAND            = 0x20
    COMMAND_RESULT     = 0x21
    HEARTBEAT          = 0x30
    KEY_ROTATION       = 0x40
    DISCONNECT         = 0xFF
    CHAFF              = 0x99


@dataclass
class ATSPPacket:
    """
    In-memory representation of an ATSP packet.
    Use build() to serialise and parse() to deserialise.
    """
    ptype:         PacketType
    seq_num:       int
    agent_id:      bytes              # 16 bytes (UUID)
    session_token: bytes              # 32 bytes
    payload:       bytes = b""        # encrypted payload (including nonce prefix)
    timestamp:     int   = field(default_factory=lambda: int(time.time()))
    hmac:          Optional[bytes] = None   # 32 bytes; set after signing

    def build_header(self) -> bytes:
        """Serialise header fields (without HMAC). Used as AAD for ChaCha20 and HMAC input."""
        payload_len = len(self.payload)
        return HEADER_STRUCT.pack(
            MAGIC, VERSION, int(self.ptype),
            self.seq_num, self.timestamp,
            self.agent_id[:16].ljust(16, b"\x00"),
            self.session_token[:32].ljust(32, b"\x00"),
            payload_len,
        )

    def build(self, hmac_bytes: bytes) -> bytes:
        """Serialise the complete packet including HMAC (must be provided by caller)."""
        return self.build_header() + self.payload + hmac_bytes

    @classmethod
    def parse(cls, data: bytes) -> "ATSPPacket":
        """
        Deserialise raw bytes into an ATSPPacket.
        Does NOT verify HMAC — caller must verify before trusting any fields.
        """
        if len(data) < HEADER_SIZE + HMAC_SIZE:
            raise ValueError(f"Packet too short: {len(data)} < {HEADER_SIZE + HMAC_SIZE}")

        magic, version, ptype, seq_num, timestamp, agent_id, session_token, payload_len = \
            HEADER_STRUCT.unpack(data[:HEADER_SIZE])

        if magic != MAGIC:
            raise ValueError(f"Invalid magic: {magic.hex()}")
        if version != VERSION:
            raise ValueError(f"Unsupported version: {version}")

        expected_total = HEADER_SIZE + payload_len + HMAC_SIZE
        if len(data) < expected_total:
            raise ValueError(f"Truncated packet: got {len(data)}, expected {expected_total}")

        payload = data[HEADER_SIZE: HEADER_SIZE + payload_len]
        hmac    = data[HEADER_SIZE + payload_len: HEADER_SIZE + payload_len + HMAC_SIZE]

        try:
            ptype_enum = PacketType(ptype)
        except ValueError:
            raise ValueError(f"Unknown packet type: 0x{ptype:02x}")

        pkt = cls(
            ptype=ptype_enum,
            seq_num=seq_num,
            agent_id=agent_id,
            session_token=session_token,
            payload=payload,
            timestamp=timestamp,
        )
        pkt.hmac = hmac
        return pkt

    @property
    def raw_without_hmac(self) -> bytes:
        """Header + payload without HMAC — used as HMAC input."""
        return self.build_header() + self.payload
