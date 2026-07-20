"""Search students, award/deduct points, and read stats.

Awarding points used to run through a Postgres trigger that updated the
student's total, auto-awarded badges, and created notifications. Since
there's no database service to hold that trigger anymore, the exact same
logic (same tiers, same thresholds, same messages) now runs right here in
`award_points`.
"""
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.badges import BADGE_TIERS
from app.db import get_db
from app.deps import require_staff, get_current_user, CurrentUser
from app.models_orm import Student, Activity, PointTransaction, Badge, Notification, AuditLog
from app.schemas import AwardPointsRequest
from app.serialize import serialize, serialize_many

router = APIRouter(prefix="/api/points", tags=["points"])


@router.get("/search")
def search_students(q: str, user: CurrentUser = Depends(require_staff), db: Session = Depends(get_db)):
    query = (q or "").strip()
    if not query:
        return []
    like = f"%{query}%"
    results = (
        db.query(Student)
        .filter(
            or_(
                Student.member_id.ilike(like),
                Student.name.ilike(like),
                Student.admission_no.ilike(like),
                Student.phone.ilike(like),
                Student.room_number.ilike(like),
            )
        )
        .limit(10)
        .all()
    )
    return serialize_many(results)


@router.get("/rank/{student_id}")
def student_rank(student_id: str, user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    higher = db.query(Student).filter(Student.total_points > student.total_points).count()
    return {"rank": higher + 1}


@router.get("/top")
def top_students(limit: int = 5, user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    results = db.query(Student).order_by(Student.total_points.desc()).limit(limit).all()
    return serialize_many(results)


@router.get("/stats/today")
def stats_today(user: CurrentUser = Depends(require_staff), db: Session = Depends(get_db)):
    start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    txns = (
        db.query(PointTransaction)
        .filter(PointTransaction.created_at >= start)
        .order_by(PointTransaction.created_at.desc())
        .all()
    )
    students = {t.student_id for t in txns}
    return {
        "awarded_today": len(students),
        "points_today": sum(t.points for t in txns),
        "recent": serialize_many(txns[:8]),
    }


@router.post("/award")
def award_points(payload: AwardPointsRequest, user: CurrentUser = Depends(require_staff), db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.id == payload.student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    activity_name = None
    if payload.activity_id:
        activity = db.query(Activity).filter(Activity.id == payload.activity_id).first()
        if activity:
            activity_name = activity.name

    tx = PointTransaction(
        student_id=payload.student_id,
        activity_id=payload.activity_id,
        teacher_id=user.id,
        teacher_name=user.full_name,
        activity_name=activity_name,
        points=payload.points,
        remarks=(payload.remarks or "").strip() or None,
    )
    db.add(tx)

    # ---- same logic the old Postgres trigger used to run ----
    student.total_points += payload.points

    db.add(Notification(
        student_id=student.id,
        title="Points Awarded" if payload.points >= 0 else "Points Deducted",
        message=f"{activity_name or 'Activity'}: {payload.points} points"
        + (f" - {tx.remarks}" if tx.remarks else ""),
        type="points",
    ))

    for tier in BADGE_TIERS:
        if student.total_points >= tier["threshold"]:
            already = (
                db.query(Badge)
                .filter(Badge.student_id == student.id, Badge.tier == tier["name"])
                .first()
            )
            if not already:
                db.add(Badge(student_id=student.id, tier=tier["name"], threshold=tier["threshold"]))
                db.add(Notification(
                    student_id=student.id,
                    title="New Badge Unlocked!",
                    message=f"You earned the {tier['name']} badge!",
                    type="badge",
                ))
    # -----------------------------------------------------------

    db.add(AuditLog(
        user_id=user.id, actor_name=user.full_name, action="award_points",
        details=f"{payload.points} pts to student ({activity_name})",
    ))

    db.commit()
    db.refresh(tx)
    db.refresh(student)

    return {"transaction": serialize(tx), "student": serialize(student)}
