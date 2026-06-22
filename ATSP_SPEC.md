# ATSP — AegisTrace Secure Protocol
**Version:** 1.0  
**Status:** Draft  
**Authors:** Prasanna Kumar Surendran  
**Repository:** https://github.com/Prasanna-27eng/AegisTrace

---

## Abstract

ATSP (AegisTrace Secure Protocol) is a binary protocol for authenticated, encrypted,
replay-resistant telemetry between security agents and a central collection server.
It provides forward secrecy per session via ephemeral X25519 key exchange, authenticated
encryption via ChaCha20-Poly1305, and formal verification of its security properties
via a ProVerif model.

This document specifies the complete wire format, handshake state machine, security
properties, and threat model. It is intended to be independently implementable.

---

## 1. Motivation

### 1.1 Why Not TLS?

| Property | TLS 1.3 | ATSP |
|----------|---------|------|
| Protocol purpose | General HTTPS | Security telemetry |
| Packet size | Variable, large overhead | 74-byte fixed header |
| Traffic analysis resistance | Minimal | Padding + chaff injection |
| Formal verification | Available for TLS | ProVerif model included |
| Certificate infrastructure | Required (CA or self-signed) | Ephemeral keypairs |
| Agent identity binding | None (IP-based) | AgentID in every packet |
| Replay window | Session only | Per-nonce + ±30s timestamp |
| Dependency | openssl/boringssl | cryptography PyPI package |

TLS is the right choice for most applications. ATSP is optimised for a specific
workload: high-frequency telemetry from endpoint agents where traffic pattern
concealment matters, no CA infrastructure exists, and every packet must carry
authenticated agent identity.

### 1.2 Design Goals

1. **Forward secrecy** — compromise of long-term keys does not reveal past sessions
2. **Mutual authentication** — both agent and server prove identity during handshake
3. **Replay resistance** — duplicate or replayed packets rejected at multiple layers
4. **Traffic analysis resistance** — fixed-block padding + chaff packets obscure payload size and timing
5. **Formal verifiability** — security properties provable with automated tooling (ProVerif)
6. **Minimal footprint** — pure Python, no native extensions, single PyPI dependency

### 1.3 Non-Goals

ATSP does **not** protect against:
- Compromise of the endpoint running the agent (attacker can read memory)
- Quantum attacks on X25519 (post-quantum layer is Phase 7)
- Traffic analysis by persistent adversaries with access to packet timing across sessions
- Denial-of-service attacks (no rate limiting in protocol; must be implemented at the server)

---

## 2. Packet Format

### 2.1 Wire Layout

```
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                         Magic (4)                              |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|  Version (1)  |   Type (1)    |                               |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+                               +
|                      SeqNum (8)                               |
+               +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|               |                                               |
+-+-+-+-+-+-+-+-+                Timestamp (8)                  +
|                                               +-+-+-+-+-+-+-+-+
|                               |                               |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+                               +
|                     AgentID (16)                              |
+                                               +-+-+-+-+-+-+-+-+
|                               |                               |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+                               +
|                   SessionToken (32)                           |
+                                                               +
|                                                               |
+               +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|               |          PayloadLen (4)       |               |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+               +
|              EncryptedPayload (PayloadLen bytes)              |
+                                                               +
|                           ...                                 |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                      HMAC-SHA256 (32)                         |
+                                                               +
|                                                               |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
```

**Fixed header size: 74 bytes**

| Field | Offset | Size | Description |
|-------|--------|------|-------------|
| Magic | 0 | 4 | `\xAE\x61\x53\x50` ("AeSP") |
| Version | 4 | 1 | Protocol version (currently 0x01) |
| Type | 5 | 1 | Packet type (see §2.2) |
| SeqNum | 6 | 8 | Monotonically increasing per session (uint64 big-endian) |
| Timestamp | 14 | 8 | Unix timestamp seconds (uint64 big-endian); freshness window ±30s |
| AgentID | 22 | 16 | UUID bytes of the sending agent |
| SessionToken | 38 | 32 | Session identifier (32 random bytes from server during handshake) |
| PayloadLen | 70 | 4 | Length of EncryptedPayload in bytes (uint32 big-endian) |
| EncryptedPayload | 74 | variable | ChaCha20-Poly1305 ciphertext (see §4) |
| HMAC-SHA256 | 74+PayloadLen | 32 | HMAC-SHA256 over Magic+Version+Type+SeqNum+Timestamp+AgentID+SessionToken+PayloadLen+EncryptedPayload |

**Total minimum packet size:** 74 (header) + 0 (payload) + 32 (HMAC) = **106 bytes**

### 2.2 Packet Types

| Name | Code | Direction | Description |
|------|------|-----------|-------------|
| HANDSHAKE_INIT | 0x01 | Agent→Server | Initiates session; carries ephemeral public key |
| HANDSHAKE_ACK | 0x02 | Server→Agent | Responds with server ephemeral public key |
| HANDSHAKE_COMPLETE | 0x03 | Agent→Server | Finalises handshake; carries transcript HMAC |
| TELEMETRY | 0x10 | Agent→Server | Regular telemetry payload (JSON) |
| ALERT | 0x11 | Agent→Server | High-priority alert (expedited processing) |
| COMMAND | 0x20 | Server→Agent | Command for agent execution |
| COMMAND_RESULT | 0x21 | Agent→Server | Result of a previously received COMMAND |
| HEARTBEAT | 0x30 | Agent→Server | Keepalive; no payload |
| KEY_ROTATION | 0x40 | Bidirectional | Signals intent to rotate session key |
| DISCONNECT | 0xFF | Bidirectional | Graceful session termination |
| CHAFF | 0x99 | Bidirectional | Anti-fingerprinting dummy packet; receiver discards |

---

## 3. Handshake — Noise_XX Pattern

### 3.1 State Machine

```
AGENT                               SERVER
  |                                    |
  |-- HANDSHAKE_INIT ----------------->|  payload: [agent_id(16) | pub_key_A(32) | nonce_A(32) | version(1)]
  |                                    |
  |<-- HANDSHAKE_ACK ------------------|  payload: [pub_key_S(32) | nonce_S(32) | session_id(32)]
  |                                    |
  | (both derive shared_secret)        |
  | shared_secret = X25519(priv, peer_pub)
  | session_key   = HKDF(shared_secret, nonce_A ++ nonce_S, "aegistrace-atsp-v1")
  |                                    |
  |-- HANDSHAKE_COMPLETE ------------->|  payload: HMAC-SHA256(session_key, full_transcript)
  |                                    |
  | [SESSION ESTABLISHED]              |
```

### 3.2 Key Derivation

```
shared_secret  = X25519(agent_private_ephemeral, server_public_ephemeral)
session_key    = HKDF-SHA256(
    ikm  = shared_secret,
    salt = nonce_A || nonce_S,       # 64 bytes
    info = b"aegistrace-atsp-v1",
    len  = 32                         # 256-bit key
)
```

### 3.3 Security Properties

- **Forward secrecy:** Ephemeral keypairs generated fresh per session. Compromise of any long-term key does not reveal past session keys.
- **Mutual authentication:** Server proves possession of session_key by correctly decrypting HANDSHAKE_COMPLETE payload. Agent identity bound via AgentID in every subsequent packet.
- **Replay resistance:** Session token (32 random bytes) + monotonic SeqNum + timestamp freshness (±30s) + nonce cache (last 1000 nonces) — four independent replay barriers.
- **Transcript binding:** HANDSHAKE_COMPLETE HMAC covers the entire transcript (INIT + ACK payloads concatenated), preventing man-in-the-middle substitution of public keys.

---

## 4. Encryption

Every packet's `EncryptedPayload` is ChaCha20-Poly1305 AEAD ciphertext:

```
nonce      = os.urandom(12)                         # 96-bit random nonce
plaintext  = padded_payload(raw_payload)            # padded to 64-byte boundary
ciphertext = ChaCha20Poly1305(session_key).encrypt(nonce, plaintext, aad)
aad        = Magic || Version || Type || SeqNum || Timestamp || AgentID || SessionToken
```

The 12-byte nonce is **prepended** to the ciphertext before inclusion in the packet. PayloadLen covers nonce (12) + ciphertext + Poly1305 tag (16).

---

## 5. Replay Protection

Three layers, all required to pass:

1. **Timestamp freshness:** `|packet.timestamp - server_time| ≤ 30 seconds`
2. **Monotonic SeqNum:** `packet.seqnum > session.last_seen_seqnum` (per session)
3. **Nonce deduplication:** `packet_nonce NOT IN session.nonce_cache` (sliding window of 1000)

---

## 6. Traffic Obfuscation

### 6.1 Payload Padding
All plaintext payloads are padded to the nearest 64-byte multiple before encryption:
```
padded = payload + b'\x00' * ((64 - len(payload) % 64) % 64)
```
Padding is stripped by the receiver after decryption based on the `PayloadLen` field.

### 6.2 Chaff Injection
The obfuscator randomly injects `CHAFF` (0x99) packets between legitimate packets. Chaff packets carry random encrypted payloads of random length (64–512 bytes). Receivers discard chaff packets after HMAC verification. This breaks timing analysis.

---

## 7. ProVerif Model

A formal verification model is available at `verification/atsp_model.pv`. It proves:

1. **Session key secrecy** — attacker cannot compute session_key even with full network access
2. **Forward secrecy** — compromise of long-term identity does not reveal past session keys
3. **Mutual authentication** — neither side can be impersonated without private key material
4. **Replay resistance** — replayed packets are rejected before decryption

Run with: `proverif verification/atsp_model.pv` (ProVerif >= 2.04)

---

## 8. Test Vectors

See `verification/test_vectors.json` for known-input/known-output test cases for every cryptographic operation in this specification.

---

## 9. Implementation Notes

Reference implementation: `backend/atsp/` in the AegisTrace repository.

No native extensions required. The implementation uses only:
- `cryptography` (PyPI) — X25519, HKDF, ChaCha20-Poly1305, HMAC
- Python stdlib — `struct`, `os`, `time`, `hashlib`, `uuid`, `hmac`
