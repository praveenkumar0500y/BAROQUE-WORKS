import json
import pytest
from unittest.mock import patch, MagicMock
from backend.app.services.places_service import (
    haversine_km,
    compute_cumulative_distances,
    snap_to_route,
    extract_real_places_from_route
)
from backend.mcp_servers.stop_finder_server import (
    geocode_place,
    GeocodeError,
    RoutingError,
    plan_fuel_stops,
    select_real_stops_and_timeline
)

def test_snap_to_route_and_cumulative_distances():
    # Known straight horizontal polyline:
    # (12.0, 77.0) -> (12.0, 77.5) -> (12.0, 78.0)
    polyline = [[12.0, 77.0], [12.0, 77.5], [12.0, 78.0]]
    dists = compute_cumulative_distances(polyline)

    assert len(dists) == 3
    assert dists[0] == 0.0
    assert dists[1] > 50.0 # ~54.4 km
    assert dists[2] > dists[1]

    # Point directly on first vertex
    d_start, offset_start, idx_start = snap_to_route(12.0, 77.0, polyline, dists)
    assert d_start == 0.0
    assert offset_start == 0.0
    assert idx_start == 0

    # Point midway on first segment with 0.01 deg latitude offset (~1.11 km north)
    d_mid, offset_mid, idx_mid = snap_to_route(12.01, 77.25, polyline, dists)
    assert abs(d_mid - (dists[1] / 2.0)) < 1.0
    assert 1.0 <= offset_mid <= 1.2
    assert idx_mid == 0

def test_corridor_filtering_drops_far_places():
    polyline = [[12.0, 77.0], [12.0, 77.5], [12.0, 78.0]]
    cum_dists = compute_cumulative_distances(polyline)

    # Point A: 0.5 km offset (should be kept)
    # Point B: 3.5 km offset (should be dropped because > 2.0 km)
    # 0.01 deg lat ~= 1.11 km. So 0.004 deg ~= 0.44 km, 0.035 deg ~= 3.89 km
    close_pt = (12.004, 77.2)
    far_pt = (12.035, 77.2)

    dist_a, offset_a, _ = snap_to_route(close_pt[0], close_pt[1], polyline, cum_dists)
    dist_b, offset_b, _ = snap_to_route(far_pt[0], far_pt[1], polyline, cum_dists)

    assert offset_a < 2.0, f"Offset {offset_a} should be < 2 km"
    assert offset_b > 2.0, f"Offset {offset_b} should be > 2 km"

def test_geocoder_unknown_place_raises_error():
    # Mock Nominatim returning empty results
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = []

    with patch("httpx.Client.get", return_value=mock_resp):
        with pytest.raises(GeocodeError) as exc_info:
            geocode_place("xyznonexistentfakeplace12345")
        
        msg = str(exc_info.value)
        assert "Could not find 'xyznonexistentfakeplace12345'. Try a more specific name." in msg
        # Must NEVER default to Bangalore
        assert "Bengaluru" not in msg

def test_fuel_planning_optional_topup_short_ride():
    # Short ride of 80 km with 301.4 km tank range (safe range = 241 km)
    # No mandatory fuel stop needed, but should add 1 optional top-up station near the middle
    smallest_range = 301.4
    total_dist = 80.0

    stations = [
        {"id": "st-1", "name": "IOCL Highway", "distance_from_start_km": 15.0, "has_food_nearby": False, "has_restroom": True, "brand": "Indian Oil"},
        {"id": "st-2", "name": "BPCL Mid-way", "distance_from_start_km": 42.0, "has_food_nearby": True, "has_restroom": True, "brand": "BPCL"},
        {"id": "st-3", "name": "HPCL Near Goal", "distance_from_start_km": 72.0, "has_food_nearby": False, "has_restroom": True, "brand": "HPCL"},
    ]

    res = plan_fuel_stops(
        total_distance_km=total_dist,
        smallest_tank_range_km=smallest_range,
        fuel_stations=stations
    )

    stops = res["fuel_stops"]
    assert len(stops) == 1
    assert stops[0]["is_optional"] is True
    assert stops[0]["name"] == "BPCL Mid-way" # Closest to 40 km (middle)

def test_no_fake_stop_names_in_output():
    # Ensure all output stops use real mapped places and none use old fabricated names
    old_fake_names = [
        "Highway Breakfast & Food Plaza",
        "Highway Clean Public Washroom Plaza",
        "Highway Motorcycle Assistance Point",
        "Highway Motorcycle Assistance & Puncture Hub",
        "Regrouping & Foothill Checkpoint"
    ]

    dummy_polyline = [[12.9716, 77.5946], [12.6, 77.0], [12.2958, 76.6394]]
    total_dist = 143.0
    total_dur = 120

    places = {
        "fuel_stations": [
            {
                "id": "f-1",
                "name": "Indian Oil COCO Ramanagara",
                "brand": "Indian Oil",
                "lat": 12.72,
                "lng": 77.28,
                "distance_from_start_km": 50.0,
                "offset_km": 0.2,
                "has_food_nearby": True,
                "has_restroom": True,
                "amenities": ["XP95 Petrol", "Clean Washrooms", "Food within 300m"]
            }
        ],
        "food_places": [
            {
                "id": "food-1",
                "name": "Kamat Lokaruchi",
                "brand": "Kamat",
                "lat": 12.71,
                "lng": 77.29,
                "distance_from_start_km": 52.0,
                "offset_km": 0.1,
                "tags": {"cuisine": "south_indian", "diet:vegetarian": "yes"}
            }
        ],
        "restrooms": [
            {
                "id": "r-1",
                "name": "Highway Public Restrooms Channapatna",
                "brand": "",
                "lat": 12.65,
                "lng": 77.20,
                "distance_from_start_km": 60.0,
                "offset_km": 0.1,
                "tags": {"amenity": "toilets"}
            }
        ],
        "repair_shops": [
            {
                "id": "rep-1",
                "name": "Sri Krishna Two Wheeler Service",
                "brand": "",
                "lat": 12.60,
                "lng": 77.10,
                "distance_from_start_km": 75.0,
                "offset_km": 0.3,
                "tags": {"shop": "motorcycle_repair"}
            }
        ]
    }

    timeline_result = select_real_stops_and_timeline(
        polyline=dummy_polyline,
        total_distance_km=total_dist,
        total_duration_minutes=total_dur,
        start_name="Bengaluru",
        dest_name="Mysuru",
        start_time="07:00 am",
        smallest_tank_range_km=301.4,
        places_data=places,
        food_preferences=["south indian", "idli"],
        data_source="osm"
    )

    timeline_stops = timeline_result["timeline"]
    assert len(timeline_stops) >= 3

    for stop in timeline_stops:
        name = stop["name"]
        for fake in old_fake_names:
            assert fake not in name, f"Found old fake name '{fake}' in stop '{name}'!"
        # Check source is present
        assert stop.get("source") in ["osm", "cached", "estimated"]
        assert "maps_url" in stop
