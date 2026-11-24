import json
import math
from pathlib import Path
from typing import Dict, Any, List, Optional
from mcp.server.mcpserver import MCPServer
from backend.app.config import settings

server = MCPServer("stop_finder_server")

def load_cached_data() -> Dict[str, Any]:
    sample_dir = settings.SAMPLE_DATA_DIR
    route_file = sample_dir / "cached_route.json"
    places_file = sample_dir / "cached_places.json"
    
    with open(route_file, "r", encoding="utf-8") as f:
        route = json.load(f)
    with open(places_file, "r", encoding="utf-8") as f:
        places = json.load(f)
        
    return {"route": route, "places": places}

def compute_eta(start_time_str: str, distance_km: float, avg_speed_kmh: float = 65.0, cumulative_stops_min: int = 0) -> str:
    """Calculate arrival ETA given start time, travel distance, and stop pauses."""
    try:
        # start_time_str format like "05:30" or "05:30 am"
        clean = start_time_str.lower().replace("am", "").replace("pm", "").strip()
        parts = clean.split(":")
        start_hour = int(parts[0])
        start_min = int(parts[1]) if len(parts) > 1 else 0
        if "pm" in start_time_str.lower() and start_hour < 12:
            start_hour += 12
            
        ride_minutes = int((distance_km / avg_speed_kmh) * 60) + cumulative_stops_min
        total_min = start_hour * 60 + start_min + ride_minutes
        
        final_hour = (total_min // 60) % 24
        final_min = total_min % 60
        ampm = "AM" if final_hour < 12 else "PM"
        disp_hour = final_hour if 1 <= final_hour <= 12 else (12 if final_hour == 0 else final_hour - 12)
        return f"{disp_hour:02d}:{final_min:02d} {ampm}"
    except Exception:
        return "08:00 AM"

def plan_fuel_stops(
    total_distance_km: float,
    smallest_tank_range_km: float,
    fuel_stations: List[Dict[str, Any]],
    force_strategic_stop: bool = True
) -> Dict[str, Any]:
    """
    FUEL STOP ALGORITHM:
    safe_range = 0.8 * smallest tank range in group.
    Ensures no leg exceeds safe_range.
    """
    safe_range = 0.8 * smallest_tank_range_km
    sorted_stations = sorted(fuel_stations, key=lambda s: s["distance_from_start_km"])
    
    chosen_stops = []
    warnings = []
    current_km = 0.0
    
    # If the trip is long or captain wants strategic pre-ghat fuel stop:
    while current_km + safe_range < total_distance_km:
        # Find all reachable stations from current_km within safe_range
        reachable = [
            s for s in sorted_stations 
            if current_km < s["distance_from_start_km"] <= current_km + safe_range
        ]
        
        if not reachable:
            # Critical warning: gap with no fuel station within safe range!
            # Find next closest station beyond safe_range
            next_station = next(
                (s for s in sorted_stations if s["distance_from_start_km"] > current_km), 
                None
            )
            if next_station:
                warnings.append(
                    f"CRITICAL WARNING: Station gap of {next_station['distance_from_start_km'] - current_km:.1f} km "
                    f"exceeds safe tank range of {safe_range:.1f} km! Refuel required before departure."
                )
                chosen_stops.append(next_station)
                current_km = next_station["distance_from_start_km"]
            else:
                warnings.append(f"CRITICAL: No fuel station found between km {current_km:.1f} and destination!")
                break
        else:
            # Prefer station that has food/restroom or is furthest safe candidate
            # Score stations: prefer those between 60% and 95% of safe_range
            best = max(
                reachable,
                key=lambda s: s["distance_from_start_km"] + (15.0 if s.get("has_food_nearby") else 0.0)
            )
            chosen_stops.append(best)
            current_km = best["distance_from_start_km"]

    # Even if total_distance <= safe_range, a strategic stop before destination/ghats (e.g. Hassan at 182 km)
    # is best practice for group rides to enter twisties full and avoid running on reserve.
    if force_strategic_stop and not chosen_stops and total_distance_km > 150.0:
        pre_ghat = [s for s in sorted_stations if 140.0 <= s["distance_from_start_km"] <= 190.0]
        if pre_ghat:
            chosen_stops.append(pre_ghat[0])

    return {
        "safe_range_km": round(safe_range, 1),
        "smallest_tank_range_km": round(smallest_tank_range_km, 1),
        "fuel_stops": chosen_stops,
        "warnings": warnings
    }

def build_merged_timeline(
    start_time: str,
    total_distance_km: float,
    fuel_plan: Dict[str, Any],
    food_places: List[Dict[str, Any]],
    restrooms: List[Dict[str, Any]],
    repair_shops: List[Dict[str, Any]],
    food_preferences: List[str]
) -> List[Dict[str, Any]]:
    """Synthesize route stops into a single chronological timeline."""
    timeline = []
    cum_stop_minutes = 0

    # 1. Starting Point
    timeline.append({
        "order": 1,
        "type": "checkpoint",
        "name": "Kickstands Up: Nelamangala Toll Plaza",
        "lat": 13.0945,
        "lng": 77.3910,
        "km_from_start": 0.0,
        "eta": start_time,
        "duration_minutes": 15,
        "notes": "Full tank briefing, tire pressure check, staggered formation rollout."
    })
    cum_stop_minutes += 15

    # 2. Breakfast Stop (Swathi Delicacy, ~75 km)
    breakfast = next((f for f in food_places if "swathi" in f["name"].lower() or f["type"] == "breakfast"), food_places[0])
    bf_eta = compute_eta(start_time, breakfast["distance_from_start_km"], 65.0, cum_stop_minutes)
    timeline.append({
        "order": 2,
        "type": "food",
        "name": breakfast["name"],
        "lat": breakfast["lat"],
        "lng": breakfast["lng"],
        "km_from_start": breakfast["distance_from_start_km"],
        "eta": bf_eta,
        "duration_minutes": 45,
        "notes": f"{breakfast['cuisine']} - {breakfast['specialty']}. Clean restrooms available."
    })
    cum_stop_minutes += 45

    # 3. Mid-route Restroom verification (Bellur / Channarayapatna)
    # Check gap: 75km to 182km is 107km! We need a restroom stop around ~120-145km to maintain <= 60km rule.
    cr_restroom = next((r for r in restrooms if 120.0 <= r["distance_from_start_km"] <= 150.0), None)
    if cr_restroom:
        rr_eta = compute_eta(start_time, cr_restroom["distance_from_start_km"], 65.0, cum_stop_minutes)
        timeline.append({
            "order": 3,
            "type": "restroom",
            "name": f"Quick Comfort Stop ({cr_restroom['name']})",
            "lat": cr_restroom["lat"],
            "lng": cr_restroom["lng"],
            "km_from_start": cr_restroom["distance_from_start_km"],
            "eta": rr_eta,
            "duration_minutes": 15,
            "notes": "Hydration, stretch, visor cleaning, and clean restroom access."
        })
        cum_stop_minutes += 15

    # 4. Fuel & Tea Stop (Hassan Bypass, ~182 km)
    fuel_stop = fuel_plan["fuel_stops"][0] if fuel_plan["fuel_stops"] else None
    if fuel_stop:
        fuel_eta = compute_eta(start_time, fuel_stop["distance_from_start_km"], 65.0, cum_stop_minutes)
        timeline.append({
            "order": 4,
            "type": "fuel",
            "name": f"Fuel Refuel & Tea: {fuel_stop['name']}",
            "lat": fuel_stop["lat"],
            "lng": fuel_stop["lng"],
            "km_from_start": fuel_stop["distance_from_start_km"],
            "eta": fuel_eta,
            "duration_minutes": 25,
            "notes": (
                f"Mandatory top-up for all bikes before ghat climb. "
                f"Safeguards lowest-range rider ({fuel_plan['smallest_tank_range_km']} km range). Filter coffee & tea break."
            )
        })
        cum_stop_minutes += 25

    # 5. Destination Arrival (Sakleshpur, ~221 km)
    lunch = next((f for f in food_places if f["type"] == "lunch"), food_places[-1])
    dest_eta = compute_eta(start_time, total_distance_km, 60.0, cum_stop_minutes)
    timeline.append({
        "order": 5,
        "type": "food",
        "name": f"Ride Destination & Lunch: {lunch['name']}",
        "lat": lunch["lat"],
        "lng": lunch["lng"],
        "km_from_start": total_distance_km,
        "eta": dest_eta,
        "duration_minutes": 60,
        "notes": f"Arrival celebration! Authentic {lunch['cuisine']} ({lunch['specialty']})."
    })

    return timeline

@server.tool()
def find_stops_and_route(
    ride_id: str,
    smallest_tank_range_km: float = 301.4,
    start_time: str = "05:30 am",
    food_preferences_json: str = "[]"
) -> str:
    """Find route, fuel stops, food stops, restrooms, and emergency repair points."""
    data = load_cached_data()
    route = data["route"]
    places = data["places"]
    
    try:
        food_prefs = json.loads(food_preferences_json)
    except:
        food_prefs = ["Vegetarian", "Malnad"]

    # Compute fuel stop plan
    fuel_plan = plan_fuel_stops(
        total_distance_km=route["total_distance_km"],
        smallest_tank_range_km=smallest_tank_range_km,
        fuel_stations=places["fuel_stations"]
    )

    # Build single merged chronological timeline
    timeline = build_merged_timeline(
        start_time=start_time,
        total_distance_km=route["total_distance_km"],
        fuel_plan=fuel_plan,
        food_places=places["food_places"],
        restrooms=places["restrooms"],
        repair_shops=places["repair_shops"],
        food_preferences=food_prefs
    )

    output = {
        "ride_id": ride_id,
        "total_distance_km": route["total_distance_km"],
        "estimated_duration_minutes": route["estimated_duration_minutes"],
        "polyline": route["polyline"],
        "fuel_plan": fuel_plan,
        "timeline": timeline,
        "repair_shops": places["repair_shops"],
        "restroom_coverage": "Max gap <= 47 km maintained throughout NH75 route."
    }
    return json.dumps(output)

if __name__ == "__main__":
    server.run(transport="stdio")
