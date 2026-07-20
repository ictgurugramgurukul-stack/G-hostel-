from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import require_admin, CurrentUser
from app.models_orm import Student, User, Activity, PointTransaction, Certificate, AuditLog
from app.serialize import serialize_many

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/stats")
def stats(user: CurrentUser = Depends(require_admin), db: Session = Depends(get_db)):
    students = db.query(Student).count()
    teachers = db.query(User).filter(User.role == "teacher").count()
    activities = db.query(Activity).count()
    total_points = db.query(func.coalesce(func.sum(PointTransaction.points), 0)).scalar()
    certificates = db.query(Certificate).count()
    audit = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(30).all()

    return {
        "students": students,
        "teachers": teachers,
        "activities": activities,
        "points": int(total_points or 0),
        "certificates": certificates,
        "audit_logs": serialize_many(audit),
    }
