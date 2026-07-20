"""
Gurukul Rewards - FastAPI backend.

Fully self-contained: no external database, auth provider, or API keys.
Data lives in a local SQLite file (backend/gurukul.db, created
automatically on first run); logins are handled locally too.

Run with:
    uvicorn main:app --reload --port 8000

or simply `python3 run.py` from the project root, which does this for you.
"""
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.db import Base, engine, SessionLocal
from app.models_orm import Activity, House, Student
from app.routers import auth, students, activities, points, leaderboard, dashboard, admin, analytics
from app.staff_accounts import sync_staff_accounts

app = FastAPI(title="Gurukul Rewards API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(students.router)
app.include_router(activities.router)
app.include_router(points.router)
app.include_router(leaderboard.router)
app.include_router(dashboard.router)
app.include_router(admin.router)
app.include_router(analytics.router)


DEFAULT_ACTIVITIES = [
    {"name": "Cleanliness & Hygiene", "description": "Kept room/area clean and tidy", "points": 10},
    {"name": "Discipline & Punctuality", "description": "On time and well-behaved", "points": 10},
    {"name": "Academic Excellence", "description": "Outstanding classroom/exam performance", "points": 20},
    {"name": "Sports Achievement", "description": "Excelled in sports or games", "points": 15},
    {"name": "Helping Others", "description": "Helped a fellow student or staff member", "points": 10},
    {"name": "Rule Violation", "description": "Broke hostel rules", "points": -10},
]
DEFAULT_HOUSES = [
    {"name": "Atharvaveda", "color": "#dc2626"},
    {"name": "Samveda", "color": "#2563eb"},
    {"name": "Yajurveda", "color": "#ea580c"},
    {"name": "Rugveda", "color": "#16a34a"},
]


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if db.query(Activity).count() == 0:
            for a in DEFAULT_ACTIVITIES:
                db.add(Activity(**a, is_positive=a["points"] >= 0))
        if db.query(House).count() == 0:
            for h in DEFAULT_HOUSES:
                db.add(House(**h))
        else:
            # Upgrade path: if this DB still has the old sample house names
            # (from an earlier version of this template) and nothing has
            # renamed them since, rename them to the new defaults in place
            # instead of leaving stale data or wiping student assignments.
            OLD_DEFAULT_NAMES = ["Ram House", "Krishna House", "Hanuman House", "Ganesh House"]
            existing = db.query(House).order_by(House.name).all()
            existing_names = sorted(h.name for h in existing)
            if existing_names == sorted(OLD_DEFAULT_NAMES):
                rename_map = dict(zip(OLD_DEFAULT_NAMES, [d["name"] for d in DEFAULT_HOUSES]))
                for h in existing:
                    h.name = rename_map[h.name]
                # Students referencing the old names should follow the rename.
                for old_name, new_name in rename_map.items():
                    db.query(Student).filter(Student.house == old_name).update({"house": new_name})
        db.commit()

        # Teacher/Admin logins are managed via app/staff_accounts.json, not
        # self-signup. Re-sync it on every startup so edits to the file take
        # effect on restart.
        sync_staff_accounts(db)
    finally:
        db.close()


@app.get("/api/health")
def health():
    return {"status": "ok"}


# Optional convenience: if a sibling ../frontend directory exists, serve it
# too, so `uvicorn main:app` alone can run the whole app on one port. This is
# entirely optional - you can just as well serve frontend/ separately (e.g.
# with `python -m http.server` or any static host) and only run this API.
_frontend_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend")
if os.path.isdir(_frontend_dir):
    app.mount("/", StaticFiles(directory=_frontend_dir, html=True), name="frontend")
