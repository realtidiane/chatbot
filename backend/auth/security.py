"""Password hashing and JWT helpers.

We use the `bcrypt` library directly (rather than passlib) because
passlib 1.7.4 has compatibility issues with bcrypt >= 4.1: its version
detection breaks and it raises spurious "password cannot be longer
than 72 bytes" errors on perfectly normal passwords.

bcrypt has a hard 72-byte input limit. Anything longer must be folded
to <=72 bytes before hashing. We use SHA-256 pre-hashing (industry
standard, used by Django, Werkzeug, etc.). Short passwords go through
unchanged so existing hashes stay valid.
"""
from __future__ import annotations

import base64
import hashlib
import os
from datetime import datetime, timedelta, timezone
from typing import Any

import bcrypt
import jwt

JWT_SECRET = os.getenv("JWT_SECRET", "change-me-please")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "10080"))  # 7 days

_WEAK_SECRETS = {"change-me-please", "", "secret", "changeme"}
if JWT_SECRET in _WEAK_SECRETS or len(JWT_SECRET) < 32:
    import warnings
    warnings.warn(
        "JWT_SECRET is weak or unset. Set a strong random value before deploying. "
        "Generate one with: python -c \"import secrets; print(secrets.token_urlsafe(48))\"",
        stacklevel=1,
    )


def _prepare(password: str) -> bytes:
    """Encode and (if needed) pre-hash the password to fit bcrypt's 72-byte limit."""
    raw = password.encode("utf-8")
    if len(raw) <= 72:
        return raw
    # SHA-256 -> 32 bytes, base64-encoded -> 44 bytes (under the 72-byte cap).
    digest = hashlib.sha256(raw).digest()
    return base64.b64encode(digest)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(_prepare(password), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    if not hashed:
        return False
    try:
        return bcrypt.checkpw(_prepare(password), hashed.encode("utf-8"))
    except Exception:
        return False


def create_access_token(subject, extra=None):
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(subject),
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=JWT_EXPIRE_MINUTES)).timestamp()),
    }
    if extra:
        payload.update(extra)
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str):
    """Returns the payload or raises jwt.PyJWTError on failure."""
    return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
