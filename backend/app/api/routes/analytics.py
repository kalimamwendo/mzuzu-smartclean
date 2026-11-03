from collections import Counter, defaultdict
import json
from math import asin, cos, radians, sin, sqrt
from pathlib import Path

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.db.session import get_db
from app.models import User, WasteReport
from app.schemas.analytics import AnalyticsOut, AnalyticsPoint, HotspotOut
from app.security.auth import require_admin

router = APIRouter(prefix="/admin/analytics", tags=["admin analytics"])

EPS_KM = 0.2
MIN_SAMPLES = 3
EARTH_RADIUS_KM = 6371.0088
BOUNDARY_FILE = Path(__file__).resolve().parents[3] / "data" / "mzuzu_boundary.geojson"


def point_in_ring(latitude: float, longitude: float, ring: list[list[float]]) -> bool:
    inside = False
    previous = ring[-1]
    for current in ring:
        current_longitude, current_latitude = current
        previous_longitude, previous_latitude = previous
        if ((current_latitude > latitude) != (previous_latitude > latitude)) and longitude < (
            (previous_longitude - current_longitude) * (latitude - current_latitude)
            / (previous_latitude - current_latitude) + current_longitude
        ):
            inside = not inside
        previous = current
    return inside


def point_in_geometry(latitude: float, longitude: float, geometry: dict) -> bool:
    if geometry["type"] == "Polygon":
        rings = geometry["coordinates"]
        return point_in_ring(latitude, longitude, rings[0]) and not any(
            point_in_ring(latitude, longitude, ring) for ring in rings[1:]
        )
    if geometry["type"] == "MultiPolygon":
        return any(point_in_geometry(latitude, longitude, {"type": "Polygon", "coordinates": polygon}) for polygon in geometry["coordinates"])
    return False


def load_mzuzu_boundary() -> list[dict]:
    if not BOUNDARY_FILE.exists():
        raise RuntimeError(f"Mzuzu boundary dataset is missing: {BOUNDARY_FILE}")
    payload = json.loads(BOUNDARY_FILE.read_text(encoding="utf-8"))
    return [feature["geometry"] for feature in payload.get("features", []) if feature.get("geometry")]


def distance_km(first: tuple[float, float], second: tuple[float, float]) -> float:
    latitude_one, longitude_one = map(radians, first)
    latitude_two, longitude_two = map(radians, second)
    delta_latitude = latitude_two - latitude_one
    delta_longitude = longitude_two - longitude_one
    haversine = sin(delta_latitude / 2) ** 2 + cos(latitude_one) * cos(latitude_two) * sin(delta_longitude / 2) ** 2
    return 2 * EARTH_RADIUS_KM * asin(sqrt(haversine))


def cluster_reports(reports: list[WasteReport], inside_indexes: set[int]) -> list[int]:
    coordinates = [(report.latitude, report.longitude) for report in reports]
    labels = [None] * len(reports)
    visited = set()
    cluster_id = 0

    def neighbours(index: int) -> list[int]:
        return [candidate for candidate, coordinate in enumerate(coordinates) if candidate in inside_indexes and distance_km(coordinates[index], coordinate) <= EPS_KM]

    for index in range(len(reports)):
        if index in visited or index not in inside_indexes:
            if index not in inside_indexes:
                labels[index] = -1
            continue
        visited.add(index)
        nearby = neighbours(index)
        if len(nearby) < MIN_SAMPLES:
            labels[index] = -1
            continue
        labels[index] = cluster_id
        queue = list(nearby)
        queued = set(queue)
        while queue:
            current = queue.pop(0)
            if current not in visited:
                visited.add(current)
                current_neighbours = neighbours(current)
                if len(current_neighbours) >= MIN_SAMPLES:
                    for candidate in current_neighbours:
                        if candidate not in queued:
                            queue.append(candidate)
                            queued.add(candidate)
            if labels[current] is None or labels[current] == -1:
                labels[current] = cluster_id
        cluster_id += 1
    return [label if label is not None else -1 for label in labels]


@router.get("", response_model=AnalyticsOut)
def get_analytics(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    reports = db.scalars(
        select(WasteReport)
        .options(joinedload(WasteReport.category))
        .order_by(WasteReport.reported_at.desc())
    ).unique().all()
    boundary_geometries = load_mzuzu_boundary()
    inside_indexes = {
        index for index, report in enumerate(reports)
        if any(point_in_geometry(report.latitude, report.longitude, geometry) for geometry in boundary_geometries)
    }
    labels = cluster_reports(reports, inside_indexes)
    category_counts = Counter(report.category.name for report in reports)
    grouped: dict[int, list[WasteReport]] = defaultdict(list)
    for report, label in zip(reports, labels):
        if label != -1:
            grouped[label].append(report)

    hotspots = [
        HotspotOut(
            cluster=cluster,
            number_of_reports=len(cluster_reports),
            average_latitude=sum(report.latitude for report in cluster_reports) / len(cluster_reports),
            average_longitude=sum(report.longitude for report in cluster_reports) / len(cluster_reports),
            categories=dict(Counter(report.category.name for report in cluster_reports)),
        )
        for cluster, cluster_reports in sorted(grouped.items())
    ]
    return AnalyticsOut(
        total_reports=len(reports),
        total_hotspots=len(hotspots),
        isolated_reports=labels.count(-1),
        clustered_percentage=round((len(reports) - labels.count(-1)) / len(reports) * 100, 1) if reports else 0,
        eps_km=EPS_KM,
        min_samples=MIN_SAMPLES,
        category_counts=dict(category_counts),
        hotspots=hotspots,
        points=[
            AnalyticsPoint(
                report_id=str(report.id),
                public_reference=report.public_reference,
                location_description=report.location_description,
                boundary_status="inside" if index in inside_indexes else "outside",
                latitude=report.latitude,
                longitude=report.longitude,
                category=report.category.name,
                cluster=label,
            )
            for index, (report, label) in enumerate(zip(reports, labels))
        ],
    )
