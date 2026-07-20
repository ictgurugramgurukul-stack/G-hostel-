import base64
import io

import qrcode
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import require_student, CurrentUser
from app.models_orm import Student, PointTransaction, Badge, Certificate, Notification
from app.serialize import serialize, serialize_many

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


def _qr_data_uri(data: str) -> str:
    img = qrcode.make(data, box_size=6, border=1)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    b64 = base64.b64encode(buf.getvalue()).decode("ascii")
    return f"data:image/png;base64,{b64}"


@router.get("/student")
def student_dashboard(request: Request, user: CurrentUser = Depends(require_student), db: Session = Depends(get_db)):
    if not user.student_id:
        raise HTTPException(status_code=404, detail="No student profile linked to this account.")

    student = db.query(Student).filter(Student.id == user.student_id).first()
    txns = (
        db.query(PointTransaction)
        .filter(PointTransaction.student_id == user.student_id)
        .order_by(PointTransaction.created_at.desc())
        .all()
    )
    badges = db.query(Badge).filter(Badge.student_id == user.student_id).all()
    certs = (
        db.query(Certificate)
        .filter(Certificate.student_id == user.student_id)
        .order_by(Certificate.issued_at.desc())
        .all()
    )
    notifs = (
        db.query(Notification)
        .filter(Notification.student_id == user.student_id)
        .order_by(Notification.created_at.desc())
        .limit(10)
        .all()
    )
    higher = db.query(Student).filter(Student.total_points > student.total_points).count()
    rank = higher + 1

    # The QR code just encodes the student's Member ID - it's generated
    # entirely locally with the `qrcode` library, no external service.
    qr = _qr_data_uri(f"GURUKUL-STUDENT:{student.member_id}")

    for n in notifs:
        n.is_read = True
    db.commit()

    return {
        "student": serialize(student),
        "transactions": serialize_many(txns),
        "badges": serialize_many(badges),
        "certificates": serialize_many(certs),
        "notifications": serialize_many(notifs),
        "rank": rank,
        "qr_code": qr,
    }
