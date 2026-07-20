from collections import OrderedDict

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import require_admin, CurrentUser
from app.models_orm import Student, PointTransaction

router = APIRouter(prefix="/api/analytics", tags=["analytics"])

MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


def _month_key(dt) -> str:
    return f"{MONTHS[dt.month - 1]} {str(dt.year)[2:]}"


@router.get("")
def analytics(user: CurrentUser = Depends(require_admin), db: Session = Depends(get_db)):
    students = db.query(Student).all()
    txns = db.query(PointTransaction).order_by(PointTransaction.created_at).all()

    by_month: "OrderedDict[str, int]" = OrderedDict()
    for t in txns:
        key = _month_key(t.created_at)
        by_month[key] = by_month.get(key, 0) + t.points

    activity_counts: dict[str, int] = {}
    for t in txns:
        name = t.activity_name or "Other"
        activity_counts[name] = activity_counts.get(name, 0) + 1
    top_activities = sorted(
        ({"name": k, "count": v} for k, v in activity_counts.items()),
        key=lambda x: x["count"], reverse=True,
    )[:8]

    house_totals: dict[str, int] = {}
    for s in students:
        if s.house:
            house_totals[s.house] = house_totals.get(s.house, 0) + s.total_points
    by_house = [{"name": k, "value": v} for k, v in house_totals.items()]

    teacher_counts: dict[str, int] = {}
    for t in txns:
        name = t.teacher_name or "Unknown"
        teacher_counts[name] = teacher_counts.get(name, 0) + 1
    teacher_contrib = sorted(
        ({"name": k, "count": v} for k, v in teacher_counts.items()),
        key=lambda x: x["count"], reverse=True,
    )[:6]

    return {
        "by_month": [{"month": k, "points": v} for k, v in by_month.items()],
        "top_activities": top_activities,
        "by_house": by_house,
        "teacher_contributions": teacher_contrib,
    }
