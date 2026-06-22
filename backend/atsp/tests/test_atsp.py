"""
ATSP Unit Tests — runs without pytest (plain Python)

Run:     python3 backend/atsp/tests/test_atsp.py
Expects: All 10 tests pass (exit 0)

Dependencies: cryptography>=41.0 (already in requirements.txt)
"""
import sys
import os

# Allow running from repo root or from this file's directory
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../../.."))

from backend.atsp.crypto import generate_keypair, derive_session_key, ATSPCrypto
from backend.atsp.packet import ATSPPacket, PacketType, HEADER_SIZE, HMAC_SIZE
from backend.atsp.session import ATSPSession, ReplayError
from backend.atsp.obfuscator import pad_payload, strip_padding, ATSPObfuscator
import time

PASS = "PASS"
FAIL = "FAIL"
results: list[tuple[str, str]] = []


def test(name: str, fn) -> None:
    try:
        fn()
        results.append((PASS, name))
        print(f"  [PASS]  {name}")
    except Exception as exc:
        results.append((FAIL, name))
        print(f"  [FAIL]  {name}: {exc}")


# ── Crypto tests ──────────────────────────────────────────────────────────────

def test_key_agreement():
    """X25519 DH produces identical shared secrets on both sides."""
    priv_a, pub_a = generate_keypair()
    priv_s, pub_s = generate_keypair()
    nonce_a = os.urandom(32)
    nonce_s = os.urandom(32)
    key_a = derive_session_key(priv_a, pub_s, nonce_a, nonce_s)
    key_s = derive_session_key(priv_s, pub_a, nonce_a, nonce_s)
    assert key_a == key_s, f"Keys do not match: {key_a.hex()} != {key_s.hex()}"
    assert len(key_a) == 32, f"Expected 32-byte key, got {len(key_a)}"


def test_key_agreement_different_nonces_produce_different_keys():
    """Different nonces → different session keys (HKDF binding)."""
    priv_a, pub_a = generate_keypair()
    priv_s, pub_s = generate_keypair()
    nonce_a1, nonce_s1 = os.urandom(32), os.urandom(32)
    nonce_a2, nonce_s2 = os.urandom(32), os.urandom(32)
    key1 = derive_session_key(priv_a, pub_s, nonce_a1, nonce_s1)
    key2 = derive_session_key(priv_a, pub_s, nonce_a2, nonce_s2)
    assert key1 != key2, "Distinct nonces must produce distinct session keys"


def test_encrypt_decrypt():
    """ChaCha20-Poly1305 round-trip."""
    priv_a, pub_a = generate_keypair()
    priv_s, pub_s = generate_keypair()
    nonce_a = os.urandom(32)
    nonce_s = os.urandom(32)
    key = derive_session_key(priv_a, pub_s, nonce_a, nonce_s)

    crypto = ATSPCrypto(key)
    plaintext = b"Hello, ATSP protocol!"
    enc_nonce, ct = crypto.encrypt(plaintext)
    recovered = crypto.decrypt(enc_nonce, ct)
    assert recovered == plaintext, "Decrypted bytes do not match plaintext"


def test_encrypt_produces_distinct_ciphertexts():
    """Each encrypt() call uses a fresh nonce → different ciphertext (IND-CPA)."""
    key = os.urandom(32)
    crypto = ATSPCrypto(key)
    plaintext = b"same message"
    _, ct1 = crypto.encrypt(plaintext)
    _, ct2 = crypto.encrypt(plaintext)
    assert ct1 != ct2, "Two encryptions of the same plaintext must differ"


def test_hmac_verify():
    """HMAC-SHA256 verify succeeds for correct data, fails for tampered data."""
    key = os.urandom(32)
    crypto = ATSPCrypto(key)
    data = b"packet header bytes"
    mac = crypto.hmac(data)
    assert crypto.verify_hmac(data, mac), "Valid HMAC must verify"
    assert not crypto.verify_hmac(b"tampered data", mac), "Tampered data must not verify"
    assert not crypto.verify_hmac(data, bytes(32)), "Zero MAC must not verify"


# ── Packet tests ──────────────────────────────────────────────────────────────

def test_packet_build_parse():
    """ATSPPacket serialises and deserialises correctly."""
    pkt = ATSPPacket(
        ptype=PacketType.TELEMETRY,
        seq_num=42,
        agent_id=b"A" * 16,
        session_token=b"S" * 32,
        payload=b"test encrypted payload bytes",
    )
    hmac_bytes = b"H" * HMAC_SIZE
    raw = pkt.build(hmac_bytes)

    parsed = ATSPPacket.parse(raw)
    assert parsed.ptype == PacketType.TELEMETRY, f"Wrong type: {parsed.ptype}"
    assert parsed.seq_num == 42, f"Wrong seq_num: {parsed.seq_num}"
    assert parsed.agent_id == b"A" * 16, "agent_id mismatch"
    assert parsed.session_token == b"S" * 32, "session_token mismatch"
    assert parsed.payload == b"test encrypted payload bytes", "payload mismatch"
    assert parsed.hmac == hmac_bytes, "HMAC field mismatch"


def test_packet_invalid_magic():
    """Parsing a buffer with bad magic bytes raises ValueError."""
    garbage = b"\x00" * 200
    try:
        ATSPPacket.parse(garbage)
        assert False, "Should have raised ValueError for bad magic"
    except ValueError as exc:
        assert "magic" in str(exc).lower(), f"Expected 'magic' in error, got: {exc}"


def test_packet_truncated_raises():
    """Parsing a truncated packet raises ValueError."""
    try:
        ATSPPacket.parse(b"\x00" * 4)  # too short for any valid header
        assert False, "Should have raised ValueError for truncated packet"
    except ValueError:
        pass  # expected


# ── Session replay protection tests ──────────────────────────────────────────

def test_session_replay_seqnum():
    """Duplicate sequence number is rejected as a replay."""
    session = ATSPSession()
    ts = int(time.time())
    session.check_replay(seq_num=1, timestamp=ts, nonce=os.urandom(12))
    try:
        session.check_replay(seq_num=1, timestamp=ts, nonce=os.urandom(12))
        assert False, "Should have rejected duplicate seq_num"
    except ReplayError as exc:
        assert "SeqNum" in str(exc), f"Expected 'SeqNum' in error, got: {exc}"


def test_session_replay_timestamp():
    """Packet with stale timestamp (outside ±30 s window) is rejected."""
    session = ATSPSession()
    stale_ts = int(time.time()) - 100  # 100 s ago — outside window
    try:
        session.check_replay(seq_num=1, timestamp=stale_ts, nonce=os.urandom(12))
        assert False, "Should have rejected stale timestamp"
    except ReplayError as exc:
        assert "Timestamp" in str(exc), f"Expected 'Timestamp' in error, got: {exc}"


def test_session_replay_future_timestamp():
    """Packet with far-future timestamp is also rejected."""
    session = ATSPSession()
    future_ts = int(time.time()) + 100  # 100 s in the future
    try:
        session.check_replay(seq_num=1, timestamp=future_ts, nonce=os.urandom(12))
        assert False, "Should have rejected future timestamp"
    except ReplayError as exc:
        assert "Timestamp" in str(exc), f"Expected 'Timestamp' in error, got: {exc}"


def test_session_replay_nonce():
    """Duplicate nonce (different seq_num) is rejected."""
    session = ATSPSession()
    nonce = os.urandom(12)
    ts = int(time.time())
    session.check_replay(seq_num=1, timestamp=ts, nonce=nonce)
    try:
        session.check_replay(seq_num=2, timestamp=ts, nonce=nonce)
        assert False, "Should have rejected duplicate nonce"
    except ReplayError as exc:
        assert "Nonce" in str(exc), f"Expected 'Nonce' in error, got: {exc}"


# ── Obfuscator tests ──────────────────────────────────────────────────────────

def test_padding_alignment():
    """pad_payload produces output whose length is a multiple of 64."""
    for length in [1, 5, 63, 64, 65, 127, 128, 200]:
        padded = pad_payload(b"x" * length)
        assert len(padded) % 64 == 0, (
            f"Padded length {len(padded)} not multiple of 64 for input {length}"
        )


def test_padding_already_aligned():
    """Payload that is already 64-byte aligned needs no extra padding."""
    payload = b"x" * 64
    padded = pad_payload(payload)
    assert padded == payload, (
        f"Already-aligned payload should be unchanged, got len {len(padded)}"
    )


def test_padding_strip_roundtrip():
    """strip_padding(pad_payload(x)) == x."""
    for payload in [b"hello", b"x" * 64, b"y" * 65, b"z" * 200]:
        assert strip_padding(pad_payload(payload)) == payload, (
            f"Round-trip failed for payload len {len(payload)}"
        )


def test_chaff_generation():
    """ATSPObfuscator with chaff_prob=1.0 always appends a CHAFF packet."""
    obf = ATSPObfuscator(
        agent_id=b"A" * 16,
        session_token=b"S" * 32,
        chaff_prob=1.0,  # 100% — always inject chaff
    )
    real_pkt = ATSPPacket(
        ptype=PacketType.HEARTBEAT,
        seq_num=1,
        agent_id=b"A" * 16,
        session_token=b"S" * 32,
        payload=b"",
    )
    packets = obf.maybe_add_chaff(real_pkt)
    assert len(packets) == 2, f"Expected 2 packets (real + chaff), got {len(packets)}"
    assert packets[0].ptype == PacketType.HEARTBEAT, "First packet must be real"
    assert packets[1].ptype == PacketType.CHAFF, "Second packet must be chaff"


def test_chaff_not_generated():
    """ATSPObfuscator with chaff_prob=0.0 never appends chaff."""
    obf = ATSPObfuscator(
        agent_id=b"A" * 16,
        session_token=b"S" * 32,
        chaff_prob=0.0,  # 0% — never inject chaff
    )
    real_pkt = ATSPPacket(
        ptype=PacketType.TELEMETRY,
        seq_num=1,
        agent_id=b"A" * 16,
        session_token=b"S" * 32,
        payload=b"data",
    )
    packets = obf.maybe_add_chaff(real_pkt)
    assert len(packets) == 1, f"Expected 1 packet (no chaff), got {len(packets)}"
    assert packets[0].ptype == PacketType.TELEMETRY


# ── Test runner ───────────────────────────────────────────────────────────────

print()
print("ATSP Unit Tests")
print("=" * 50)

# Crypto
test("Key agreement (X25519 commutativity)",                   test_key_agreement)
test("Key agreement: distinct nonces → distinct keys",         test_key_agreement_different_nonces_produce_different_keys)
test("Encrypt/decrypt round-trip (ChaCha20-Poly1305)",         test_encrypt_decrypt)
test("Encrypt: distinct nonces per call (IND-CPA)",            test_encrypt_produces_distinct_ciphertexts)
test("HMAC-SHA256: verify correct / reject tampered",          test_hmac_verify)

# Packet
test("Packet build + parse (field round-trip)",                test_packet_build_parse)
test("Packet: invalid magic bytes rejected",                   test_packet_invalid_magic)
test("Packet: truncated buffer rejected",                      test_packet_truncated_raises)

# Session replay protection
test("Replay protection: duplicate SeqNum rejected",           test_session_replay_seqnum)
test("Replay protection: stale timestamp rejected",            test_session_replay_timestamp)
test("Replay protection: future timestamp rejected",           test_session_replay_future_timestamp)
test("Replay protection: duplicate nonce rejected",            test_session_replay_nonce)

# Obfuscator
test("Padding: output is multiple of 64 bytes",                test_padding_alignment)
test("Padding: aligned payload unchanged",                     test_padding_already_aligned)
test("Padding: strip_padding(pad_payload(x)) == x",            test_padding_strip_roundtrip)
test("Chaff: injected when chaff_prob=1.0",                    test_chaff_generation)
test("Chaff: not injected when chaff_prob=0.0",                test_chaff_not_generated)

print()
passed = sum(1 for r, _ in results if r == PASS)
failed = sum(1 for r, _ in results if r == FAIL)
total  = len(results)
print(f"Results: {passed}/{total} passed, {failed} failed")

if failed > 0:
    sys.exit(1)
