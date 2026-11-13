from pydantic import BaseModel


class CollectionStop(BaseModel):
    sequence: int
    report_id: str
    public_reference: str
    location_description: str
    latitude: float
    longitude: float
    category: str


class CollectionRouteOut(BaseModel):
    stop_count: int
    total_distance_km: float
    method: str
    stops: list[CollectionStop]
