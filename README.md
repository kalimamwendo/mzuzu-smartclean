# Mzuzu SmartClean

Mzuzu SmartClean is a responsive waste-reporting application for residents and city teams in Mzuzu, Malawi. The existing React/Vite frontend is being connected incrementally to a FastAPI backend with a local SQLite development database; PostgreSQL/PostGIS is the target for spatial analysis. Detailed architectural and operational documentation is available in [SYSTEM_DOCUMENTATION.md](SYSTEM_DOCUMENTATION.md) and [Mzuzu_SmartClean_System_Documentation.docx](Mzuzu_SmartClean_System_Documentation.docx).

## Current implementation

The backend foundation is in `backend/` and currently includes:

- FastAPI health and readiness endpoints.
- SQLAlchemy models for users, waste categories, waste reports, and report status history.
- A portable initial schema storing latitude/longitude and a POINT text value; PostGIS geometry and GiST indexing remain to be enabled when PostGIS is installed.
- Public category lookup, report submission, and reference-based status lookup endpoints.
- Idempotent seed data for the three initial waste categories.
- Initial API health and request-schema tests.

The API marks boundary validation as `unavailable` until a verified Mzuzu study boundary is supplied. Backend authentication now supports citizen registration, email/password login, signed bearer tokens, and current-user lookup. Report creation and status lookup require authentication; a citizen can view only their own reference, and administrators can view any reference. Administrator report listing and status changes are protected and paginated. Uploads, category administration, the verified boundary, audit logs, and DBSCAN remain later stages. Do not expose it as a production service yet.

## Prerequisites on Windows

- Python 3.11 or later; this project was inspected with Python 3.13.9.
- The current local configuration uses SQLite so login and reporting can run without database credentials. PostgreSQL 18 is installed; PostGIS is not currently installed for it.
- Node.js/npm for the frontend.

`psql.exe` is installed under `C:\Program Files\PostgreSQL\18\bin`, but that directory is not currently on PATH. You can call it by full path or add the PostgreSQL `bin` folder to PATH.

## Backend setup

From the project root in PowerShell:

```powershell
Set-Location backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
Copy-Item .env.example .env
```

The working local setup can continue using `sqlite:///./smartclean.db`. For PostgreSQL/PostGIS, set `DATABASE_URL` to a `postgresql+psycopg://...` connection string, ensure PostGIS is installed, and run `alembic upgrade head` from `backend/`. The application creates the PostGIS extension when it starts against PostgreSQL; the migration also adds and backfills the EPSG:4326 point column with a GiST index. Temporary development accounts are enabled in the local `.env`; public registration still creates citizen accounts only.

Local development sign-in: citizen `citizen@smartclean.mw` / `CleanCity2026!`; administrator `admin@smartclean.mw` / `SmartCleanDemo26!`. These are development-only credentials. Never commit `backend/.env` or database passwords.

Start the API:

```powershell
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Open API documentation at `http://127.0.0.1:8000/docs`. The Vite frontend runs on `http://localhost:5173`; that origin is the development CORS default.

## API routes currently available

- `POST /api/v1/auth/register` -- creates a citizen account and returns a bearer token. Public registration cannot assign staff roles.
- `POST /api/v1/auth/login` -- verifies email/password and returns a bearer token.
- `GET /api/v1/auth/me` -- returns the authenticated account.
- `GET /api/v1/admin/reports` -- administrator-only paginated report list, with optional status/category filters.
- `PATCH /api/v1/admin/reports/{report_id}/status` -- administrator-only status change with history recording.
- `GET /api/v1/admin/analytics` -- administrator-only DBSCAN hotspot clusters, report points, category counts, and summary metrics.
- `GET /api/v1/health` — process liveness; does not require a database connection.
- `GET /api/v1/health/ready` — verifies the configured database connection.
- `GET /api/v1/categories` — returns active categories.
- `POST /api/v1/reports` — stores an authenticated report with validated EPSG:4326 coordinates and initial status-history row.
- `GET /api/v1/reports/reference/{reference}` — returns the submitted report status by public reference.

Set `SECRET_KEY` in `backend/.env` to at least 32 random characters before using authentication. Report submission accepts a JSON body with `category_id`, `description`, `location_description`, `latitude`, `longitude`, and optional `gps_accuracy_m` and `photo_reference`. Report photographs are uploaded to the backend local uploads directory, limited to JPEG, PNG, and WebP up to 5 MB. Configure durable/private storage before production.

## Tests

From `backend/` with the virtual environment active:

```powershell
pytest
```

The API runs against the configured database. SQLite remains supported for local development; PostgreSQL uses Psycopg 3, connection pooling, and the PostGIS `location_geom` column while retaining the original latitude and longitude fields.

## Current limits and next steps

- The React frontend calls the API for authentication, categories, citizen reports, and administrator report review. The local database currently contains zero waste reports; no sample reports are seeded. Set `VITE_API_URL` in the frontend environment if the API runs at a different origin.
- Staff accounts must be provisioned by a trusted database/admin process; public signup always creates a citizen.
- Password recovery is not connected because no email delivery service is configured.
- No verified boundary dataset has been provided. Reports remain explicitly marked boundary validation unavailable.
- DBSCAN uses scikit-learn Haversine distance with a 50 m / 4-sample default, supports all-report and unique-location modes, parameter tuning, duplicate flags, and persisted analysis runs.
- Boundary-filtered analysis endpoints intentionally return a clear error until `BOUNDARY_VERIFIED=true` is set for a trusted study boundary; the existing GeoJSON is not assumed to be verified.
- Current local runtime: API at `http://127.0.0.1:8000`, frontend at `http://localhost:5173`; `GET /api/v1/health/ready` reports the database as connected.
- Next spatial step: install PostGIS and import only a verified boundary dataset before enabling boundary validation.
