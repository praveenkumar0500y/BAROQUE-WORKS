import pytest
from backend.mcp_servers.stop_finder_server import plan_fuel_stops

def test_fuel_stop_algorithm_safe_range():
    # Smallest tank range in group is Rahul's Interceptor 650: 301.4 km
    smallest_range = 301.4
    safe_range = 0.8 * smallest_range # 241.12 km
    
    total_distance = 500.0 # Long ride requiring multiple fuel stops
    
    stations = [
        {"name": "Station A", "distance_from_start_km": 100.0, "has_food_nearby": False},
        {"name": "Station B", "distance_from_start_km": 200.0, "has_food_nearby": True},
        {"name": "Station C", "distance_from_start_km": 350.0, "has_food_nearby": False},
        {"name": "Station D", "distance_from_start_km": 420.0, "has_food_nearby": True},
        {"name": "Station E", "distance_from_start_km": 480.0, "has_food_nearby": False},
    ]
    
    result = plan_fuel_stops(
        total_distance_km=total_distance,
        smallest_tank_range_km=smallest_range,
        fuel_stations=stations
    )
    
    assert result["safe_range_km"] == round(safe_range, 1)
    stops = result["fuel_stops"]
    assert len(stops) >= 2
    
    # Check that no leg exceeds safe_range
    current_km = 0.0
    for stop in stops:
        leg_distance = stop["distance_from_start_km"] - current_km
        assert leg_distance <= safe_range + 0.5, f"Leg {leg_distance} exceeded safe range {safe_range}"
        current_km = stop["distance_from_start_km"]

def test_fuel_stop_algorithm_flags_gap_warning():
    # Simulate a critical desert/remote highway gap where no station exists for 300 km
    smallest_range = 250.0 # safe_range = 200 km
    total_distance = 450.0
    
    sparse_stations = [
        {"name": "First Station", "distance_from_start_km": 50.0},
        # Gap of 350 km! Next station is at 400 km
        {"name": "Far Station", "distance_from_start_km": 400.0}
    ]
    
    result = plan_fuel_stops(
        total_distance_km=total_distance,
        smallest_tank_range_km=smallest_range,
        fuel_stations=sparse_stations
    )
    
    # Must flag critical warning
    assert len(result["warnings"]) > 0
    assert any("CRITICAL WARNING" in w or "Station gap" in w for w in result["warnings"])
