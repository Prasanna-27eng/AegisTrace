"""
ATSP Handshake — Noise_XX Pattern
────────────────────────────────────
Agent  → Server: HANDSHAKE_INIT     [agent_id(16) | pub_key_A(32) | nonce_A(32) | version(1)]
Server → Agent:  HANDSHAKE_ACK      [pub_key_S(32) | nonce_S(32) | session_id(32)]
(both compute session_key = HKDF(X25519(priv, peer_pub), nonce_A||nonce_S))
Agent  → Server: HANDSHAKE_COMPLETE [HMAC-SHA256(session_key, full_transcript)]

Security properties:
  - Forward secrecy (ephemeral keypairs, discarded after exchange)
  - Mutual authentication (transcript HMAC binds both sides)
  - Replay resistance (session_token from server, nonce_A from agent)
"""
import os
import hmac as _hmac
from typing import Tuple

from .crypto import generate_keypair, derive_session_key, ATSPCrypto
from .packet import ATSPPacket, PacketType
from .session import ATSPSession

HANDSHAKE_INIT_PAYLOAD_SIZE     = 16 + 32 + 32 + 1  # agent_id + pub_key + nonce + version
HANDSHAKE_ACK_PAYLOAD_SIZE      = 32 + 32 + 32       # pub_key + nonce + session_id
HANDSHAKE_COMPLETE_PAYLOAD_SIZE = 32                  # transcript HMAC


class HandshakeError(Exception):
    """Raised when handshake fails for any reason."""
    pass


class ATSPHandshake:
    """
    Handshake state machine.
    Instantiate one per connection attempt.
    """

    def __init__(self, agent_id: bytes):
        self.agent_id      = agent_id[:16].ljust(16, b"\x00")
        self._priv, self._pub = generate_keypair()     # ephemeral keypair
        self._nonce_a      = os.urandom(32)
        self._peer_pub     = b""
        self._nonce_s      = b""
        self._session_key  = b""
        self._transcript   = b""                       # accumulates INIT + ACK payloads

    # ── Agent side ────────────────────────────────────────────────────────────

    def build_init(self, seq_num: int = 1) -> ATSPPacket:
        """
        Agent: build HANDSHAKE_INIT packet.
        payload = agent_id(16) | pub_key_A(32) | nonce_A(32) | version(1)
        """
        payload = self.agent_id + self._pub + self._nonce_a + bytes([0x01])
        self._transcript += payload

        pkt = ATSPPacket(
            ptype=PacketType.HANDSHAKE_INIT,
            seq_num=seq_num,
            agent_id=self.agent_id,
            session_token=b"\x00" * 32,   # empty before session established
            payload=payload,
        )
        return pkt

    def process_ack(self, pkt: ATSPPacket) -> bytes:
        """
        Agent: process HANDSHAKE_ACK from server.
        Returns session_token. Raises HandshakeError on invalid packet.
        """
        payload = pkt.payload
        if len(payload) < HANDSHAKE_ACK_PAYLOAD_SIZE:
            raise HandshakeError(f"ACK payload too short: {len(payload)}")

        self._peer_pub    = payload[:32]
        self._nonce_s     = payload[32:64]
        session_token     = payload[64:96]

        self._transcript += payload
        self._session_key = derive_session_key(
            self._priv, self._peer_pub, self._nonce_a, self._nonce_s
        )
        return session_token

    def build_complete(self, session_token: bytes, seq_num: int = 2) -> ATSPPacket:
        """
        Agent: build HANDSHAKE_COMPLETE with transcript HMAC.
        Must be called after process_ack().
        """
        if not self._session_key:
            raise HandshakeError("Session key not yet derived — call process_ack() first")

        transcript_hmac = ATSPCrypto.transcript_hmac(self._session_key, self._transcript)
        pkt = ATSPPacket(
            ptype=PacketType.HANDSHAKE_COMPLETE,
            seq_num=seq_num,
            agent_id=self.agent_id,
            session_token=session_token,
            payload=transcript_hmac,
        )
        return pkt

    # ── Server side ───────────────────────────────────────────────────────────

    def process_init_server(self, pkt: ATSPPacket) -> Tuple[bytes, "ATSPHandshake"]:
        """
        Server: process HANDSHAKE_INIT.
        Returns (agent_id, server_handshake_state).
        """
        payload = pkt.payload
        if len(payload) < HANDSHAKE_INIT_PAYLOAD_SIZE:
            raise HandshakeError(f"INIT payload too short: {len(payload)}")

        agent_id_recv = payload[:16]
        peer_pub      = payload[16:48]
        nonce_a       = payload[48:80]

        # Server generates its own ephemeral keypair
        server_hs = ATSPHandshake(agent_id=agent_id_recv)
        server_hs._nonce_a   = nonce_a
        server_hs._peer_pub  = peer_pub
        server_hs._transcript = payload
        return agent_id_recv, server_hs

    def build_ack_server(self, seq_num: int = 1) -> Tuple[ATSPPacket, bytes, bytes]:
        """
        Server: build HANDSHAKE_ACK.
        Returns (ack_packet, session_key, session_token).
        """
        nonce_s       = os.urandom(32)
        session_token = os.urandom(32)
        self._nonce_s = nonce_s

        self._session_key = derive_session_key(
            self._priv, self._peer_pub, self._nonce_a, nonce_s
        )

        payload = self._pub + nonce_s + session_token
        self._transcript += payload

        pkt = ATSPPacket(
            ptype=PacketType.HANDSHAKE_ACK,
            seq_num=seq_num,
            agent_id=b"\x00" * 16,
            session_token=session_token,
            payload=payload,
        )
        return pkt, self._session_key, session_token

    def verify_complete_server(self, pkt: ATSPPacket) -> bool:
        """
        Server: verify HANDSHAKE_COMPLETE transcript HMAC.
        Returns True if valid. Must be called after build_ack_server().
        """
        if not self._session_key:
            raise HandshakeError("ACK not yet sent — call build_ack_server() first")
        expected = ATSPCrypto.transcript_hmac(self._session_key, self._transcript)
        return _hmac.compare_digest(pkt.payload[:32], expected)

    @property
    def session_key(self) -> bytes:
        return self._session_key
