import pytest
from pydantic import ValidationError

from app.schemas.reports import ReportCreate

VALID_REPORT = {
    "category_id": "00000000-0000-0000-0000-000000000001",
    "description": "Waste bags accumulated by the market entrance.",
    "location_description": "Near the main market entrance",
    "latitude": -11.465,
    "longitude": 34.02,
}


def test_report_schema_accepts_valid_coordinates():
    report = ReportCreate.model_validate(VALID_REPORT)
    assert report.latitude == -11.465
    assert report.longitude == 34.02


@pytest.mark.parametrize("field,value", [("latitude", 91), ("latitude", -91), ("longitude", 181), ("longitude", -181)])
def test_report_schema_rejects_coordinates_outside_valid_ranges(field, value):
    with pytest.raises(ValidationError):
        ReportCreate.model_validate({**VALID_REPORT, field: value})


def test_report_schema_requires_a_description():
    with pytest.raises(ValidationError):
        ReportCreate.model_validate({**VALID_REPORT, "description": "bad"})


