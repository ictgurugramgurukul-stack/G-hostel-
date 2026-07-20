"""Authentication & authorization dependencies, backed by the local SQLite
database and self-issued tokens (see app/security.py) - no external auth
service involved."""
from typing import Optional

from fastapi import Depends, HTTPException, Header, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db import get_db
from app.models_orm import User, Student
from app.security import decode_access_token, TokenError


class CurrentUser(BaseModel):
    id: str
    email: Optional[str] = None
    role: str  # 'super_admin' | 'teacher' | 'student'
    full_name: Optional[str] = None
    student_id: Optional[str] = None  # linked students.id, if role == student


def _extract_token(authorization: Optional[str]) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")
    return authorization.split(" ", 1)[1].strip()


async def get_current_user(
    authorization: Optional[str] = Header(default=None),
    db: Session = Depends(get_db),
) -> CurrentUser:
    token = _extract_token(authorization)
    try:
        payload = decode_access_token(token)
    except TokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired session")

    user = db.query(User).filter(User.id == payload.get("sub")).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired session")

    student_id = None
    if user.role == "student":
        student = db.query(Student).filter(Student.user_id == user.id).first()
        if student:
            student_id = student.id

    return CurrentUser(id=user.id, email=user.email, role=user.role, full_name=user.full_name, student_id=student_id)


def require_roles(*roles: str):
    """Dependency factory: 403s unless the current user has one of `roles`."""

    async def _checker(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if user.role not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
        return user

    return _checker


require_admin = require_roles("super_admin")
require_staff = require_roles("super_admin", "teacher")
require_student = require_roles("student")
