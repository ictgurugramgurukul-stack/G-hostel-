"""
ORM models - a local-SQLite equivalent of the original Supabase/Postgres
schema (supabase/migrations, now removed). Column names match the original
tables so the rest of the app (and your mental model of the data) carries
over directly.
"""
import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import relationship

from app.db import Base


def gen_id() -> str:
    return str(uuid.uuid4())


class User(Base):
    """Login account. Staff have an email; students log in via their Member ID
    (see Student.user_id) and don't need one."""

    __tablename__ = "users"

    id = Column(String, primary_key=True, default=gen_id)
    email = Column(String, unique=True, nullable=True, index=True)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    role = Column(String, nullable=False)  # 'super_admin' | 'teacher' | 'student'
    created_at = Column(DateTime, default=datetime.utcnow)


class Student(Base):
    __tablename__ = "students"

    id = Column(String, primary_key=True, default=gen_id)
    user_id = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, unique=True)
    member_id = Column(String, unique=True, nullable=False, index=True)
    admission_no = Column(String, unique=True, nullable=True)
    name = Column(String, nullable=False)
    class_ = Column("class", String, nullable=True)
    section = Column(String, nullable=True)
    house = Column(String, nullable=True)
    room_number = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    gender = Column(String, nullable=True)
    hostel = Column(String, nullable=True)
    photo_url = Column(String, nullable=True)
    date_of_birth = Column(String, nullable=True)
    parent_name = Column(String, nullable=True)
    parent_phone = Column(String, nullable=True)
    email = Column(String, nullable=True)
    blood_group = Column(String, nullable=True)
    address = Column(Text, nullable=True)
    joining_date = Column(String, nullable=True)
    total_points = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Activity(Base):
    __tablename__ = "activities"

    id = Column(String, primary_key=True, default=gen_id)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    points = Column(Integer, nullable=False, default=10)
    is_positive = Column(Boolean, nullable=False, default=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class PointTransaction(Base):
    __tablename__ = "point_transactions"

    id = Column(String, primary_key=True, default=gen_id)
    student_id = Column(String, ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    activity_id = Column(String, ForeignKey("activities.id", ondelete="SET NULL"), nullable=True)
    teacher_id = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    teacher_name = Column(String, nullable=True)
    activity_name = Column(String, nullable=True)
    points = Column(Integer, nullable=False)
    remarks = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)


class Badge(Base):
    __tablename__ = "badges"
    __table_args__ = (UniqueConstraint("student_id", "tier", name="uq_student_tier"),)

    id = Column(String, primary_key=True, default=gen_id)
    student_id = Column(String, ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    tier = Column(String, nullable=False)
    threshold = Column(Integer, nullable=False)
    awarded_at = Column(DateTime, default=datetime.utcnow)


class Certificate(Base):
    __tablename__ = "certificates"

    id = Column(String, primary_key=True, default=gen_id)
    student_id = Column(String, ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    issued_by = Column(String, nullable=True)
    issued_at = Column(DateTime, default=datetime.utcnow)


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String, primary_key=True, default=gen_id)
    student_id = Column(String, ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String, nullable=False)
    message = Column(Text, nullable=True)
    type = Column(String, nullable=True)
    is_read = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class House(Base):
    __tablename__ = "houses"

    id = Column(String, primary_key=True, default=gen_id)
    name = Column(String, unique=True, nullable=False)
    color = Column(String, nullable=True)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String, primary_key=True, default=gen_id)
    user_id = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    actor_name = Column(String, nullable=True)
    action = Column(String, nullable=False)
    details = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
