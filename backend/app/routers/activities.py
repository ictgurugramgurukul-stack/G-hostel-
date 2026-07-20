from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_current_user, require_admin, CurrentUser
from app.models_orm import Activity
from app.schemas import ActivityCreate
from app.serialize import serialize, serialize_many

router = APIRouter(prefix="/api/activities", tags=["activities"])


@router.get("")
def list_activities(active_only: bool = False, user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    query = db.query(Activity).order_by(Activity.name)
    if active_only:
        query = query.filter(Activity.is_active.is_(True))
    return serialize_many(query.all())


@router.post("")
def create_activity(payload: ActivityCreate, user: CurrentUser = Depends(require_admin), db: Session = Depends(get_db)):
    if not payload.name.strip():
        raise HTTPException(status_code=400, detail="Name is required")
    activity = Activity(
        name=payload.name.strip(),
        description=(payload.description or "").strip() or None,
        points=payload.points,
        is_positive=payload.points >= 0,
    )
    db.add(activity)
    db.commit()
    db.refresh(activity)
    return serialize(activity)


@router.put("/{activity_id}")
def update_activity(activity_id: str, payload: ActivityCreate, user: CurrentUser = Depends(require_admin), db: Session = Depends(get_db)):
    if not payload.name.strip():
        raise HTTPException(status_code=400, detail="Name is required")
    activity = db.query(Activity).filter(Activity.id == activity_id).first()
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    activity.name = payload.name.strip()
    activity.description = (payload.description or "").strip() or None
    activity.points = payload.points
    activity.is_positive = payload.points >= 0
    db.commit()
    db.refresh(activity)
    return serialize(activity)


@router.patch("/{activity_id}/toggle")
def toggle_activity(activity_id: str, user: CurrentUser = Depends(require_admin), db: Session = Depends(get_db)):
    activity = db.query(Activity).filter(Activity.id == activity_id).first()
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    activity.is_active = not activity.is_active
    db.commit()
    db.refresh(activity)
    return serialize(activity)
