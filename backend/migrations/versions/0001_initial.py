"""Initial portable report schema; coordinates are kept in EPSG:4326 fields and POINT text until PostGIS is installed.

Revision ID: 0001_initial
Revises:
"""
from alembic import op
import sqlalchemy as sa

revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
        op.create_table(
        "users",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("display_name", sa.String(120), nullable=False),
        sa.Column("email", sa.String(320), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("role", sa.String(30), server_default="citizen", nullable=False),
        sa.Column("account_status", sa.String(20), server_default="active", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("last_login_at", sa.DateTime(timezone=True)),
        sa.CheckConstraint("role IN ('citizen', 'field_officer', 'admin')", name="ck_users_role"),
        sa.CheckConstraint("account_status IN ('active', 'suspended')", name="ck_users_account_status"),
        sa.UniqueConstraint("email", name="uq_users_email"),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "waste_categories",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("description", sa.Text()),
        sa.Column("is_active", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("name", name="uq_waste_categories_name"),
    )

    op.create_table(
        "waste_reports",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("public_reference", sa.String(24), nullable=False),
        sa.Column("reporter_id", sa.Uuid(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("category_id", sa.Uuid(as_uuid=True), sa.ForeignKey("waste_categories.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("location_description", sa.String(300), nullable=False),
        sa.Column("latitude", sa.Float(), nullable=False),
        sa.Column("longitude", sa.Float(), nullable=False),
        sa.Column("location", sa.String(80), nullable=False),
        sa.Column("gps_accuracy_m", sa.Float()),
        sa.Column("photo_reference", sa.String(500)),
        sa.Column("review_status", sa.String(24), server_default="submitted", nullable=False),
        sa.Column("boundary_status", sa.String(20), server_default="unavailable", nullable=False),
        sa.Column("reported_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("latitude >= -90 AND latitude <= 90", name="ck_waste_reports_latitude_range"),
        sa.CheckConstraint("longitude >= -180 AND longitude <= 180", name="ck_waste_reports_longitude_range"),
        sa.CheckConstraint("gps_accuracy_m IS NULL OR gps_accuracy_m >= 0", name="ck_waste_reports_gps_accuracy_nonnegative"),
        sa.CheckConstraint("review_status IN ('submitted', 'under_review', 'verified', 'resolved', 'rejected')", name="ck_waste_reports_review_status"),
        sa.CheckConstraint("boundary_status IN ('unavailable', 'inside', 'outside', 'pending')", name="ck_waste_reports_boundary_status"),
        sa.UniqueConstraint("public_reference", name="uq_waste_reports_public_reference"),
    )
    op.create_index("ix_waste_reports_category_id", "waste_reports", ["category_id"])
    op.create_index("ix_waste_reports_coordinates", "waste_reports", ["latitude", "longitude"])
    op.create_index("ix_waste_reports_status_created", "waste_reports", ["review_status", "reported_at"])
    op.create_index("ix_waste_reports_public_reference", "waste_reports", ["public_reference"], unique=True)

    op.create_table(
        "report_status_history",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("report_id", sa.Uuid(as_uuid=True), sa.ForeignKey("waste_reports.id", ondelete="CASCADE"), nullable=False),
        sa.Column("previous_status", sa.String(24)),
        sa.Column("new_status", sa.String(24), nullable=False),
        sa.Column("changed_by_user_id", sa.Uuid(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("reason", sa.String(500)),
        sa.Column("changed_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("previous_status IS NULL OR previous_status IN ('submitted', 'under_review', 'verified', 'resolved', 'rejected')", name="ck_report_history_previous_status"),
        sa.CheckConstraint("new_status IN ('submitted', 'under_review', 'verified', 'resolved', 'rejected')", name="ck_report_history_new_status"),
    )
    op.create_index("ix_report_status_history_report_id", "report_status_history", ["report_id"])


def downgrade() -> None:
    op.drop_table("report_status_history")
    op.drop_index("ix_waste_reports_public_reference", table_name="waste_reports")
    op.drop_index("ix_waste_reports_status_created", table_name="waste_reports")
    op.drop_index("ix_waste_reports_coordinates", table_name="waste_reports")
    op.drop_index("ix_waste_reports_category_id", table_name="waste_reports")
    op.drop_table("waste_reports")
    op.drop_table("waste_categories")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
