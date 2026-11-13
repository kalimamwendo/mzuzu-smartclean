from math import asin, cos, radians, sin, sqrt

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.db.session import get_db
from app.models import User, WasteReport
from app.schemas.routing import CollectionRouteOut
from app.security.auth import require_admin
from app.services.spatial_analysis import validate_coordinate

router = APIRouter(prefix="/admin/routing", tags=["collection routing"])
EARTH_RADIUS_KM = 6371.0


def _distance_km(first: WasteReport, second: WasteReport) -> float:
    latitude_delta = radians(second.latitude - first.latitude)
    longitude_delta = radians(second.longitude - first.longitude)
    latitude_one = radians(first.latitude)
    latitude_two = radians(second.latitude)
    value = sin(latitude_delta / 2) ** 2 + cos(latitude_one) * cos(latitude_two) * sin(longitude_delta / 2) ** 2
    return 2 * EARTH_RADIUS_KM * asin(sqrt(min(1.0, value)))


def _route_distance(reports: list[WasteReport]) -> float:
    return sum(_distance_km(first, second) for first, second in zip(reports, reports[1:]))


def _optimized_route(reports: list[WasteReport]) -> list[WasteReport]:
    if len(reports) < 3:
        return reports
    remaining = reports[1:]
    route = [reports[0]]
    while remaining:
        current = route[-1]
        next_report = min(remaining, key=lambda report: _distance_km(current, report))
        route.append(next_report)
        remaining.remove(next_report)
    improved = True
    while improved:
        improved = False
        for start in range(1, len(route) - 2):
            for end in range(start + 1, len(route)):
                candidate = route[:start] + list(reversed(route[start:end])) + route[end:]
                if _route_distance(candidate) + 1e-9 < _route_distance(route):
                    route = candidate
                    improved = True
    return route


@router.get("/optimized", response_model=CollectionRouteOut)
def get_optimized_route(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    reports = db.scalars(
        select(WasteReport)
        .options(joinedload(WasteReport.category))
        .where(WasteReport.review_status != "resolved")
        .order_by(WasteReport.reported_at.asc())
    ).unique().all()
    reports = [report for report in reports if validate_coordinate(report.latitude, report.longitude)]
    route = _optimized_route(reports)
    return CollectionRouteOut(
        stop_count=len(route),
        total_distance_km=round(_route_distance(route), 3),
        method="Nearest-neighbor start with 2-opt improvement; independent report coordinates",
        stops=[
            {
                "sequence": index,
                "report_id": str(report.id),
                "public_reference": report.public_reference,
                "location_description": report.location_description,
                "latitude": report.latitude,
                "longitude": report.longitude,
                "category": report.category.name,
            }
            for index, report in enumerate(route, start=1)
        ],
    )
