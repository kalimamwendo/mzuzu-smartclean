import base64
import secrets
from datetime import UTC
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.db.session import get_db
from app.models import ReportStatusHistory, User, WasteCategory, WasteReport
from app.schemas.reports import ReportAdminOut, ReportCreate, ReportCreated, ReportStatusOut
from app.security.auth import get_current_user

router = APIRouter(prefix="/reports", tags=["reports"])
UPLOAD_DIR = Path(__file__).resolve().parents[3] / "uploads"
MAX_PHOTO_BYTES = 5 * 1024 * 1024
ALLOWED_PHOTO_TYPES = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}


def make_public_reference() -> str:
    return f"MSC-{secrets.token_hex(5).upper()}"


@router.get("/mine", response_model=list[ReportAdminOut])
def get_my_reports(
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.scalars(
        select(WasteReport)
        .options(joinedload(WasteReport.category))
        .where(WasteReport.reporter_id == current_user.id)
        .order_by(WasteReport.reported_at.desc())
        .limit(limit)
    ).unique().all()


@router.post("", response_model=ReportCreated, status_code=status.HTTP_201_CREATED)
def create_report(
    payload: ReportCreate,
    db: Session = Depends(get_db),
    reporter: User = Depends(get_current_user),
):
    category = db.get(WasteCategory, payload.category_id)
    if category is None or not category.is_active:
        raise HTTPException(status_code=422, detail="The selected waste category is not available.")

    photo_reference = payload.photo_reference
    if payload.photo_data_url:
        header, separator, encoded = payload.photo_data_url.partition(",")
        mime_type = header[5:].split(";", 1)[0] if header.startswith("data:") else ""
        extension = ALLOWED_PHOTO_TYPES.get(mime_type)
        if not separator or not extension or ";base64" not in header:
            raise HTTPException(status_code=422, detail="Photo must be a JPEG, PNG, or WebP image.")
        try:
            photo_bytes = base64.b64decode(encoded, validate=True)
        except ValueError:
            raise HTTPException(status_code=422, detail="The photo data is invalid.")
        if not photo_bytes or len(photo_bytes) > MAX_PHOTO_BYTES:
            raise HTTPException(status_code=413, detail="Photo must be smaller than 5 MB.")
        UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        file_name = f"{reporter.id}-{secrets.token_hex(12)}{extension}"
        (UPLOAD_DIR / file_name).write_bytes(photo_bytes)
        photo_reference = f"/uploads/{file_name}"

    if not photo_reference:
        raise HTTPException(status_code=422, detail="A photo is required for each waste report.")

    report = WasteReport(
        public_reference=make_public_reference(),
        reporter_id=reporter.id,
        category_id=category.id,
        description=payload.description,
        location_description=payload.location_description,
        latitude=payload.latitude,
        longitude=payload.longitude,
        location=f"POINT({payload.longitude} {payload.latitude})",
        gps_accuracy_m=payload.gps_accuracy_m,
        photo_reference=photo_reference,
        review_status="submitted",
        # Boundary validation remains unavailable until a verified boundary is installed.
        boundary_status="unavailable",
    )
    db.add(report)
    db.flush()
    db.add(ReportStatusHistory(report_id=report.id, previous_status=None, new_status="submitted", reason="Initial submission"))
    db.commit()
    db.refresh(report)
    return ReportCreated(
        id=report.id,
        public_reference=report.public_reference,
        review_status=report.review_status,
        boundary_status=report.boundary_status,
        reported_at=report.reported_at.astimezone(UTC).isoformat(),
    )


@router.get("/reference/{reference}", response_model=ReportStatusOut)
def get_report_status(
    reference: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    report = db.scalar(
        select(WasteReport)
        .options(joinedload(WasteReport.category))
        .where(WasteReport.public_reference == reference.upper())
    )
    if report is None:
        raise HTTPException(status_code=404, detail="Report reference was not found.")
    if report.reporter_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=404, detail="Report reference was not found.")
    return ReportStatusOut(
        public_reference=report.public_reference,
        category=report.category.name,
        review_status=report.review_status,
        boundary_status=report.boundary_status,
        reported_at=report.reported_at.astimezone(UTC).isoformat(),
    )
