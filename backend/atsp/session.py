"""
ATSP Session — Replay Protection + Session State
─────────────────────────────────────────────────
Three independent replay barriers (all must pass):
  1. Timestamp freshness: |packet.timestamp - now| ≤ 30 seconds
  2. Monotonic SeqNum: packet.seqnum > session.last_seen_seqnum
  3. Nonce deduplication: nonce NOT in sliding window of last 1000 nonces
"""
import time
import uuid
from collections import deque
from typing import Deque

TIMESTAMP_WINDOW = 30          # seconds
NONCE_CACHE_SIZE  = 1000       # max nonces remembered


class ReplayError(Exception):
    """Raised when a packet fails replay protection."""
    pass


class ATSPSession:
    """
    Per-connection session state. One instance per agent connection on the server;
    one instance per server connection on the agent side.
    """

    def __init__(self, session_token: bytes = None):
        self.session_token: bytes    = session_token or uuid.uuid4().bytes + uuid.uuid4().bytes
        self.session_key:   bytes    = b""           # set after handshake
        self.agent_id:      bytes    = b"\x00" * 16  # set during handshake
        self.last_seq_num:  int      = -1            # last accepted seqnum
        self.nonce_cache:   Deque    = deque(maxlen=NONCE_CACHE_SIZE)
        self.established:   bool     = False
        self.created_at:    float    = time.time()

    def check_replay(self, seq_num: int, timestamp: int, nonce: bytes) -> None:
        """
        Validate packet against all three replay barriers.
        Raises ReplayError with a descriptive message if any check fails.
        Must be called AFTER HMAC verification.
        """
        now = time.time()

        # 1. Timestamp freshness
        if abs(now - timestamp) > TIMESTAMP_WINDOW:
            raise ReplayError(
                f"Timestamp out of window: packet={timestamp}, server={int(now)}, "
                f"delta={abs(now - timestamp):.1f}s (max {TIMESTAMP_WINDOW}s)"
            )

        # 2. Monotonic sequence number
        if seq_num <= self.last_seq_num:
            raise ReplayError(
                f"SeqNum replay: received {seq_num}, last accepted {self.last_seq_num}"
            )

        # 3. Nonce deduplication
        if nonce in self.nonce_cache:
            raise ReplayError(f"Nonce reuse detected: {nonce.hex()}")

        # All checks passed — update state
        self.last_seq_num = seq_num
        self.nonce_cache.append(nonce)

    def mark_established(self, session_key: bytes, agent_id: bytes) -> None:
        """Called after successful handshake completion."""
        self.session_key = session_key
        self.agent_id    = agent_id
        self.established = True
