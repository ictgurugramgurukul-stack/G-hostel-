"""
Local authentication primitives - replaces Supabase Auth.

- Passwords are hashed with PBKDF2-HMAC-SHA256 (Python's hashlib, no
  external dependency / C extension needed).
- Login sessions are small JWT-style signed tokens (header.payload.signature,
  HMAC-SHA256), created and verified entirely by this app - no third-party
  auth API involved.
"""
import base64
import hashlib
import hmac
import json
import os
import time
from typing import Any

from app.config import settings

PBKDF2_ITERATIONS = 260_000


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, PBKDF2_ITERATIONS)
    return f"pbkdf2_sha256${PBKDF2_ITERATIONS}${salt.hex()}${dk.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        algo, iterations_s, salt_hex, hash_hex = stored.split("$")
        if algo != "pbkdf2_sha256":
            return False
        iterations = int(iterations_s)
        salt = bytes.fromhex(salt_hex)
        dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
        return hmac.compare_digest(dk.hex(), hash_hex)
    except Exception:
        return False


class TokenError(Exception):
    pass


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64url_decode(s: str) -> bytes:
    padding = "=" * (-len(s) % 4)
    return base64.urlsafe_b64decode(s + padding)


def create_access_token(user_id: str, role: str) -> str:
    header = {"alg": "HS256", "typ": "JWT"}
    payload: dict[str, Any] = {
        "sub": user_id,
        "role": role,
        "iat": int(time.time()),
        "exp": int(time.time()) + settings.TOKEN_LIFETIME_SECONDS,
    }
    h = _b64url_encode(json.dumps(header, separators=(",", ":")).encode())
    p = _b64url_encode(json.dumps(payload, separators=(",", ":")).encode())
    signing_input = f"{h}.{p}".encode()
    sig = hmac.new(settings.SECRET_KEY.encode(), signing_input, hashlib.sha256).digest()
    return f"{h}.{p}.{_b64url_encode(sig)}"


def decode_access_token(token: str) -> dict:
    try:
        h, p, s = token.split(".")
    except ValueError:
        raise TokenError("Malformed token")

    signing_input = f"{h}.{p}".encode()
    expected_sig = hmac.new(settings.SECRET_KEY.encode(), signing_input, hashlib.sha256).digest()
    if not hmac.compare_digest(_b64url_encode(expected_sig), s):
        raise TokenError("Invalid token signature")

    try:
        payload = json.loads(_b64url_decode(p))
    except Exception:
        raise TokenError("Malformed token payload")

    if payload.get("exp", 0) < time.time():
        raise TokenError("Token expired")

    return payload
