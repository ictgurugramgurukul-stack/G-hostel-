from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_current_user, CurrentUser
from app.models_orm import Student, PointTransaction, House
from app.serialize import serialize_many

router = APIRouter(prefix="/api/leaderboard", tags=["leaderboard"])


@router.get("")
def leaderboard(
    period: str = "overall",
    house: str = "all",
    klass: str = "all",
    top_n: int = 10,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    students = db.query(Student).all()
    houses = db.query(House).all()

    if period == "overall":
        def score_for(s: Student) -> int:
            return s.total_points
    else:
        days = 7 if period == "weekly" else 30
        cutoff = datetime.utcnow() - timedelta(days=days)
        txns = db.query(PointTransaction).filter(PointTransaction.created_at >= cutoff).all()
        totals: dict[str, int] = {}
        for tx in txns:
            totals[tx.student_id] = totals.get(tx.student_id, 0) + tx.points

        def score_for(s: Student) -> int:
            return totals.get(s.id, 0)

    filtered = [
        s for s in students
        if (house == "all" or s.house == house) and (klass == "all" or s.class_ == klass)
    ]
    ranked_students = sorted(filtered, key=score_for, reverse=True)[:top_n]
    ranked = []
    for s in ranked_students:
        d = serialize_many([s])[0]
        d["score"] = score_for(s)
        ranked.append(d)

    house_totals: dict[str, int] = {}
    for s in students:
        if s.house:
            house_totals[s.house] = house_totals.get(s.house, 0) + s.total_points
    house_standings = sorted(
        ({"name": name, "points": pts} for name, pts in house_totals.items()),
        key=lambda h: h["points"],
        reverse=True,
    )

    classes = sorted({s.class_ for s in students if s.class_})

    return {
        "ranked": ranked,
        "house_standings": house_standings,
        "houses": serialize_many(houses),
        "classes": classes,
    }
