import hashlib
import json
import math
import os
import re
import sqlite3
import threading
import time
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple
import urllib.request
import urllib.parse
import httpx
from mcp.server.mcpserver import MCPServer
from backend.app.config import settings
from backend.app.services.places_service import (
    haversine_km,
    compute_cumulative_distances,
    snap_to_route,
    extract_real_places_from_route,
    get_db_path,
    init_cache_tables
)

server = MCPServer("stop_finder_server")

class GeocodeError(Exception):
    """Raised when geocoding fails to resolve a place query."""
    pass

class RoutingError(Exception):
    """Raised when routing engines fail to find a driving route."""
    pass

# Hardcoded presets used ONLY for exact matches (normalized full-string equality)
KNOWN_EXACT_PRESETS: Dict[str, Tuple[float, float, str]] = {
    "nelamangala toll plaza, bangalore": (13.0945, 77.3910, "Nelamangala Toll Plaza, Bangalore"),
    "electronic city toll plaza, bangalore": (12.8452, 77.6602, "Electronic City Toll Plaza, Bangalore"),
    "kial airport toll plaza, bangalore": (13.1986, 77.7066, "KIAL Airport Toll Plaza, Bangalore"),
    "tumkur road toll plaza, bangalore": (13.1550, 77.3320, "Tumkur Road Toll Plaza, Bangalore"),
    "bangalore": (12.9716, 77.5946, "Bengaluru, Karnataka"),
    "bengaluru": (12.9716, 77.5946, "Bengaluru, Karnataka"),
    "sakleshpur": (12.9733, 75.7833, "Sakleshpur, Karnataka"),
    "ooty": (11.4102, 76.6950, "Udhagamandalam (Ooty), Tamil Nadu"),
    "udhagamandalam": (11.4102, 76.6950, "Udhagamandalam (Ooty), Tamil Nadu"),
    "coorg": (12.4244, 75.7382, "Madikeri (Coorg), Karnataka"),
    "madikeri": (12.4244, 75.7382, "Madikeri (Coorg), Karnataka"),
    "chikmagalur": (13.3161, 75.7720, "Chikkamagaluru, Karnataka"),
    "chikkamagaluru": (13.3161, 75.7720, "Chikkamagaluru, Karnataka"),
    "nandi hills": (13.3702, 77.6835, "Nandi Hills, Karnataka"),
    "mysore": (12.2958, 76.6394, "Mysuru, Karnataka"),
    "mysuru": (12.2958, 76.6394, "Mysuru, Karnataka"),
    "wayanad": (11.6854, 76.1320, "Wayanad, Kerala"),
    "munnar": (10.0889, 77.0595, "Munnar, Kerala"),
    "kodaikanal": (10.2381, 77.4892, "Kodaikanal, Tamil Nadu"),
    "goa": (15.2993, 74.1240, "Panaji, Goa"),
    "panaji": (15.4909, 73.8278, "Panaji, Goa"),
    "candolim": (15.5178, 73.7667, "Candolim, Goa"),
    "hampi": (15.3350, 76.4600, "Hampi, Karnataka"),
    "gokarna": (14.5479, 74.3188, "Gokarna, Karnataka"),
    "dandeli": (15.2410, 74.6230, "Dandeli, Karnataka"),
    "pondicherry": (11.9416, 79.8083, "Puducherry"),
    "puducherry": (11.9416, 79.8083, "Puducherry"),
    "mahabalipuram": (12.6269, 80.1927, "Mahabalipuram, Tamil Nadu"),
    "yercaud": (11.7753, 78.2093, "Yercaud, Tamil Nadu"),
    "shimoga": (13.9299, 75.5681, "Shivamogga, Karnataka"),
    "shivamogga": (13.9299, 75.5681, "Shivamogga, Karnataka"),
    "agumbe": (13.5025, 75.0934, "Agumbe Ghats, Karnataka"),
    "kudremukh": (13.2167, 75.2500, "Kudremukh, Karnataka"),
    "mangalore": (12.9141, 74.8560, "Mangaluru, Karnataka"),
    "mangaluru": (12.9141, 74.8560, "Mangaluru, Karnataka"),
    "lonavala": (18.7557, 73.4091, "Lonavala, Maharashtra"),
    "mahabaleshwar": (17.9307, 73.6477, "Mahabaleshwar, Maharashtra"),
    "lavasa": (18.4100, 73.5070, "Lavasa, Maharashtra"),
    "alibaug": (18.6414, 72.8722, "Alibaug, Maharashtra"),
    "hyderabad": (17.3850, 78.4867, "Hyderabad, Telangana"),
    "chennai": (13.0827, 80.2707, "Chennai, Tamil Nadu"),
    "mumbai": (19.0760, 72.8777, "Mumbai, Maharashtra"),
    "pune": (18.5204, 73.8567, "Pune, Maharashtra"),
    "jaipur": (26.9124, 75.7873, "Jaipur, Rajasthan"),
    "udaipur": (24.5854, 73.7125, "Udaipur, Rajasthan"),
    "rishikesh": (30.0869, 78.2676, "Rishikesh, Uttarakhand"),
    "manali": (32.2432, 77.1892, "Manali, Himachal Pradesh"),
    "shimla": (31.1048, 77.1734, "Shimla, Himachal Pradesh"),
    "leh": (34.1526, 77.5771, "Leh, Ladakh"),
    "ladakh": (34.1526, 77.5771, "Leh, Ladakh"),
    "spiti": (32.2276, 78.0710, "Spiti Valley, Himachal Pradesh"),
    "kanyakumari": (8.0883, 77.5385, "Kanyakumari, Tamil Nadu"),
    "rameswaram": (9.2876, 79.3129, "Rameswaram, Tamil Nadu"),
    "tirupati": (13.6288, 79.4192, "Tirupati, Andhra Pradesh"),
    "belur": (13.1623, 75.8576, "Belur, Karnataka"),
    "kabini": (11.9472, 76.3533, "Kabini, Karnataka"),
    "bandipur": (11.6667, 76.6333, "Bandipur, Karnataka"),
    "valparai": (10.3256, 76.9558, "Valparai, Tamil Nadu"),
    "kolli hills": (11.2485, 78.3389, "Kolli Hills, Tamil Nadu"),
    "hassan": (13.0072, 76.1029, "Hassan, Karnataka"),
    "hubli": (15.3647, 75.1240, "Hubli, Karnataka"),
    "dharwad": (15.3647, 75.1240, "Dharwad, Karnataka"),
    "delhi": (28.6139, 77.2090, "New Delhi"),
    "new delhi": (28.6139, 77.2090, "New Delhi"),
    "chandigarh": (30.7333, 76.7794, "Chandigarh")
}

_nominatim_lock = threading.Lock()
_last_nominatim_time = 0.0

def get_geocode_candidates(query: str, limit: int = 5) -> List[Dict[str, Any]]:
    """
    Search up to 5 geocode candidates for query.
    Uses exact presets first, then SQLite cache, then Nominatim (max 1 req/sec).
    Raises GeocodeError if no results found.
    """
    global _last_nominatim_time
    clean_q = query.strip()
    if not clean_q:
        raise GeocodeError("Location query cannot be empty.")

    norm_q = clean_q.lower()

    # 1. Exact preset match (normalised full-string equality ONLY, never substring)
    if norm_q in KNOWN_EXACT_PRESETS:
        lat, lon, disp = KNOWN_EXACT_PRESETS[norm_q]
        return [{
            "display_name": disp,
            "lat": lat,
            "lon": lon,
            "name": disp.split(",")[0].strip()
        }]

    # 2. Check SQLite cache
    db_file = get_db_path()
    try:
        with sqlite3.connect(db_file) as conn:
            c = conn.cursor()
            c.execute("SELECT candidates_json FROM geocode_cache WHERE query = ?", (norm_q,))
            row = c.fetchone()
            if row:
                cached = json.loads(row[0])
                if cached:
                    return cached[:limit]
    except Exception:
        pass

    # 3. Call Nominatim (rate limited to max 1 req/sec, timeout 8s, countrycodes=in)
    with _nominatim_lock:
        now = time.time()
        elapsed = now - _last_nominatim_time
        if elapsed < 1.05:
            time.sleep(1.05 - elapsed)
        _last_nominatim_time = time.time()

    headers = {"User-Agent": "RideCaptainCopilot/1.1 (https://github.com/praveenkumar0500y/BAROQUE-WORKS)"}
    params = {
        "q": clean_q,
        "format": "json",
        "limit": limit,
        "countrycodes": "in",
        "addressdetails": 1
    }

    try:
        with httpx.Client(timeout=8.0) as client:
            resp = client.get(
                "https://nominatim.openstreetmap.org/search",
                params=params,
                headers=headers
            )
            if resp.status_code == 200:
                raw_items = resp.json()
                candidates = []
                for item in raw_items:
                    disp = item.get("display_name", "")
                    name = disp.split(",")[0].strip()
                    candidates.append({
                        "display_name": disp,
                        "lat": float(item["lat"]),
                        "lon": float(item["lon"]),
                        "name": name
                    })

                # Cache candidates in SQLite
                if candidates:
                    try:
                        with sqlite3.connect(db_file) as conn:
                            c = conn.cursor()
                            c.execute(
                                "INSERT OR REPLACE INTO geocode_cache (query, candidates_json) VALUES (?, ?)",
                                (norm_q, json.dumps(candidates))
                            )
                            conn.commit()
                    except Exception:
                        pass
                    return candidates[:limit]
    except Exception:
        pass

    raise GeocodeError(f"Could not find '{clean_q}'. Try a more specific name.")

def geocode_place(query: str) -> Tuple[float, float, str]:
    """Geocode a place query into (lat, lng, display_name). Raises GeocodeError if not found."""
    candidates = get_geocode_candidates(query, limit=1)
    if not candidates:
        raise GeocodeError(f"Could not find '{query.strip()}'. Try a more specific name.")
    top = candidates[0]
    return top["lat"], top["lon"], top["display_name"]

def get_routing_osrm_or_ors(
    start_lat: float,
    start_lng: float,
    dest_lat: float,
    dest_lng: float
) -> Dict[str, Any]:
    """
    Fetch real driving route keeping FULL route geometry.
    Order: OpenRouteService (if key) -> OSRM public server ("car routing (demo server)").
    If both fail, raises RoutingError. NEVER returns fake curved straight-line route.
    """
    # 1. Try OpenRouteService if API key configured
    if settings.ORS_API_KEY:
        try:
            ors_url = "https://api.openrouteservice.org/v2/directions/driving-car"
            headers = {
                "Authorization": settings.ORS_API_KEY,
                "Content-Type": "application/json"
            }
            body = {
                "coordinates": [[start_lng, start_lat], [dest_lng, dest_lat]],
                "geometry": True
            }
            with httpx.Client(timeout=8.0) as client:
                resp = client.post(ors_url, json=body, headers=headers)
                if resp.status_code == 200:
                    data = resp.json()
                    route = data["routes"][0]
                    dist_km = round(route["summary"]["distance"] / 1000.0, 1)
                    duration_min = round(route["summary"]["duration"] / 60.0)
                    coords = route["geometry"]["coordinates"]
                    poly = [[p[1], p[0]] for p in coords]
                    return {
                        "total_distance_km": dist_km,
                        "estimated_duration_minutes": duration_min,
                        "polyline": poly, # Keep FULL geometry
                        "provider": "OpenRouteService"
                    }
        except Exception:
            pass

    # 2. Try OpenStreetMap OSRM servers (demo car routing)
    osrm_endpoints = [
        f"https://routing.openstreetmap.de/routed-car/route/v1/driving/{start_lng},{start_lat};{dest_lng},{dest_lat}?overview=full&geometries=geojson",
        f"https://router.project-osrm.org/route/v1/driving/{start_lng},{start_lat};{dest_lng},{dest_lat}?overview=full&geometries=geojson"
    ]
    for osrm_url in osrm_endpoints:
        try:
            with httpx.Client(timeout=12.0) as client:
                resp = client.get(osrm_url)
                if resp.status_code == 200:
                    data = resp.json()
                    if data.get("routes"):
                        r = data["routes"][0]
                        dist_km = round(r["distance"] / 1000.0, 1)
                        duration_min = round(r["duration"] / 60.0)
                        coords = r["geometry"]["coordinates"]
                        poly = [[p[1], p[0]] for p in coords]
                        return {
                            "total_distance_km": dist_km,
                            "estimated_duration_minutes": duration_min,
                            "polyline": poly, # Keep FULL geometry
                            "provider": "car routing (demo server)"
                        }
        except Exception:
            continue

    raise RoutingError(
        f"Routing failed: could not compute a driving route between "
        f"({start_lat:.4f}, {start_lng:.4f}) and ({dest_lat:.4f}, {dest_lng:.4f}). "
        f"Ensure both locations are road-accessible."
    )

def compute_eta_from_minutes(start_time_str: str, elapsed_minutes: int) -> str:
    """Compute 12-hour AM/PM string given departure time and elapsed minutes."""
    try:
        clean = start_time_str.lower().replace("am", "").replace("pm", "").strip()
        parts = clean.split(":")
        start_hour = int(parts[0])
        start_min = int(parts[1]) if len(parts) > 1 else 0
        if "pm" in start_time_str.lower() and start_hour < 12:
            start_hour += 12
        elif "am" in start_time_str.lower() and start_hour == 12:
            start_hour = 0

        total_min = start_hour * 60 + start_min + int(elapsed_minutes)
        final_hour = (total_min // 60) % 24
        final_min = total_min % 60
        ampm = "AM" if final_hour < 12 else "PM"
        disp_hour = final_hour if 1 <= final_hour <= 12 else (12 if final_hour == 0 else final_hour - 12)
        return f"{disp_hour:02d}:{final_min:02d} {ampm}"
    except Exception:
        return "08:00 AM"

def get_time_minutes(start_time_str: str, elapsed_minutes: int) -> int:
    """Return total minutes from midnight (0..1439)."""
    try:
        clean = start_time_str.lower().replace("am", "").replace("pm", "").strip()
        parts = clean.split(":")
        start_hour = int(parts[0])
        start_min = int(parts[1]) if len(parts) > 1 else 0
        if "pm" in start_time_str.lower() and start_hour < 12:
            start_hour += 12
        elif "am" in start_time_str.lower() and start_hour == 12:
            start_hour = 0
        return (start_hour * 60 + start_min + int(elapsed_minutes)) % 1440
    except Exception:
        return 480

def plan_fuel_stops(
    total_distance_km: float,
    smallest_tank_range_km: float,
    fuel_stations: List[Dict[str, Any]],
    force_strategic_stop: bool = True
) -> Dict[str, Any]:
    """
    Deterministic fuel planning algorithm adhering to 0.8x bottleneck bike tank range.
    Prefers stations with known brands and food/toilets nearby.
    """
    safe_range = 0.8 * smallest_tank_range_km
    sorted_stations = sorted(fuel_stations, key=lambda s: s["distance_from_start_km"])

    chosen_stops = []
    warnings = []
    current_km = 0.0

    while current_km + safe_range < total_distance_km:
        reachable = [
            s for s in sorted_stations
            if current_km < s["distance_from_start_km"] <= current_km + safe_range
        ]

        if not reachable:
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
            # Score candidate: distance forward + bonus for brand and amenities
            def score_station(st: Dict[str, Any]) -> float:
                score = st["distance_from_start_km"]
                if st.get("has_food_nearby"):
                    score += 15.0
                if st.get("has_restroom"):
                    score += 10.0
                if st.get("brand") in ["Indian Oil", "BPCL", "HPCL", "Shell", "Nayara", "Jio-bp"]:
                    score += 12.0
                return score

            best = max(reachable, key=score_station)
            chosen_stops.append(best)
            current_km = best["distance_from_start_km"]

    # Short ride handling: if total distance is less than safe range, still provide one optional top-up station near the middle
    if not chosen_stops and sorted_stations and total_distance_km > 30.0:
        mid_target = total_distance_km * 0.5
        best_mid = min(sorted_stations, key=lambda s: abs(s["distance_from_start_km"] - mid_target))
        # Mark as optional
        optional_copy = dict(best_mid)
        optional_copy["is_optional"] = True
        chosen_stops.append(optional_copy)

    return {
        "safe_range_km": round(safe_range, 1),
        "smallest_tank_range_km": round(smallest_tank_range_km, 1),
        "fuel_stops": chosen_stops,
        "warnings": warnings
    }

def get_recorded_route_slug(start_name: str, dest_name: str) -> Optional[str]:
    """Map start and dest names to standard recorded route slugs if available."""
    s = start_name.lower()
    d = dest_name.lower()
    if ("bengaluru" in s or "bangalore" in s or "nelamangala" in s) and "sakleshpur" in d:
        return "bengaluru-sakleshpur"
    if ("bengaluru" in s or "bangalore" in s) and ("mysuru" in d or "mysore" in d):
        return "bengaluru-mysuru"
    if ("bengaluru" in s or "bangalore" in s or "nelamangala" in s) and "hassan" in d:
        return "bengaluru-hassan"
    if "pune" in s and "mahabaleshwar" in d:
        return "pune-mahabaleshwar"
    return None

def load_recorded_route(slug: str) -> Optional[Dict[str, Any]]:
    """Load recorded route & places from sample_data/recorded/<slug>.json."""
    rec_file = settings.SAMPLE_DATA_DIR / "recorded" / f"{slug}.json"
    if rec_file.exists():
        try:
            with open(rec_file, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return None
    return None

def score_food_preference(name: str, tags: Dict[str, Any], preferences: List[str]) -> int:
    """Score how well restaurant matches group preferences."""
    score = 0
    text = (name + " " + " ".join(str(v) for v in tags.values())).lower()
    for pref in preferences:
        p = pref.lower().strip()
        if p and p in text:
            score += 10
    if "idli" in text or "dosa" in text or "thatte" in text or "south indian" in text:
        score += 5
    if "pure veg" in text or "vegetarian" in text:
        score += 5
    return score

def select_real_stops_and_timeline(
    polyline: List[List[float]],
    total_distance_km: float,
    total_duration_minutes: int,
    start_name: str,
    dest_name: str,
    start_time: str,
    smallest_tank_range_km: float,
    places_data: Dict[str, List[Dict[str, Any]]],
    food_preferences: List[str],
    data_source: str = "osm"
) -> Dict[str, Any]:
    """
    Select timeline stops from real OSM places.
    Replaces synthetic generator completely. No fabricated names or amenities.
    """
    fuel_stations = places_data.get("fuel_stations", [])
    food_places = places_data.get("food_places", [])
    restrooms = places_data.get("restrooms", [])
    repair_shops = places_data.get("repair_shops", [])

    # 1. Plan fuel stops with algorithm
    fuel_plan = plan_fuel_stops(total_distance_km, smallest_tank_range_km, fuel_stations)
    selected_fuel_stops = fuel_plan["fuel_stops"]

    # Helper: calculate riding minutes from cumulative distance
    def ride_minutes_for_km(km: float) -> int:
        ratio = max(0.0, min(1.0, km / max(1.0, total_distance_km)))
        return int(total_duration_minutes * ratio)

    timeline: List[Dict[str, Any]] = []
    warnings: List[str] = list(fuel_plan.get("warnings", []))
    cum_stop_minutes = 0

    # A. Departure Checkpoint
    dep_eta = compute_eta_from_minutes(start_time, 0)
    timeline.append({
        "id": "stop-start",
        "order": 1,
        "type": "checkpoint",
        "name": f"Departure: {start_name}",
        "brand": "",
        "lat": polyline[0][0],
        "lng": polyline[0][1],
        "km_from_start": 0.0,
        "offset_km": 0.0,
        "eta": dep_eta,
        "duration_minutes": 15,
        "amenities": ["Rider Check-in", "Briefing"],
        "notes": "Full tank briefing, tire pressure verification, formation rollout.",
        "source": data_source,
        "maps_url": f"https://www.google.com/maps/search/?api=1&query={polyline[0][0]:.6f},{polyline[0][1]:.6f}"
    })
    cum_stop_minutes += 15

    # B. Meal Windows & Food Stop Selection
    chosen_food_stops = []
    meal_windows = [
        {"name": "Breakfast", "start_m": 450, "end_m": 570, "duration": 40},
        {"name": "Lunch", "start_m": 750, "end_m": 870, "duration": 50},
        {"name": "Evening Tea", "start_m": 960, "end_m": 1050, "duration": 25}
    ]

    for window in meal_windows:
        candidates_in_window = []
        for fp in food_places:
            fp_km = fp["distance_from_start_km"]
            ride_m = ride_minutes_for_km(fp_km)
            arr_tod = get_time_minutes(start_time, ride_m + cum_stop_minutes)
            if window["start_m"] <= arr_tod <= window["end_m"]:
                score = score_food_preference(fp["name"], fp.get("tags", {}), food_preferences)
                candidates_in_window.append((score, -fp["offset_km"], fp, arr_tod, window))

        if candidates_in_window:
            candidates_in_window.sort(key=lambda x: (x[0], x[1]), reverse=True)
            best_food = candidates_in_window[0][2]
            chosen_food_stops.append({
                "place": best_food,
                "meal": window["name"],
                "duration": window["duration"]
            })
            break

    for item in chosen_food_stops:
        fp = item["place"]
        fp_km = fp["distance_from_start_km"]
        eta = compute_eta_from_minutes(start_time, ride_minutes_for_km(fp_km) + cum_stop_minutes)
        amenities = []
        if fp.get("tags", {}).get("cuisine"):
            amenities.append(f"Cuisine: {fp['tags']['cuisine']}")
        if fp.get("tags", {}).get("diet:vegetarian") == "yes":
            amenities.append("Pure Vegetarian")
        timeline.append({
            "id": fp["id"],
            "order": 0,
            "type": "food",
            "name": f"{item['meal']}: {fp['name']}",
            "brand": fp.get("brand", ""),
            "lat": fp["lat"],
            "lng": fp["lng"],
            "km_from_start": fp_km,
            "offset_km": fp.get("offset_km", 0.0),
            "eta": eta,
            "duration_minutes": item["duration"],
            "amenities": amenities,
            "notes": f"Real mapped dining stop. Match for group preferences.",
            "source": data_source,
            "maps_url": fp.get("maps_url", f"https://www.google.com/maps/search/?api=1&query={fp['lat']},{fp['lng']}")
        })
        cum_stop_minutes += item["duration"]

    # C. Strategic Fuel Refueling Stops
    for fstop in selected_fuel_stops:
        f_km = fstop["distance_from_start_km"]
        f_eta = compute_eta_from_minutes(start_time, ride_minutes_for_km(f_km) + cum_stop_minutes)
        is_opt = fstop.get("is_optional", False)
        prefix = "Optional Top-up: " if is_opt else "Strategic Refuel: "
        notes = (
            "Optional top-up station. Single tank is sufficient for this leg."
            if is_opt else
            f"Mandatory fuel refill. Safeguards {smallest_tank_range_km:.0f} km lowest range bike in group."
        )
        timeline.append({
            "id": fstop["id"],
            "order": 0,
            "type": "fuel",
            "name": f"{prefix}{fstop['name']}",
            "brand": fstop.get("brand", ""),
            "lat": fstop["lat"],
            "lng": fstop["lng"],
            "km_from_start": f_km,
            "offset_km": fstop.get("offset_km", 0.0),
            "eta": f_eta,
            "duration_minutes": 20,
            "amenities": fstop.get("amenities", []),
            "notes": notes,
            "is_optional": is_opt,
            "source": data_source,
            "maps_url": fstop.get("maps_url", f"https://www.google.com/maps/search/?api=1&query={fstop['lat']},{fstop['lng']}")
        })
        cum_stop_minutes += 20

    # D. Restroom Coverage Inspection (max 60 km gap)
    all_restroom_points = []
    for r in restrooms:
        all_restroom_points.append((r["distance_from_start_km"], r["name"], r, "mapped_toilet"))
    for f in fuel_stations:
        if f.get("has_restroom"):
            all_restroom_points.append((f["distance_from_start_km"], f"{f['name']} (Fuel Plaza Washroom)", f, "fuel_washroom"))

    all_restroom_points.sort(key=lambda x: x[0])

    if restrooms:
        best_restroom = restrooms[0]
        r_km = best_restroom["distance_from_start_km"]
        r_eta = compute_eta_from_minutes(start_time, ride_minutes_for_km(r_km) + cum_stop_minutes)
        timeline.append({
            "id": best_restroom["id"],
            "order": 0,
            "type": "restroom",
            "name": f"Restroom Stop: {best_restroom['name']}",
            "brand": best_restroom.get("brand", ""),
            "lat": best_restroom["lat"],
            "lng": best_restroom["lng"],
            "km_from_start": r_km,
            "offset_km": best_restroom.get("offset_km", 0.0),
            "eta": r_eta,
            "duration_minutes": 15,
            "amenities": ["Public Washrooms Mapped"],
            "notes": "Verified public washroom mapped on OpenStreetMap.",
            "source": data_source,
            "maps_url": best_restroom.get("maps_url", "")
        })
        cum_stop_minutes += 15

    # Check for restroom gaps > 60 km
    restroom_checkpoints = [0.0] + [pt[0] for pt in all_restroom_points] + [total_distance_km]
    for idx in range(len(restroom_checkpoints) - 1):
        gap = restroom_checkpoints[idx+1] - restroom_checkpoints[idx]
        if gap > 60.0:
            warnings.append(
                f"RESTROOM GAP WARNING: {gap:.1f} km stretch between km {restroom_checkpoints[idx]:.1f} "
                f"and km {restroom_checkpoints[idx+1]:.1f} has no verified mapped restrooms."
            )

    # E. Motorcycle Repair Shop Coverage Inspection (50 km stretches)
    repair_summary = []
    num_stretches = max(1, int(math.ceil(total_distance_km / 50.0)))
    for s_idx in range(num_stretches):
        s_start = s_idx * 50.0
        s_end = min(total_distance_km, (s_idx + 1) * 50.0)
        shops_in_stretch = [
            rs for rs in repair_shops
            if s_start <= rs["distance_from_start_km"] <= s_end
        ]
        if shops_in_stretch:
            best_shop = shops_in_stretch[0]
            repair_summary.append({
                "stretch": f"km {s_start:.0f}-{s_end:.0f}",
                "status": "MAPPED",
                "name": best_shop["name"],
                "lat": best_shop["lat"],
                "lng": best_shop["lng"],
                "distance_km": best_shop["distance_from_start_km"],
                "maps_url": best_shop.get("maps_url", "")
            })
        else:
            repair_summary.append({
                "stretch": f"km {s_start:.0f}-{s_end:.0f}",
                "status": "UNMAPPED",
                "name": f"No mapped repair shop in this stretch (km {s_start:.0f}-{s_end:.0f})",
                "lat": 0.0,
                "lng": 0.0,
                "distance_km": round((s_start + s_end) / 2.0, 1),
                "maps_url": ""
            })

    # F. Destination Arrival Checkpoint
    dest_eta = compute_eta_from_minutes(start_time, total_duration_minutes + cum_stop_minutes)
    timeline.append({
        "id": "stop-dest",
        "order": 0,
        "type": "checkpoint",
        "name": f"Destination: {dest_name}",
        "brand": "",
        "lat": polyline[-1][0],
        "lng": polyline[-1][1],
        "km_from_start": total_distance_km,
        "offset_km": 0.0,
        "eta": dest_eta,
        "duration_minutes": 60,
        "amenities": ["Arrival Debrief"],
        "notes": "Arrival at destination. Motorcycle cooldown, regrouping, trip debrief.",
        "source": data_source,
        "maps_url": f"https://www.google.com/maps/search/?api=1&query={polyline[-1][0]:.6f},{polyline[-1][1]:.6f}"
    })

    # Sort timeline by km_from_start and assign order
    timeline.sort(key=lambda x: x["km_from_start"])
    for idx, stop in enumerate(timeline):
        stop["order"] = idx + 1

    return {
        "fuel_plan": fuel_plan,
        "timeline": timeline,
        "repair_shops": repair_summary,
        "warnings": warnings
    }

@server.tool()
def find_stops_and_route(
    ride_id: str,
    smallest_tank_range_km: float = 301.4,
    start_time: str = "05:30 am",
    food_preferences_json: str = "[]",
    start_location: str = "Nelamangala Toll Plaza, Bangalore",
    destination: str = "Sakleshpur",
    demo_mode: bool = False
) -> str:
    """Find real route and real OSM stops (fuel, food, restrooms, repairs)."""
    # 1. Geocode
    s_lat, s_lng, s_name = geocode_place(start_location)
    d_lat, d_lng, d_name = geocode_place(destination)

    # 2. Check if a pre-recorded real OSM dataset exists in demo mode
    slug = get_recorded_route_slug(s_name, d_name)
    recorded_data = load_recorded_route(slug) if (demo_mode and slug) else None

    if recorded_data:
        route_info = recorded_data["route"]
        places_data = recorded_data["places"]
        data_source = "cached"
    else:
        # Live routing via ORS / OSRM
        route_info = get_routing_osrm_or_ors(s_lat, s_lng, d_lat, d_lng)
        # Live real places extraction via Overpass
        places_data = extract_real_places_from_route(
            full_polyline=route_info["polyline"],
            total_distance_km=route_info["total_distance_km"]
        )
        data_source = "osm"

    food_prefs = []
    try:
        food_prefs = json.loads(food_preferences_json)
    except Exception:
        food_prefs = []

    stops_result = select_real_stops_and_timeline(
        polyline=route_info["polyline"],
        total_distance_km=route_info["total_distance_km"],
        total_duration_minutes=route_info["estimated_duration_minutes"],
        start_name=s_name,
        dest_name=d_name,
        start_time=start_time,
        smallest_tank_range_km=smallest_tank_range_km,
        places_data=places_data,
        food_preferences=food_prefs,
        data_source=data_source
    )

    output = {
        "ride_id": ride_id,
        "start_location": s_name,
        "start_lat": s_lat,
        "start_lng": s_lng,
        "destination": d_name,
        "dest_lat": d_lat,
        "dest_lng": d_lng,
        "total_distance_km": route_info["total_distance_km"],
        "estimated_duration_minutes": route_info["estimated_duration_minutes"],
        "polyline": route_info["polyline"],
        "routing_provider": route_info.get("provider", "car routing (demo server)"),
        "fuel_plan": stops_result["fuel_plan"],
        "timeline": stops_result["timeline"],
        "repair_shops": stops_result["repair_shops"],
        "warnings": stops_result.get("warnings", []),
        "data_source": data_source
    }
    return json.dumps(output)

if __name__ == "__main__":
    server.run(transport="stdio")
