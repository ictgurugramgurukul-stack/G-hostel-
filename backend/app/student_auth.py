"""Default student password scheme (used when an Excel/CSV import doesn't
supply its own Password column)."""


def default_student_password(member_id: str) -> str:
    return f"Gurukul@{member_id}"
