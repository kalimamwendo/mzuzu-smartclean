from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import ReportStatus


class CategoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    name: str
    description: str | None
    is_active: bool


class ReportCreate(BaseModel):
    category_id: UUID
    description: str = Field(min_length=5, max_length=5000)
    location_description: str = Field(min_length=2, max_length=300)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    gps_capture_latitude: float | None = Field(default=None, ge=-90, le=90)
    gps_capture_longitude: float | None = Field(default=None, ge=-180, le=180)
    gps_captured_at: datetime | None = None
    gps_accuracy_m: float | None = Field(default=None, ge=0, le=100000)
    manually_adjusted: bool = False
    photo_reference: str | None = Field(default=None, max_length=500)
    photo_data_url: str | None = Field(default=None, max_length=7_000_000)


class ReportCreated(BaseModel):
    id: UUID
    public_reference: str
    review_status: str
    boundary_status: str
    reported_at: str


class ReportStatusOut(BaseModel):
    public_reference: str
    category: str
    review_status: str
    boundary_status: str
    reported_at: str


class ReportStatusUpdate(BaseModel):
    status: ReportStatus
    reason: str | None = Field(default=None, max_length=500)


class ReportAdminOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    public_reference: str
    category: CategoryOut
    description: str
    location_description: str
    latitude: float
    longitude: float
    gps_capture_latitude: float | None
    gps_capture_longitude: float | None
    gps_captured_at: datetime | None
    gps_accuracy_m: float | None
    manually_adjusted: bool
    review_status: str
    boundary_status: str
    reported_at: datetime
    photo_reference: str | None


class ReportPage(BaseModel):
    items: list[ReportAdminOut]
    total: int
    page: int
    page_size: int
