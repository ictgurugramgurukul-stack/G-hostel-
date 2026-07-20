#!/usr/bin/env python3
"""
One-command launcher for Gurukul Rewards.

Works both locally and on Render.

Local:
    python run.py

Render:
    python run.py
"""

import argparse
import os
import shutil
import subprocess
import sys
import threading
import time
import webbrowser
from pathlib import Path

ROOT = Path(__file__).resolve().parent
BACKEND_DIR = ROOT / "backend"
ENV_FILE = BACKEND_DIR / ".env"
ENV_EXAMPLE = BACKEND_DIR / ".env.example"
REQUIREMENTS = BACKEND_DIR / "requirements.txt"


def ensure_env_file():
    if ENV_FILE.exists():
        return
    if ENV_EXAMPLE.exists():
        shutil.copy(ENV_EXAMPLE, ENV_FILE)


def dependencies_installed():
    try:
        import fastapi  # noqa
        import uvicorn  # noqa
        import sqlalchemy  # noqa
        import qrcode  # noqa
        import openpyxl  # noqa
        import dotenv  # noqa
        import multipart  # noqa
        return True
    except ImportError:
        return False


def install_dependencies():
    print("Installing backend dependencies...")
    cmd = [
        sys.executable,
        "-m",
        "pip",
        "install",
        "-r",
        str(REQUIREMENTS),
    ]
    result = subprocess.run(cmd)
    if result.returncode != 0:
        sys.exit(result.returncode)


def open_browser_later(url, delay=1.5):
    def _open():
        time.sleep(delay)
        try:
            webbrowser.open(url)
        except Exception:
            pass

    threading.Thread(target=_open, daemon=True).start()


def main():
    parser = argparse.ArgumentParser(
        description="Run Gurukul Rewards"
    )

    parser.add_argument(
        "--host",
        default=os.environ.get("HOST", "0.0.0.0"),
        help="Host to bind",
    )

    parser.add_argument(
        "--port",
        type=int,
        default=int(os.environ.get("PORT", 8000)),
        help="Port to bind",
    )

    parser.add_argument(
        "--reload",
        action="store_true",
        help="Enable auto reload",
    )

    parser.add_argument(
        "--no-browser",
        action="store_true",
        help="Disable browser auto-open",
    )

    args = parser.parse_args()

    ensure_env_file()

    if not dependencies_installed():
        install_dependencies()

    url = f"http://{args.host}:{args.port}/"

    print("\n====================================")
    print("Starting Gurukul Rewards")
    print(f"URL: {url}")
    print("====================================\n")

    # Only open browser locally
    if (
        not args.no_browser
        and "RENDER" not in os.environ
        and "PORT" not in os.environ
    ):
        open_browser_later(url)

    sys.path.insert(0, str(BACKEND_DIR))

    os.chdir(BACKEND_DIR)

    import uvicorn

    uvicorn.run(
        "main:app",
        host=args.host,
        port=args.port,
        reload=args.reload,
    )


if __name__ == "__main__":
    main()
