"""Turns ORM rows into plain JSON-able dicts with the same field names the
frontend already expects (e.g. Student.class_ -> "class").

Note: we deliberately inspect the *mapper* (sqlalchemy.inspect(obj).mapper),
not obj.__table__.columns. Those look similar but are not the same thing:
a raw Column's `.key` defaults to its SQL column name ("class"), while the
mapper's column_attrs give the actual Python attribute name ("class_") that
was assigned on the model. Using __table__.columns.key to call getattr()
crashes on any column whose Python attribute name differs from its SQL
name - which is exactly the case for Student.class_ (mapped to the "class"
column, since "class" is a reserved word in Python).
"""
from datetime import datetime
from typing import Any

from sqlalchemy import inspect


def _value(v: Any) -> Any:
    if isinstance(v, datetime):
        return v.isoformat() + "Z"
    return v


def serialize(obj) -> dict:
    if obj is None:
        return None
    mapper = inspect(obj).mapper
    out = {}
    for attr in mapper.column_attrs:
        db_column_name = attr.columns[0].name  # e.g. "class"
        python_attr_name = attr.key            # e.g. "class_"
        out[db_column_name] = _value(getattr(obj, python_attr_name))
    return out


def serialize_many(objs) -> list[dict]:
    return [serialize(o) for o in objs]
