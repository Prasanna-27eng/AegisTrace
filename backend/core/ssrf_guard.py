"""
AegisTrace — SSRF defense helpers for outbound connector integrations
────────────────────────────────────────────────────────────────────
Connectors like Okta accept a user-supplied hostname and then make
server-side HTTP requests to it with a bearer token attached. Without
validation, a malicious "okta_domain" value (e.g. "169.254.169.254" or
an internal hostname) turns the connector into an SSRF proxy that
leaks the stored credential to internal services / cloud metadata
endpoints.

Adapted from the SSRF guard in routers/webhooks.py.
"""
import ipaddress
import re
import socket
from urllib.parse import urlparse

_SSRF_BLOCK = re.compile(
    r"^(localhost|127\.|0\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|"
    r"169\.254\.|::1|fc00:|fe80:|0\.0\.0\.0|metadata\.google\.internal)",
    re.IGNORECASE,
)

_BLOCKED_HOSTS = {
    "169.254.169.254", "metadata.google.internal",
    "169.254.170.2", "fd00:ec2::254",
}


class SSRFBlockedError(ValueError):
    """Raised when a hostname names or resolves to a disallowed target."""


def validate_external_host(host: str) -> str:
    """
    Validate a bare hostname (e.g. "dev-12345.okta.com") supplied by a user
    for an outbound connector. Raises SSRFBlockedError if it points at a
    private/loopback/link-local/reserved address or a cloud metadata host.
    Returns the normalized hostname on success.
    """
    host = (host or "").strip().rstrip("/")
    if "://" in host:
        host = urlparse(host).hostname or ""
    # A bare hostname must not contain path/userinfo/port separators.
    if not host or any(c in host for c in ("/", "@", " ", "\\")):
        raise SSRFBlockedError("Invalid hostname")
    if _SSRF_BLOCK.match(host) or host.lower() in _BLOCKED_HOSTS:
        raise SSRFBlockedError("Host cannot point to internal/private addresses or cloud metadata endpoints")
    return host


def is_blocked_ip(ip_str: str) -> bool:
    """True if the IP (or its IPv4-mapped form) is private/loopback/link-local/reserved."""
    try:
        ip = ipaddress.ip_address(ip_str)
    except ValueError:
        return True
    mapped = ip.ipv4_mapped if ip.version == 6 else None
    if mapped:
        ip = mapped
    return (
        ip.is_private or ip.is_loopback or ip.is_link_local
        or ip.is_reserved or ip.is_multicast or ip.is_unspecified
    )


def resolve_and_check(host: str) -> bool:
    """
    Send-time SSRF re-check: resolve `host` and verify every address it
    resolves to is public. Defends against DNS rebinding (hostname passed
    save-time validation but now resolves to an internal IP). Returns True
    if safe to send, False if blocked.
    """
    try:
        host = (host or "").strip().rstrip("/")
        if "://" in host:
            host = urlparse(host).hostname or ""
        if not host:
            return False
        infos = socket.getaddrinfo(host, None)
        for _, _, _, _, sockaddr in infos:
            if is_blocked_ip(sockaddr[0]):
                return False
        return True
    except Exception:
        return False
