"""
Application configuration.

No third-party API keys needed anymore: data lives in a local SQLite file,
and auth tokens are signed with a locally-generated secret (auto-created on
first run and saved to .env so it stays stable across restarts).
"""
import os
import secrets
from pathlib import Path

from dotenv import load_dotenv, set_key

BACKEND_DIR = Path(__file__).resolve().parent.parent
ENV_PATH = BACKEND_DIR / ".env"

load_dotenv(ENV_PATH)


def _get_or_create_secret_key() -> str:
    key = os.environ.get("SECRET_KEY")
    if key:
        return key
    key = secrets.token_hex(32)
    try:
        ENV_PATH.touch(exist_ok=True)
        set_key(str(ENV_PATH), "SECRET_KEY", key)
    except Exception:
        pass  # still works for this process even if we can't persist it
    os.environ["SECRET_KEY"] = key
    return key


class Settings:
    # Local SQLite database file - no external database or API service needed.
    DB_PATH: str = os.environ.get("DB_PATH", str(BACKEND_DIR / "gurukul.db"))

    # Signs login tokens. Auto-generated on first run if not already set.
    SECRET_KEY: str = _get_or_create_secret_key()

    # How long a login stays valid (seconds). Default: 30 days.
    TOKEN_LIFETIME_SECONDS: int = int(os.environ.get("TOKEN_LIFETIME_SECONDS", 60 * 60 * 24 * 30))

    CORS_ORIGINS: list[str] = [
        o.strip()
        for o in os.environ.get(
            "CORS_ORIGINS",
            "http://localhost:5500,http://127.0.0.1:5500,"
            "http://localhost:8000,http://127.0.0.1:8000,"
            "http://localhost:3000,http://127.0.0.1:3000",
        ).split(",")
        if o.strip()
    ]


settings = Settings()
