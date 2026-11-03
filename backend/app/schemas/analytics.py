from pydantic import BaseModel


class AnalyticsPoint(BaseModel):
    report_id: str
    public_reference: str
    location_description: str
    boundary_status: str
    latitude: float
    longitude: float
    category: str
    cluster: int


class HotspotOut(BaseModel):
    cluster: int
    number_of_reports: int
    average_latitude: float
    average_longitude: float
    categories: dict[str, int]


class AnalyticsOut(BaseModel):
    total_reports: int
    total_hotspots: int
    isolated_reports: int
    clustered_percentage: float
    eps_km: float
    min_samples: int
    category_counts: dict[str, int]
    hotspots: list[HotspotOut]
    points: list[AnalyticsPoint]
