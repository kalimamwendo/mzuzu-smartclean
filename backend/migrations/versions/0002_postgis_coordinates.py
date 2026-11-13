"""Add a PostGIS point column while retaining portable coordinate fields.

Revision ID: 0002_postgis_coordinates
Revises: 0001_initial
"""
from alembic import op
import sqlalchemy as sa
from geoalchemy2 import Geometry

revision = "0002_postgis_coordinates"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return

    op.execute("CREATE EXTENSION IF NOT EXISTS postgis")
    op.add_column(
        "waste_reports",
        sa.Column("location_geom", Geometry("POINT", srid=4326), nullable=True),
    )
    op.execute(
        """
        UPDATE waste_reports
        SET location_geom = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
        WHERE location_geom IS NULL
        """
    )
    op.create_index(
        "ix_waste_reports_location_geom",
        "waste_reports",
        ["location_geom"],
        postgresql_using="gist",
    )


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return
    op.drop_index("ix_waste_reports_location_geom", table_name="waste_reports")
    op.drop_column("waste_reports", "location_geom")
