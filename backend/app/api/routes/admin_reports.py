from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.db.session import get_db
from app.models import ReportStatusHistory, User, WasteCategory, WasteReport
from app.models.enums import ReportStatus
from app.schemas.reports import ReportAdminOut, ReportPage, ReportStatusUpdate
from app.security.auth import require_admin

router = APIRouter(prefix="/admin/reports", tags=["admin reports"])


@router.get("", response_model=ReportPage)
def list_reports(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    report_status: ReportStatus | None = Query(default=None, alias="status"),
    category_id: UUID | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    filters = []
    if report_status is not None:
        filters.append(WasteReport.review_status == report_status.value)
    if category_id is not None:
        filters.append(WasteReport.category_id == category_id)

    total = db.scalar(select(func.count()).select_from(WasteReport).where(*filters)) or 0
    reports = db.scalars(
        select(WasteReport)
        .options(joinedload(WasteReport.category))
        .where(*filters)
        .order_by(WasteReport.reported_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).unique().all()
    return ReportPage(items=reports, total=total, page=page, page_size=page_size)


@router.patch("/{report_id}/status", response_model=ReportAdminOut)
def update_report_status(
    report_id: UUID,
    payload: ReportStatusUpdate,
    db: Session = Depends(get_db),
    reviewer: User = Depends(require_admin),
):
    report = db.scalar(
        select(WasteReport).options(joinedload(WasteReport.category)).where(WasteReport.id == report_id)
    )
    if report is None:
        raise HTTPException(status_code=404, detail="Report was not found.")

    old_status = report.review_status
    new_status = payload.status.value
    if old_status == new_status:
        return report

    report.review_status = new_status
    db.add(ReportStatusHistory(
        report_id=report.id,
        previous_status=old_status,
        new_status=new_status,
        changed_by_user_id=reviewer.id,
        reason=payload.reason,
    ))
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise
    db.refresh(report)
    return report
