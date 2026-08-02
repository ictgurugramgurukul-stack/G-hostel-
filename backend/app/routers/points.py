"""Search students, award/deduct points, and read stats.

Awarding points used to run through a Postgres trigger that updated the
student's total, auto-awarded badges, and created notifications. Since
there's no database service to hold that trigger anymore, the exact same
logic (same tiers, same thresholds, same messages) now runs right here in
`award_points`.
"""
import io
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from openpyxl import Workbook
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.badges import BADGE_TIERS
from app.db import get_db
from app.deps import require_staff, require_admin, get_current_user, CurrentUser
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


# ---------------------------------------------------------------------------
# Activity report: search the day-to-day activity log (every awarded /
# deducted activity) by activity name, student, or teacher, over a From/To
# date range, and download it as a plain Excel file.
# ---------------------------------------------------------------------------

def _parse_date(value: Optional[str]):
    value = (value or "").strip()
    if not value:
        return None
    try:
        return datetime.strptime(value, "%Y-%m-%d")
    except ValueError:
        return None


def _query_activity_log(db: Session, start_date: Optional[str], end_date: Optional[str], q: Optional[str]):
    query = db.query(PointTransaction)

    start_dt = _parse_date(start_date)
    if start_dt:
        query = query.filter(PointTransaction.created_at >= start_dt)

    end_dt = _parse_date(end_date)
    if end_dt:
        query = query.filter(PointTransaction.created_at < end_dt + timedelta(days=1))

    query_text = (q or "").strip()
    if query_text:
        like = f"%{query_text}%"
        student_ids = {
            s.id
            for s in db.query(Student)
            .filter(or_(Student.name.ilike(like), Student.member_id.ilike(like), Student.room_number.ilike(like)))
            .all()
        }
        conditions = [
            PointTransaction.activity_name.ilike(like),
            PointTransaction.remarks.ilike(like),
            PointTransaction.teacher_name.ilike(like),
        ]
        if student_ids:
            conditions.append(PointTransaction.student_id.in_(student_ids))
        query = query.filter(or_(*conditions))

    return query.order_by(PointTransaction.created_at.desc())


@router.get("/history")
def activity_history(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    q: Optional[str] = None,
    limit: int = 200,
    user: CurrentUser = Depends(require_staff),
    db: Session = Depends(get_db),
):
    query = _query_activity_log(db, start_date, end_date, q)
    total = query.count()
    txns = query.limit(limit).all()
    students = {s.id: s for s in db.query(Student).all()}

    records = []
    for t in txns:
        s = students.get(t.student_id)
        records.append({
            "date": t.created_at.strftime("%Y-%m-%d"),
            "time": t.created_at.strftime("%H:%M"),
            "student_name": s.name if s else "(deleted student)",
            "member_id": s.member_id if s else "",
            "room_number": s.room_number if s else "",
            "activity_name": t.activity_name or "",
            "points": t.points,
            "teacher_name": t.teacher_name or "",
            "remarks": t.remarks or "",
        })
    return {"total": total, "records": records}


@router.get("/export")
def export_activity_log(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    q: Optional[str] = None,
    user: CurrentUser = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Plain Excel dump of the activity log - just the raw rows, no header
    row, no bold/colors/column widths. One row per activity entry:
    Date, Time, Student Name, Member ID, Activity, Points, Teacher, Remarks.
    """
    txns = _query_activity_log(db, start_date, end_date, q).limit(5000).all()
    students = {s.id: s for s in db.query(Student).all()}

    wb = Workbook()
    ws = wb.active
    for t in txns:
        s = students.get(t.student_id)
        ws.append([
            t.created_at.strftime("%Y-%m-%d"),
            t.created_at.strftime("%H:%M"),
            s.name if s else "",
            s.member_id if s else "",
            t.activity_name or "",
            t.points,
            t.teacher_name or "",
            t.remarks or "",
        ])

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)

    db.add(AuditLog(
        user_id=user.id, actor_name=user.full_name, action="export_activity_log",
        details=f"{len(txns)} records ({start_date or 'all'} to {end_date or 'all'})",
    ))
    db.commit()

    stamp = datetime.utcnow().strftime("%Y%m%d")
    filename = f"activity_report_{stamp}.xlsx"
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
