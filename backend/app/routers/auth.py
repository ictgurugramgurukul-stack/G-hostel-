"""Local authentication - replaces Supabase Auth entirely. Teacher/Admin
accounts are NOT self-signed-up; they are defined in app/staff_accounts.json
and synced into the database on every server startup (see
app/staff_accounts.py). Students sign in with their Member ID + password."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_current_user, CurrentUser
from app.models_orm import User, Student
from app.schemas import StaffSigninRequest, StudentSigninRequest
from app.security import verify_password, create_access_token
from app.serialize import serialize

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/signin")
def staff_signin(payload: StaffSigninRequest, db: Session = Depends(get_db)):
    email = payload.email.strip().lower()
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    token = create_access_token(user.id, user.role)
    return {"access_token": token, "user": {"id": user.id, "email": user.email, "role": user.role}}


@router.post("/student-signin")
def student_signin(payload: StudentSigninRequest, db: Session = Depends(get_db)):
    member_id = payload.member_id.strip()
    student = db.query(Student).filter(Student.member_id == member_id).first()
    if not student or not student.user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Member ID or password")
    user = db.query(User).filter(User.id == student.user_id).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Member ID or password")
    token = create_access_token(user.id, user.role)
    return {"access_token": token, "user": {"id": user.id, "email": user.email, "role": user.role}}


@router.post("/signout")
def signout(user: CurrentUser = Depends(get_current_user)):
    # Tokens are stateless; the frontend just discards its stored token.
    return {"ok": True}


@router.get("/me")
def me(user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    student = None
    if user.student_id:
        s = db.query(Student).filter(Student.id == user.student_id).first()
        student = serialize(s)
    return {
        "id": user.id,
        "email": user.email,
        "role": user.role,
        "full_name": user.full_name,
        "student": student,
    }
