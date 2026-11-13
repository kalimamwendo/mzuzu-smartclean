from datetime import datetime
from pydantic import BaseModel, Field


class AnalysisRequest(BaseModel):
    mode: str = Field(default="all", pattern="^(all|unique)$")
    eps_metres: int = Field(default=100, ge=1)
    min_samples: int = Field(default=4, ge=2)


class TuningResult(BaseModel):
    eps_metres: int
    min_samples: int
    cluster_count: int
    noise_count: int
    silhouette_score: float | None


class AnalysisRunOut(BaseModel):
    id: str
    mode: str
    eps_metres: float
    min_samples: int
    total_reports: int
    valid_reports: int
    boundary_excluded: int
    duplicate_reports: int
    cluster_count: int
    noise_count: int
    silhouette_score: float | None
    parameters: dict
    created_at: datetime


class AnalysisStatsOut(BaseModel):
    run: AnalysisRunOut
    clusters: list[dict]
    noise_points: list[dict]
