"""Pydantic models mirroring src/lib/models.ts from the original app.

Note: "class" is a Python keyword, so the field is named `class_` here and
mapped to/from the database's `class` column via an alias.
"""
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict


class Student(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    user_id: Optional[str] = None
    member_id: str
    admission_no: Optional[str] = None
    name: str
    class_: Optional[str] = Field(default=None, alias="class")
    section: Optional[str] = None
    house: Optional[str] = None
    room_number: Optional[str] = None
    phone: Optional[str] = None
    gender: Optional[str] = None
    hostel: Optional[str] = None
    photo_url: Optional[str] = None
    date_of_birth: Optional[str] = None
    parent_name: Optional[str] = None
    parent_phone: Optional[str] = None
    email: Optional[str] = None
    blood_group: Optional[str] = None
    address: Optional[str] = None
    joining_date: Optional[str] = None
    total_points: int = 0
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class StudentCreate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    member_id: str
    admission_no: Optional[str] = None
    name: str
    class_: Optional[str] = Field(default=None, alias="class")
    section: Optional[str] = None
    house: Optional[str] = None
    room_number: Optional[str] = None
    phone: Optional[str] = None
    gender: Optional[str] = None
    hostel: Optional[str] = None
    photo_url: Optional[str] = None
    password: Optional[str] = None  # if set, creates a login for this student immediately


class Activity(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    points: int
    is_positive: bool
    is_active: bool
    created_at: Optional[str] = None


class ActivityCreate(BaseModel):
    name: str
    description: Optional[str] = None
    points: int = 10


class PointTransaction(BaseModel):
    id: str
    student_id: str
    activity_id: Optional[str] = None
    teacher_id: Optional[str] = None
    teacher_name: Optional[str] = None
    activity_name: Optional[str] = None
    points: int
    remarks: Optional[str] = None
    created_at: Optional[str] = None


class AwardPointsRequest(BaseModel):
    student_id: str
    activity_id: Optional[str] = None
    points: int
    remarks: Optional[str] = None


class BadgeRow(BaseModel):
    id: str
    student_id: str
    tier: str
    threshold: int
    awarded_at: Optional[str] = None


class Certificate(BaseModel):
    id: str
    student_id: str
    title: str
    description: Optional[str] = None
    issued_by: Optional[str] = None
    issued_at: Optional[str] = None


class CertificateCreate(BaseModel):
    title: str
    description: Optional[str] = None


class Notification(BaseModel):
    id: str
    student_id: str
    title: str
    message: Optional[str] = None
    type: Optional[str] = None
    is_read: bool = False
    created_at: Optional[str] = None


class House(BaseModel):
    id: str
    name: str
    color: Optional[str] = None


class AuditLog(BaseModel):
    id: str
    user_id: Optional[str] = None
    actor_name: Optional[str] = None
    action: str
    details: Optional[str] = None
    created_at: Optional[str] = None


class StaffSigninRequest(BaseModel):
    email: str
    password: str


class StudentSigninRequest(BaseModel):
    member_id: str
    password: str


class ImportFailure(BaseModel):
    row: int
    member_id: str
    reason: str


class ImportSummary(BaseModel):
    total: int
    imported: int
    updated: int
    skipped: int
    failed: int
    failures: List[ImportFailure]
