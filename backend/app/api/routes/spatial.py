from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.db.session import get_db
from app.models import AnalysisAssignment, AnalysisCluster, AnalysisRun, User, WasteReport
from app.schemas.spatial import AnalysisRequest, AnalysisRunOut, AnalysisStatsOut, TuningResult
from app.security.auth import require_admin
from app.services.spatial_analysis import BoundaryNotVerifiedError, run_analysis, tune_parameters

router = APIRouter(prefix="/admin/spatial", tags=["spatial analysis"])


def _run_out(run: AnalysisRun) -> AnalysisRunOut:
    return AnalysisRunOut(
        id=str(run.id), mode=run.mode, eps_metres=run.eps_metres, min_samples=run.min_samples,
        total_reports=run.total_reports, valid_reports=run.valid_reports, boundary_excluded=run.boundary_excluded,
        duplicate_reports=run.duplicate_reports, cluster_count=run.cluster_count, noise_count=run.noise_count,
        silhouette_score=run.silhouette_score, parameters=run.parameters, created_at=run.created_at,
    )


@router.post("/runs", response_model=AnalysisRunOut, status_code=status.HTTP_201_CREATED)
def create_analysis(payload: AnalysisRequest, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    try:
        return _run_out(run_analysis(db, mode=payload.mode, eps_metres=payload.eps_metres, min_samples=payload.min_samples))
    except BoundaryNotVerifiedError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error


@router.post("/tune", response_model=list[TuningResult])
def tune_analysis(mode: str = "all", db: Session = Depends(get_db), _: User = Depends(require_admin)):
    try:
        return tune_parameters(db, mode)
    except BoundaryNotVerifiedError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error


@router.get("/runs/latest", response_model=AnalysisStatsOut)
def latest_analysis(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    run = db.scalar(select(AnalysisRun).order_by(AnalysisRun.created_at.desc()).limit(1))
    if run is None:
        raise HTTPException(status_code=404, detail="No spatial analysis has been run.")
    clusters = db.scalars(select(AnalysisCluster).where(AnalysisCluster.run_id == run.id).order_by(AnalysisCluster.cluster_label)).all()
    assignments = db.scalars(
        select(AnalysisAssignment).options(joinedload(AnalysisAssignment.report).joinedload(WasteReport.category))
        .where(AnalysisAssignment.run_id == run.id, AnalysisAssignment.is_noise.is_(True))
    ).all()
    return AnalysisStatsOut(
        run=_run_out(run),
        clusters=[{
            "cluster": cluster.cluster_label,
            "report_count": cluster.report_count,
            "representative_latitude": cluster.representative_latitude,
            "representative_longitude": cluster.representative_longitude,
            "categories": cluster.categories,
        } for cluster in clusters],
        noise_points=[{
            "report_id": str(item.report_id),
            "latitude": item.report.latitude,
            "longitude": item.report.longitude,
            "category": item.report.category.name,
        } for item in assignments],
    )
