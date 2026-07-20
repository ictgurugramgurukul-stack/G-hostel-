"""Teacher / Admin logins are no longer self-signed-up. Instead they live in
a JSON file (staff_accounts.json, next to this file) that looks like:

[
  {"name": "Gurukul Admin", "email": "gurugramgurukul@gmail.com", "password": "Gurukul@123", "type": "admin"},
  {"name": "Some Teacher", "email": "teacher@example.com", "password": "TeacherPass123", "type": "teacher"}
]

"type" must be "admin" or "teacher" ("admin" maps to the super_admin role).
On every server startup this file is re-read and used as the source of
truth: accounts are created if missing, and their name/password/role are
updated to match the file if they already exist. To add, remove, or change
a teacher/admin login, just edit this JSON file and restart the server.
"""
import json
from pathlib import Path

from sqlalchemy.orm import Session

from app.models_orm import User
from app.security import hash_password

STAFF_ACCOUNTS_PATH = Path(__file__).resolve().parent / "staff_accounts.json"

_TYPE_TO_ROLE = {
    "admin": "super_admin",
    "super_admin": "super_admin",
    "teacher": "teacher",
}


def sync_staff_accounts(db: Session) -> None:
    if not STAFF_ACCOUNTS_PATH.exists():
        return

    try:
        raw = json.loads(STAFF_ACCOUNTS_PATH.read_text())
    except (json.JSONDecodeError, OSError) as exc:
        print(f"[staff_accounts] Could not read {STAFF_ACCOUNTS_PATH.name}: {exc}")
        return

    if not isinstance(raw, list):
        print(f"[staff_accounts] {STAFF_ACCOUNTS_PATH.name} must contain a JSON list, skipping sync")
        return

    for entry in raw:
        if not isinstance(entry, dict):
            continue
        name = str(entry.get("name") or "").strip()
        email = str(entry.get("email") or "").strip().lower()
        password = str(entry.get("password") or "").strip()
        acc_type = str(entry.get("type") or "").strip().lower()
        role = _TYPE_TO_ROLE.get(acc_type)

        if not email or not password or not role:
            print(f"[staff_accounts] Skipping invalid entry (needs name, email, password, type=admin/teacher): {entry}")
            continue

        user = db.query(User).filter(User.email == email).first()
        if user:
            user.full_name = name or user.full_name
            user.role = role
            user.hashed_password = hash_password(password)
        else:
            db.add(User(email=email, hashed_password=hash_password(password), full_name=name, role=role))

    db.commit()
