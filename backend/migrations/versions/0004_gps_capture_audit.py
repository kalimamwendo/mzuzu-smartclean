"""Store original GPS fixes and explicit manual map adjustments.

Revision ID: 0004_gps_capture_audit
Revises: 0003_analysis_runs
"""
from alembic import op
import sqlalchemy as sa

revision = "0004_gps_capture_audit"
down_revision = "0003_analysis_runs"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("waste_reports", sa.Column("gps_capture_latitude", sa.Float(), nullable=True))
    op.add_column("waste_reports", sa.Column("gps_capture_longitude", sa.Float(), nullable=True))
    op.add_column("waste_reports", sa.Column("gps_captured_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("waste_reports", sa.Column("manually_adjusted", sa.Boolean(), server_default=sa.false(), nullable=False))
    op.execute(
        """
        UPDATE waste_reports
        SET gps_capture_latitude = latitude,
            gps_capture_longitude = longitude,
            gps_captured_at = COALESCE(reported_at, created_at)
        WHERE gps_capture_latitude IS NULL
        """
    )


def downgrade() -> None:
    op.drop_column("waste_reports", "manually_adjusted")
    op.drop_column("waste_reports", "gps_captured_at")
    op.drop_column("waste_reports", "gps_capture_longitude")
    op.drop_column("waste_reports", "gps_capture_latitude")
