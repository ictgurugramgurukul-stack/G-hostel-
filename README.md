# Gurukul Rewards - Python + HTML/CSS/JS/TS Edition

A rewrite of the original **Gurukul Star System** app (React + TanStack Start
+ Supabase) into:

- **Backend:** Python (FastAPI)
- **Frontend:** vanilla HTML, CSS, JavaScript, and TypeScript (no React, no
  heavy bundler - just `tsc` compiling `.ts` -> `.js`), branded for
  **Shree Swaminarayan Gurukul International School, Gurugram**
- **Database & Auth:** a local **SQLite** file - no Supabase, no external
  API, no API keys of any kind. Everything runs on your own machine/server.

Same features as before: Super Admin / Teacher / Student dashboards,
awarding points, badges (Bronze -> Legend), certificates, Excel/CSV bulk
import, leaderboards (overall/weekly/monthly, filterable by house/class),
and analytics charts.

## What changed from the Supabase version

- **No external services.** Student/teacher/admin data lives in
  `backend/gurukul.db`, a plain SQLite file created automatically on first
  run. Logins are handled locally (passwords hashed with PBKDF2, sessions
  are self-issued signed tokens) - nothing to sign up for, nothing to
  configure, no service can suspend or rate-limit you.
- **The school logo** now appears top-center on every page.
- **Excel import** now has a `Password` column (see `templates/` below) -
  set one per student, or leave it blank to auto-generate the default
  `Gurukul@<MemberID>`.

## How it fits together

```
gurukul-python/
  backend/     FastAPI app - all business logic + local SQLite database
  frontend/    Static HTML/CSS/TS(compiled to JS) - talks to the FastAPI backend
  templates/   Script that builds the Excel student-import template
```

## 1. Quickstart (one command)

```bash
python3 run.py
```

Nothing to configure first - this installs backend dependencies on first
run if missing, starts the server at `http://localhost:8000/` (serving both
the API and the frontend), and opens it in your browser. Useful flags:
`--port 8080`, `--no-browser`, `--reload` (auto-restart on code changes),
`--host 0.0.0.0` (LAN access).

Teacher/Admin accounts are **not** self-signed-up. They're defined in
`backend/app/staff_accounts.json` and synced into the database every time
the server starts - edit that file, restart the server, and the
name/email/password/role for each account is created or updated to match.
A default Super Admin login is already in there:
`gurugramgurukul@gmail.com` / `Gurukul@123`. See the "Teacher/Admin logins"
section below for details.

## 2. Manual setup (if you'd rather not use run.py)

```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Visit `http://localhost:8000/api/health` - you should see `{"status": "ok"}`,
then `http://localhost:8000/` for the app itself.

Optional overrides live in `backend/.env.example` (copy to `backend/.env`
if you want them) - none are required:
- `DB_PATH` - where the SQLite file is stored (default: `backend/gurukul.db`)
- `SECRET_KEY` - signs login sessions; auto-generated and saved back into
  `.env` on first run if you don't set one
- `TOKEN_LIFETIME_SECONDS` - how long a login stays valid (default: 30 days)
- `CORS_ORIGINS` - which frontend origins may call the API

> Note: this build environment couldn't reach PyPI to actually install and
> run the packages, so everything's been syntax-checked
> (`python -m py_compile` on all Python, a clean `tsc` compile on all
> TypeScript) but not run end-to-end. Please try it locally and let me know
> if anything breaks.

### Running the frontend separately (optional, e.g. while editing)

```bash
cd frontend
python3 -m http.server 5500
```

Then open `http://localhost:5500/index.html`, and make sure
`CORS_ORIGINS` in `backend/.env` includes `http://localhost:5500`.

If you change any `.ts` file, recompile with:

```bash
cd frontend
npm install       # installs the `typescript` dev dependency only, once
npm run build     # or: npm run watch
```

## 3. Importing students from Excel/CSV

A ready-to-use template lives at
`frontend/assets/student_import_template.xlsx` - it's also downloadable
straight from the app (Admin dashboard -> Excel Import tab -> **Download
Template** button). Columns:

| Member ID | Name | Password | Phone Number |
|-----------|------|----------|--------------|
| H001 | Aarav Sharma | MyPass123 | 9876543210 |

- **Member ID** and **Name** are required; Member ID is also the student's
  login username.
- **Password** is optional. Set one to control it exactly, or leave it
  blank and the student gets `Gurukul@<MemberID>` (e.g. `Gurukul@H001`)
  automatically.
- **Phone Number** is optional, digits only.
- You can add extra columns too - the importer also recognizes: Admission
  No, Class, Section, House, Room Number, Gender, Hostel, Photo URL, Date
  of Birth, Parent Name, Parent Phone, Email, Blood Group, Address, Joining
  Date.

To regenerate the template file (e.g. after tweaking its styling), run:

```bash
cd templates
python3 build_template.py
```

## 4. Teacher/Admin logins

There's no sign-up form for staff. Instead, `backend/app/staff_accounts.json`
is the source of truth for every Teacher/Admin login. It's a plain JSON
list:

```json
[
  {"name": "Gurukul Admin", "email": "gurugramgurukul@gmail.com", "password": "Gurukul@123", "type": "admin"},
  {"name": "Some Teacher", "email": "teacher@example.com", "password": "TeacherPass123", "type": "teacher"}
]
```

- `type` must be `"admin"` (Super Admin access) or `"teacher"`.
- On every server startup, each entry is created if it doesn't exist yet,
  or has its name/password/role updated to match the file if it does.
- To add a teacher, remove one, or change a password: edit this file and
  restart the server (or redeploy). There's nothing to do in the app UI.
- This file lives on the server/backend only - it's never sent to the
  frontend.

## 5. Pages

- `index.html` - public landing page (school logo top-center)
- `auth.html` - staff (teacher/admin) sign in, and student sign in
- `app.html` - the authenticated app shell; hash-based routing:
  - `#/student` - student dashboard (points, badges, certificates, QR code, notifications)
  - `#/teacher` - award/deduct points, search students, today's stats
  - `#/admin` - manage students, activities, Excel import, analytics, audit log
  - `#/leaderboard` - overall/weekly/monthly leaderboard + house standings

All guarded by role in `frontend/ts/router.ts`.

## 6. Student login

A student's Member ID is their login username directly (no derived email
needed anymore, since auth is entirely local). Default password (if not set
during import): `Gurukul@<MemberID>`.

## 7. What maps to what (for reference)

| Concern | Where it lives now |
|---|---|
| Database | `backend/app/models_orm.py` (SQLAlchemy) + `backend/gurukul.db` (SQLite file) |
| Password hashing & login tokens | `backend/app/security.py` (stdlib only - PBKDF2 + HMAC-signed tokens) |
| Teacher/Admin login sync from JSON file | `backend/app/staff_accounts.py` + `backend/app/staff_accounts.json` |
| Badge/notification auto-award on point transactions | `backend/app/routers/points.py::award_points` (previously a Postgres trigger) |
| Excel/CSV import (incl. Password column) | `backend/app/routers/students.py` |
| Student dashboard + QR code | `backend/app/routers/dashboard.py` (`qrcode` library, generated locally) |
| Charts | Chart.js (via CDN in `app.html`) |
| Icons | `frontend/ts/icons.ts` (small hand-rolled inline SVG set) |
| Toasts | `frontend/ts/toast.ts` |
| Modals | `frontend/ts/modal.ts` |
| School branding | `frontend/assets/school-logo.jpg`, shown via `.top-logo-bar` in `frontend/css/styles.css` |
