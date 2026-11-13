from types import SimpleNamespace

import numpy as np

from app.services.spatial_analysis import (
    DBSCAN_CONFIG,
    EARTH_RADIUS,
    PARAMETER_COMBINATIONS,
    _cluster,
    _coordinates,
    validate_coordinate,
)


def report(latitude, longitude, category="General"):
    return SimpleNamespace(latitude=latitude, longitude=longitude, category=SimpleNamespace(name=category))


def test_coordinates_are_radians_in_latitude_longitude_order():
    converted = _coordinates([report(10, 20)])
    assert np.allclose(converted[0], np.radians([10, 20]))


def test_coordinate_validation_rejects_invalid_values():
    assert validate_coordinate(-11.4, 34.0)
    assert not validate_coordinate(91, 34.0)
    assert not validate_coordinate(-11.4, 181)
    assert not validate_coordinate("not-a-number", 34.0)


def test_dbscan_detects_cluster_and_noise():
    reports = [
        report(-11.400000, 34.000000),
        report(-11.400050, 34.000000),
        report(-11.400000, 34.000050),
        report(-11.400050, 34.000050),
        report(-11.410000, 34.010000),
    ]
    labels, score = _cluster(reports, 50, 4)
    assert labels[:4].tolist() == [0, 0, 0, 0]
    assert labels[4] == -1
    assert score is None


def test_dbscan_configuration_and_tuning_candidates():
    assert DBSCAN_CONFIG["eps"] == 100 / EARTH_RADIUS
    assert DBSCAN_CONFIG["min_samples"] == 3
    assert DBSCAN_CONFIG["metric"] == "haversine"
    assert DBSCAN_CONFIG["algorithm"] == "ball_tree"
    assert PARAMETER_COMBINATIONS == [(25, 3), (25, 4), (50, 3), (50, 4), (50, 5), (75, 4), (75, 5), (100, 5)]
