"""Persist DBSCAN analysis runs, clusters, assignments, and duplicate flags.

Revision ID: 0003_analysis_runs
Revises: 0002_postgis_coordinates
"""
from alembic import op
import sqlalchemy as sa
from geoalchemy2 import Geometry

revision = "0003_analysis_runs"
down_revision = "0002_postgis_coordinates"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("waste_reports", sa.Column("is_duplicate", sa.Boolean(), server_default=sa.false(), nullable=False))
    op.add_column("waste_reports", sa.Column("duplicate_group_id", sa.Uuid(), nullable=True))
    op.create_index("ix_waste_reports_duplicate_group", "waste_reports", ["duplicate_group_id"])

    op.create_table(
        "analysis_runs",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("mode", sa.String(20), nullable=False),
        sa.Column("eps_metres", sa.Float(), nullable=False),
        sa.Column("min_samples", sa.Integer(), nullable=False),
        sa.Column("total_reports", sa.Integer(), nullable=False),
        sa.Column("valid_reports", sa.Integer(), nullable=False),
        sa.Column("boundary_excluded", sa.Integer(), nullable=False),
        sa.Column("duplicate_reports", sa.Integer(), nullable=False),
        sa.Column("cluster_count", sa.Integer(), nullable=False),
        sa.Column("noise_count", sa.Integer(), nullable=False),
        sa.Column("silhouette_score", sa.Float()),
        sa.Column("parameters", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_table(
        "analysis_clusters",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("run_id", sa.Uuid(), sa.ForeignKey("analysis_runs.id", ondelete="CASCADE"), nullable=False),
        sa.Column("cluster_label", sa.Integer(), nullable=False),
        sa.Column("report_count", sa.Integer(), nullable=False),
        sa.Column("representative_latitude", sa.Float(), nullable=False),
        sa.Column("representative_longitude", sa.Float(), nullable=False),
        sa.Column("categories", sa.JSON(), nullable=False),
        sa.Column("geometry", Geometry("POLYGON", srid=4326)),
    )
    op.create_table(
        "analysis_assignments",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("run_id", sa.Uuid(), sa.ForeignKey("analysis_runs.id", ondelete="CASCADE"), nullable=False),
        sa.Column("report_id", sa.Uuid(), sa.ForeignKey("waste_reports.id", ondelete="CASCADE"), nullable=False),
        sa.Column("cluster_label", sa.Integer(), nullable=False),
        sa.Column("is_noise", sa.Boolean(), nullable=False),
    )
    op.create_index("ix_analysis_assignments_run_id", "analysis_assignments", ["run_id"])
    op.create_index("ix_analysis_assignments_report_id", "analysis_assignments", ["report_id"])


def downgrade() -> None:
    op.drop_index("ix_analysis_assignments_report_id", table_name="analysis_assignments")
    op.drop_index("ix_analysis_assignments_run_id", table_name="analysis_assignments")
    op.drop_table("analysis_assignments")
    op.drop_table("analysis_clusters")
    op.drop_table("analysis_runs")
    op.drop_index("ix_waste_reports_duplicate_group", table_name="waste_reports")
    op.drop_column("waste_reports", "duplicate_group_id")
    op.drop_column("waste_reports", "is_duplicate")
