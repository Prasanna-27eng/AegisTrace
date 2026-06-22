"""
ATSP Traffic Obfuscator — Anti-Fingerprinting
───────────────────────────────────────────────
Two techniques:
  1. Payload padding to nearest 64-byte block (hides payload size)
  2. Chaff packet injection at random intervals (breaks timing analysis)

Chaff packets carry random encrypted payloads and are silently discarded
by receivers after HMAC verification.
"""
import os
import random
from typing import List

from .packet import ATSPPacket, PacketType

PAD_BLOCK   = 64     # bytes — pad plaintext to multiples of this
CHAFF_MIN   = 64     # bytes — minimum chaff payload
CHAFF_MAX   = 512    # bytes — maximum chaff payload
CHAFF_PROB  = 0.12   # 12% chance of injecting a chaff packet after any real packet


def pad_payload(plaintext: bytes) -> bytes:
    """
    Pad plaintext to the nearest 64-byte multiple.
    Padding bytes are zero. Receiver strips based on expected content length.
    """
    remainder = len(plaintext) % PAD_BLOCK
    if remainder == 0:
        return plaintext
    return plaintext + b"\x00" * (PAD_BLOCK - remainder)


def strip_padding(data: bytes) -> bytes:
    """Strip trailing zero padding. Caller should know the actual payload length."""
    return data.rstrip(b"\x00")


class ATSPObfuscator:
    """
    Wraps an ATSP send function to inject chaff packets.
    Usage:
        obfuscator = ATSPObfuscator(agent_id, session_token)
        packets = obfuscator.maybe_add_chaff(real_packet)
        for pkt in packets: send(pkt)
    """

    def __init__(self, agent_id: bytes, session_token: bytes, chaff_prob: float = CHAFF_PROB):
        self._agent_id      = agent_id
        self._session_token = session_token
        self._chaff_prob    = chaff_prob
        self._seq_counter   = 0

    def _next_seq(self) -> int:
        self._seq_counter += 1
        return self._seq_counter

    def make_chaff(self) -> ATSPPacket:
        """Create a CHAFF packet with random encrypted-looking payload."""
        size = random.randint(CHAFF_MIN // PAD_BLOCK, CHAFF_MAX // PAD_BLOCK) * PAD_BLOCK
        return ATSPPacket(
            ptype=PacketType.CHAFF,
            seq_num=self._next_seq(),
            agent_id=self._agent_id,
            session_token=self._session_token,
            payload=os.urandom(size),
        )

    def maybe_add_chaff(self, real_packet: ATSPPacket) -> List[ATSPPacket]:
        """
        Return [real_packet] or [real_packet, chaff] based on probability.
        Chaff is appended after the real packet so the real packet is delivered first.
        """
        packets = [real_packet]
        if random.random() < self._chaff_prob:
            packets.append(self.make_chaff())
        return packets
