from datetime import datetime
from uuid import UUID, uuid4

import sqlalchemy as sa
from sqlalchemy import Boolean, CheckConstraint, DateTime, Float, ForeignKey, Index, Integer, String, Text, UniqueConstraint, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from geoalchemy2 import Geometry

from app.db.session import Base
from app.models.enums import AccountStatus, BoundaryStatus, ReportStatus, UserRole


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint("role IN ('citizen', 'field_officer', 'admin')", name="ck_users_role"),
        CheckConstraint("account_status IN ('active', 'suspended')", name="ck_users_account_status"),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    display_name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(320), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(30), default=UserRole.CITIZEN, nullable=False)
    account_status: Mapped[str] = mapped_column(String(20), default=AccountStatus.ACTIVE, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    reports: Mapped[list["WasteReport"]] = relationship(back_populates="reporter", foreign_keys="WasteReport.reporter_id")


class WasteCategory(Base):
    __tablename__ = "waste_categories"

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    name: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    reports: Mapped[list["WasteReport"]] = relationship(back_populates="category")


class WasteReport(Base):
    __tablename__ = "waste_reports"
    __table_args__ = (
        CheckConstraint("latitude >= -90 AND latitude <= 90", name="ck_waste_reports_latitude_range"),
        CheckConstraint("longitude >= -180 AND longitude <= 180", name="ck_waste_reports_longitude_range"),
        CheckConstraint("gps_accuracy_m IS NULL OR gps_accuracy_m >= 0", name="ck_waste_reports_gps_accuracy_nonnegative"),
        CheckConstraint("review_status IN ('submitted', 'under_review', 'verified', 'resolved', 'rejected')", name="ck_waste_reports_review_status"),
        CheckConstraint("boundary_status IN ('unavailable', 'inside', 'outside', 'pending')", name="ck_waste_reports_boundary_status"),
        Index("ix_waste_reports_coordinates", "latitude", "longitude"),
        Index("ix_waste_reports_status_created", "review_status", "reported_at"),
        Index("ix_waste_reports_duplicate_group", "duplicate_group_id"),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    public_reference: Mapped[str] = mapped_column(String(24), unique=True, nullable=False)
    reporter_id: Mapped[UUID | None] = mapped_column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"))
    category_id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("waste_categories.id", ondelete="RESTRICT"), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    location_description: Mapped[str] = mapped_column(String(300), nullable=False)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    gps_capture_latitude: Mapped[float | None] = mapped_column(Float)
    gps_capture_longitude: Mapped[float | None] = mapped_column(Float)
    gps_captured_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    manually_adjusted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    location: Mapped[str] = mapped_column(String(80), nullable=False)
    location_geom: Mapped[object | None] = mapped_column(
        Geometry("POINT", srid=4326, spatial_index=False).with_variant(String(80), "sqlite"),
        nullable=True,
    )
    is_duplicate: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    duplicate_group_id: Mapped[UUID | None] = mapped_column(Uuid(as_uuid=True))
    gps_accuracy_m: Mapped[float | None] = mapped_column(Float)
    photo_reference: Mapped[str | None] = mapped_column(String(500))
    review_status: Mapped[str] = mapped_column(String(24), default=ReportStatus.SUBMITTED, nullable=False)
    boundary_status: Mapped[str] = mapped_column(String(20), default=BoundaryStatus.UNAVAILABLE, nullable=False)
    reported_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    reporter: Mapped[User | None] = relationship(back_populates="reports", foreign_keys=[reporter_id])
    category: Mapped[WasteCategory] = relationship(back_populates="reports")
    status_history: Mapped[list["ReportStatusHistory"]] = relationship(back_populates="report", cascade="all, delete-orphan")


class AnalysisRun(Base):
    __tablename__ = "analysis_runs"

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    mode: Mapped[str] = mapped_column(String(20), nullable=False)
    eps_metres: Mapped[float] = mapped_column(Float, nullable=False)
    min_samples: Mapped[int] = mapped_column(Integer, nullable=False)
    total_reports: Mapped[int] = mapped_column(Integer, nullable=False)
    valid_reports: Mapped[int] = mapped_column(Integer, nullable=False)
    boundary_excluded: Mapped[int] = mapped_column(Integer, nullable=False)
    duplicate_reports: Mapped[int] = mapped_column(Integer, nullable=False)
    cluster_count: Mapped[int] = mapped_column(Integer, nullable=False)
    noise_count: Mapped[int] = mapped_column(Integer, nullable=False)
    silhouette_score: Mapped[float | None] = mapped_column(Float)
    parameters: Mapped[dict] = mapped_column(sa.JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    clusters: Mapped[list["AnalysisCluster"]] = relationship(back_populates="run", cascade="all, delete-orphan")
    assignments: Mapped[list["AnalysisAssignment"]] = relationship(back_populates="run", cascade="all, delete-orphan")


class AnalysisCluster(Base):
    __tablename__ = "analysis_clusters"

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    run_id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("analysis_runs.id", ondelete="CASCADE"), nullable=False)
    cluster_label: Mapped[int] = mapped_column(Integer, nullable=False)
    report_count: Mapped[int] = mapped_column(Integer, nullable=False)
    representative_latitude: Mapped[float] = mapped_column(Float, nullable=False)
    representative_longitude: Mapped[float] = mapped_column(Float, nullable=False)
    categories: Mapped[dict] = mapped_column(sa.JSON, nullable=False)
    geometry: Mapped[object | None] = mapped_column(Geometry("POLYGON", srid=4326, spatial_index=False), nullable=True)

    run: Mapped[AnalysisRun] = relationship(back_populates="clusters")


class AnalysisAssignment(Base):
    __tablename__ = "analysis_assignments"

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    run_id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("analysis_runs.id", ondelete="CASCADE"), nullable=False)
    report_id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("waste_reports.id", ondelete="CASCADE"), nullable=False)
    cluster_label: Mapped[int] = mapped_column(Integer, nullable=False)
    is_noise: Mapped[bool] = mapped_column(Boolean, nullable=False)

    run: Mapped[AnalysisRun] = relationship(back_populates="assignments")
    report: Mapped[WasteReport] = relationship()


class ReportStatusHistory(Base):
    __tablename__ = "report_status_history"
    __table_args__ = (
        CheckConstraint("previous_status IS NULL OR previous_status IN ('submitted', 'under_review', 'verified', 'resolved', 'rejected')", name="ck_report_history_previous_status"),
        CheckConstraint("new_status IN ('submitted', 'under_review', 'verified', 'resolved', 'rejected')", name="ck_report_history_new_status"),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    report_id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("waste_reports.id", ondelete="CASCADE"), nullable=False)
    previous_status: Mapped[str | None] = mapped_column(String(24))
    new_status: Mapped[str] = mapped_column(String(24), nullable=False)
    changed_by_user_id: Mapped[UUID | None] = mapped_column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"))
    reason: Mapped[str | None] = mapped_column(String(500))
    changed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    report: Mapped[WasteReport] = relationship(back_populates="status_history")
