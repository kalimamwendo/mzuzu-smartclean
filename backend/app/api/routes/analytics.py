from collections import Counter, defaultdict

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.db.session import get_db
from app.models import User, WasteReport
from app.schemas.analytics import AnalyticsOut, AnalyticsPoint, HotspotOut
from app.security.auth import require_admin
from app.services.spatial_analysis import EPS_METRES, EARTH_RADIUS, MIN_SAMPLES, _cluster, _valid_reports

router = APIRouter(prefix="/admin/analytics", tags=["admin analytics"])


@router.get("", response_model=AnalyticsOut)
def get_analytics(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    reports = _valid_reports(db)
    labels, _ = _cluster(reports, EPS_METRES, MIN_SAMPLES)
    grouped: dict[int, list[WasteReport]] = defaultdict(list)
    for report, label in zip(reports, labels):
        if label != -1:
            grouped[int(label)].append(report)
    hotspots = [
        HotspotOut(
            cluster=cluster,
            number_of_reports=len(members),
            average_latitude=sum(report.latitude for report in members) / len(members),
            average_longitude=sum(report.longitude for report in members) / len(members),
            categories=dict(Counter(report.category.name for report in members)),
        )
        for cluster, members in sorted(grouped.items())
    ]
    return AnalyticsOut(
        total_reports=len(reports),
        total_hotspots=len(hotspots),
        isolated_reports=int((labels == -1).sum()) if len(labels) else 0,
        clustered_percentage=round((len(reports) - int((labels == -1).sum())) / len(reports) * 100, 1) if reports else 0,
        eps_km=EPS_METRES / 1000,
        min_samples=MIN_SAMPLES,
        category_counts=dict(Counter(report.category.name for report in reports)),
        hotspots=hotspots,
        points=[
            AnalyticsPoint(
                report_id=str(report.id),
                public_reference=report.public_reference,
                location_description=report.location_description,
                boundary_status=report.boundary_status,
                latitude=report.latitude,
                longitude=report.longitude,
                gps_accuracy_m=report.gps_accuracy_m,
                category=report.category.name,
                cluster=int(label),
            )
            for report, label in zip(reports, labels)
        ],
    )
