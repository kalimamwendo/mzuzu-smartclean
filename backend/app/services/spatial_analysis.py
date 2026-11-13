from __future__ import annotations

import json
from collections import Counter, defaultdict
from pathlib import Path
from uuid import UUID, uuid4

import numpy as np
import pandas as pd
from geoalchemy2.elements import WKTElement
from sklearn.cluster import DBSCAN
from sklearn.metrics import silhouette_score
from sqlalchemy import select, update
from sqlalchemy.orm import Session, joinedload
from shapely.geometry import Point, shape
from shapely.ops import unary_union

from app.core.config import settings
from app.models import AnalysisAssignment, AnalysisCluster, AnalysisRun, WasteReport

EPS_METRES = 100
MIN_SAMPLES = 3
EARTH_RADIUS = 6_371_000
DBSCAN_CONFIG = {
    "eps": EPS_METRES / EARTH_RADIUS,
    "min_samples": MIN_SAMPLES,
    "metric": "haversine",
    "algorithm": "ball_tree",
    "leaf_size": 30,
    "n_jobs": -1,
}
PARAMETER_COMBINATIONS = [(25, 3), (25, 4), (50, 3), (50, 4), (50, 5), (75, 4), (75, 5), (100, 5)]


class BoundaryNotVerifiedError(RuntimeError):
    pass


def validate_coordinate(latitude: object, longitude: object) -> bool:
    try:
        latitude = float(latitude)
        longitude = float(longitude)
    except (TypeError, ValueError):
        return False
    return np.isfinite(latitude) and np.isfinite(longitude) and -90 <= latitude <= 90 and -180 <= longitude <= 180


def _load_boundary():
    if not settings.boundary_verified:
        raise BoundaryNotVerifiedError("A verified Mzuzu study boundary is required before boundary-filtered analysis.")
    path = Path(settings.boundary_geojson_path)
    if not path.is_absolute():
        path = Path(__file__).resolve().parents[2] / path
    if not path.exists():
        raise BoundaryNotVerifiedError(f"Verified boundary file was not found: {path}")
    with path.open(encoding="utf-8") as file:
        payload = json.load(file)
    features = payload.get("features", []) if payload.get("type") == "FeatureCollection" else [payload]
    geometries = [shape(feature.get("geometry", feature)) for feature in features if feature.get("geometry", feature)]
    if not geometries:
        raise BoundaryNotVerifiedError("The verified boundary file contains no geometry.")
    return unary_union(geometries)


def _valid_reports(db: Session) -> list[WasteReport]:
    reports = db.scalars(
        select(WasteReport)
        .options(joinedload(WasteReport.category))
        .where(WasteReport.gps_accuracy_m.is_not(None))
        .order_by(WasteReport.reported_at.asc())
    ).unique().all()
    return [report for report in reports if validate_coordinate(report.latitude, report.longitude)]


def _duplicate_groups(reports: list[WasteReport]) -> dict[UUID, UUID]:
    groups: dict[tuple[float, float], UUID] = {}
    report_groups: dict[UUID, UUID] = {}
    for report in reports:
        key = (float(report.latitude), float(report.longitude))
        group_id = groups.setdefault(key, uuid4())
        report_groups[report.id] = group_id
    return report_groups


def _coordinates(reports: list[WasteReport]) -> np.ndarray:
    coordinates = pd.DataFrame(
        [{"latitude": report.latitude, "longitude": report.longitude} for report in reports],
        columns=["latitude", "longitude"],
    ).to_numpy(dtype=float)
    return np.radians(coordinates)


def _cluster(reports: list[WasteReport], eps_metres: int, min_samples: int) -> tuple[np.ndarray, float | None]:
    if not reports:
        return np.empty(0, dtype=int), None
    labels = DBSCAN(
        eps=eps_metres / EARTH_RADIUS,
        min_samples=min_samples,
        **{key: value for key, value in DBSCAN_CONFIG.items() if key not in {"eps", "min_samples"}},
    ).fit_predict(_coordinates(reports))
    unique_labels = set(labels.tolist())
    score = None
    if len(unique_labels - {-1}) >= 2 and len(unique_labels) < len(labels):
        score = float(silhouette_score(_coordinates(reports), labels, metric="haversine"))
    return labels, score


def _representative_geometry(reports: list[WasteReport]):
    points = [Point(report.longitude, report.latitude) for report in reports]
    geometry = unary_union(points).convex_hull
    if geometry.geom_type != "Polygon":
        geometry = geometry.buffer(0.0001)
    return geometry


def run_analysis(db: Session, *, mode: str = "all", eps_metres: int = EPS_METRES, min_samples: int = MIN_SAMPLES) -> AnalysisRun:
    if mode not in {"all", "unique"}:
        raise ValueError("mode must be 'all' or 'unique'")
    boundary = _load_boundary()
    all_reports = _valid_reports(db)
    groups = _duplicate_groups(all_reports)
    duplicate_ids = {report_id for group_id in set(groups.values()) if sum(value == group_id for value in groups.values()) > 1 for report_id, value in groups.items() if value == group_id}
    db.execute(update(WasteReport).where(WasteReport.id.in_(groups)).values(is_duplicate=False, duplicate_group_id=None))
    if duplicate_ids:
        db.execute(update(WasteReport).where(WasteReport.id.in_(duplicate_ids)).values(is_duplicate=True))
        for group_id in set(groups.values()):
            members = [report_id for report_id, value in groups.items() if value == group_id]
            if len(members) > 1:
                db.execute(update(WasteReport).where(WasteReport.id.in_(members)).values(duplicate_group_id=group_id))
    inside = [report for report in all_reports if boundary.covers(Point(report.longitude, report.latitude))]
    selected = inside
    if mode == "unique":
        seen: set[tuple[float, float]] = set()
        selected = []
        for report in inside:
            key = (float(report.latitude), float(report.longitude))
            if key not in seen:
                seen.add(key)
                selected.append(report)
    labels, score = _cluster(selected, eps_metres, min_samples)
    run = AnalysisRun(
        mode=mode,
        eps_metres=eps_metres,
        min_samples=min_samples,
        total_reports=len(all_reports),
        valid_reports=len(inside),
        boundary_excluded=len(all_reports) - len(inside),
        duplicate_reports=len(duplicate_ids),
        cluster_count=len(set(labels.tolist()) - {-1}),
        noise_count=int(np.sum(labels == -1)),
        silhouette_score=score,
        parameters={"eps": eps_metres / EARTH_RADIUS, "metric": "haversine", "algorithm": "ball_tree", "leaf_size": 30, "n_jobs": -1},
    )
    db.add(run)
    for label in sorted(set(labels.tolist()) - {-1}):
        members = [report for report, current in zip(selected, labels) if current == label]
        db.add(AnalysisCluster(
            run_id=run.id,
            cluster_label=int(label),
            report_count=len(members),
            representative_latitude=float(np.mean([report.latitude for report in members])),
            representative_longitude=float(np.mean([report.longitude for report in members])),
            categories=dict(Counter(report.category.name for report in members)),
            geometry=WKTElement(_representative_geometry(members).wkt, srid=4326),
        ))
    for report, label in zip(selected, labels):
        db.add(AnalysisAssignment(run_id=run.id, report_id=report.id, cluster_label=int(label), is_noise=int(label) == -1))
    db.commit()
    db.refresh(run)
    return run


def tune_parameters(db: Session, mode: str = "all") -> list[dict]:
    boundary = _load_boundary()
    reports = [report for report in _valid_reports(db) if boundary.covers(Point(report.longitude, report.latitude))]
    if mode == "unique":
        unique = {}
        for report in reports:
            unique.setdefault((report.latitude, report.longitude), report)
        reports = list(unique.values())
    results = []
    for eps_metres, min_samples in PARAMETER_COMBINATIONS:
        labels, score = _cluster(reports, eps_metres, min_samples)
        results.append({
            "eps_metres": eps_metres,
            "min_samples": min_samples,
            "cluster_count": len(set(labels.tolist()) - {-1}),
            "noise_count": int(np.sum(labels == -1)),
            "silhouette_score": score,
        })
    return results
