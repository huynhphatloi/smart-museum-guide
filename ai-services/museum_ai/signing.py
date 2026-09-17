"""Request signatures shared with the backend (backend/api/src/localization/ai-service-signature.ts).

Header: `X-Museum-Signature: t=<unix seconds>,v1=<hex HMAC-SHA256 of "<t>.<raw body>">`.
"""

from __future__ import annotations

import hashlib
import hmac
import time
from typing import Optional

SIGNATURE_HEADER = "X-Museum-Signature"
TOLERANCE_SECONDS = 300


def sign(secret: str, body: bytes, now: Optional[float] = None) -> str:
    timestamp = int(time.time() if now is None else now)
    return f"t={timestamp},v1={_digest(secret, timestamp, body)}"


def verify(
    secret: str,
    header: Optional[str],
    body: bytes,
    now: Optional[float] = None,
    tolerance: int = TOLERANCE_SECONDS,
) -> bool:
    if not header:
        return False
    parts = dict(part.strip().split("=", 1) for part in header.split(",") if "=" in part)
    try:
        timestamp = int(parts.get("t", ""))
    except ValueError:
        return False
    signature = parts.get("v1", "")
    if len(signature) != 64:
        return False
    current = time.time() if now is None else now
    if abs(current - timestamp) > tolerance:
        return False
    return hmac.compare_digest(_digest(secret, timestamp, body), signature)


def _digest(secret: str, timestamp: int, body: bytes) -> str:
    return hmac.new(secret.encode(), f"{timestamp}.".encode() + body, hashlib.sha256).hexdigest()
