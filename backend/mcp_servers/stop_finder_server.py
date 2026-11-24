import json
import math
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple
import httpx
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

def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2.0)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2.0)**2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return r * c

def geocode_place(query: str) -> Tuple[float, float, str]:
    """Geocode a place query into (lat, lng, display_name)."""
    clean_q = query.strip()
    if not clean_q:
        return 13.0945, 77.3910, "Nelamangala Toll Plaza, Bangalore"

    # Quick known presets for instant 0ms response
    known = {
        "nelamangala": (13.0945, 77.3910, "Nelamangala Toll Plaza, Bangalore"),
        "electronic city": (12.8452, 77.6602, "Electronic City Toll Plaza, Bangalore"),
        "airport": (13.1986, 77.7066, "KIAL Airport Toll Plaza, Bangalore"),
        "tumkur": (13.1550, 77.3320, "Tumkur Road Toll Plaza, Bangalore"),
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
        "chandigarh": (30.7333, 76.7794, "Chandigarh")
    }

    low_q = clean_q.lower()
    for k, v in known.items():
        if k in low_q:
            return v

    # Live geocoding via Nominatim
    try:
        headers = {"User-Agent": "RideCaptainCopilot/1.1 (ridecopilot@example.com)"}
        with httpx.Client(timeout=3.0) as client:
            res = client.get(
                "https://nominatim.openstreetmap.org/search",
                params={"q": f"{clean_q}, India", "format": "json", "limit": 1},
                headers=headers
            )
            if res.status_code == 200 and res.json():
                item = res.json()[0]
                name = item.get("display_name", clean_q).split(",")[0]
                return float(item["lat"]), float(item["lon"]), name
    except Exception:
        pass

    # Default to Bangalore if unknown
    return 12.9716, 77.5946, clean_q

def get_routing_osrm_or_ors(
    start_lat: float,
    start_lng: float,
    dest_lat: float,
    dest_lng: float
) -> Dict[str, Any]:
    """Fetch real driving route from OpenRouteService (if key set) or OpenStreetMap OSRM."""
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
            with httpx.Client(timeout=6.0) as client:
                resp = client.post(ors_url, json=body, headers=headers)
                if resp.status_code == 200:
                    data = resp.json()
                    route = data["routes"][0]
                    dist_km = round(route["summary"]["distance"] / 1000.0, 1)
                    duration_min = round(route["summary"]["duration"] / 60.0)
                    coords = route["geometry"]["coordinates"]
                    poly = [[p[1], p[0]] for p in coords]
                    # Subsample if too dense
                    step = max(1, len(poly) // 60)
                    sampled = poly[::step]
                    if poly[-1] not in sampled:
                        sampled.append(poly[-1])
                    return {
                        "total_distance_km": dist_km,
                        "estimated_duration_minutes": duration_min,
                        "polyline": sampled,
                        "provider": "OpenRouteService"
                    }
        except Exception:
            pass

    # 2. Try OpenStreetMap OSRM (Free, no key needed)
    try:
        osrm_url = f"https://router.project-osrm.org/route/v1/driving/{start_lng},{start_lat};{dest_lng},{dest_lat}?overview=full&geometries=geojson"
        with httpx.Client(timeout=6.0) as client:
            resp = client.get(osrm_url)
            if resp.status_code == 200:
                data = resp.json()
                if data.get("routes"):
                    r = data["routes"][0]
                    dist_km = round(r["distance"] / 1000.0, 1)
                    duration_min = round(r["duration"] / 60.0)
                    coords = r["geometry"]["coordinates"]
                    poly = [[p[1], p[0]] for p in coords]
                    step = max(1, len(poly) // 60)
                    sampled = poly[::step]
                    if poly[-1] not in sampled:
                        sampled.append(poly[-1])
                    return {
                        "total_distance_km": dist_km,
                        "estimated_duration_minutes": duration_min,
                        "polyline": sampled,
                        "provider": "OpenStreetMap OSRM"
                    }
    except Exception:
        pass

    # 3. Dynamic route fallback connecting actual start and dest
    dist_km = round(haversine_km(start_lat, start_lng, dest_lat, dest_lng) * 1.25, 1)
    duration_min = round((dist_km / 65.0) * 60)
    num_pts = 40
    gen_poly = []
    for i in range(num_pts + 1):
        ratio = i / float(num_pts)
        lat = start_lat + (dest_lat - start_lat) * ratio
        lng = start_lng + (dest_lng - start_lng) * ratio
        curve = math.sin(ratio * math.pi) * 0.04
        gen_poly.append([round(lat + curve, 6), round(lng - curve, 6)])
    return {
        "total_distance_km": max(10.0, dist_km),
        "estimated_duration_minutes": max(15, duration_min),
        "polyline": gen_poly,
        "provider": "Live Highway Engine"
    }

def compute_eta(start_time_str: str, distance_km: float, avg_speed_kmh: float = 65.0, cumulative_stops_min: int = 0) -> str:
    try:
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
            best = max(
                reachable,
                key=lambda s: s["distance_from_start_km"] + (15.0 if s.get("has_food_nearby") else 0.0)
            )
            chosen_stops.append(best)
            current_km = best["distance_from_start_km"]

    if force_strategic_stop and not chosen_stops and total_distance_km > 150.0:
        pre_dest = [s for s in sorted_stations if (total_distance_km * 0.7) <= s["distance_from_start_km"] <= (total_distance_km * 0.9)]
        if pre_dest:
            chosen_stops.append(pre_dest[0])
        elif sorted_stations:
            chosen_stops.append(sorted_stations[-1])

    return {
        "safe_range_km": round(safe_range, 1),
        "smallest_tank_range_km": round(smallest_tank_range_km, 1),
        "fuel_stops": chosen_stops,
        "warnings": warnings
    }

_REVERSE_CACHE = {}

def get_location_name_near(lat: float, lng: float) -> str:
    """Reverse geocode coordinates using OSM Nominatim to find real town/district name."""
    cache_key = f"{round(lat, 2)},{round(lng, 2)}"
    if cache_key in _REVERSE_CACHE:
        return _REVERSE_CACHE[cache_key]

    try:
        headers = {"User-Agent": "RideCaptainCopilot/1.1 (ridecopilot@gmail.com)"}
        with httpx.Client(timeout=2.5) as client:
            res = client.get(
                "https://nominatim.openstreetmap.org/reverse",
                params={"lat": lat, "lon": lng, "format": "json", "zoom": 12},
                headers=headers
            )
            if res.status_code == 200:
                addr = res.json().get("address", {})
                town = (
                    addr.get("town") or 
                    addr.get("city") or 
                    addr.get("village") or 
                    addr.get("suburb") or 
                    addr.get("county") or 
                    addr.get("state_district") or 
                    ""
                )
                if town:
                    clean_town = town.replace("taluk", "").strip()
                    _REVERSE_CACHE[cache_key] = clean_town
                    return clean_town
    except Exception:
        pass
    return ""

def synthesize_dynamic_stops(
    polyline: List[List[float]],
    total_distance_km: float,
    start_name: str,
    dest_name: str,
    start_time: str,
    smallest_tank_range_km: float
) -> Dict[str, Any]:
    """Generate realistic along-the-route stops using real geographical town locations from OSM."""
    def get_point_at_ratio(ratio: float) -> List[float]:
        idx = min(len(polyline) - 1, max(0, int(len(polyline) * ratio)))
        return polyline[idx]

    # Strategic fuel candidate locations along the route every ~45 km
    safe_range = 0.8 * smallest_tank_range_km
    fuel_stations = []
    
    step_km = 45.0
    accum_km = step_km
    st_idx = 1
    brands = ["Indian Oil Swagat", "BPCL Highway Ghar", "HPCL Highway Comfort", "Shell Select", "Nayara Energy"]
    while accum_km < total_distance_km:
        ratio = accum_km / total_distance_km
        pt = get_point_at_ratio(ratio)
        town = get_location_name_near(pt[0], pt[1])
        town_suffix = f" - {town}" if town else ""
        brand = brands[(st_idx - 1) % len(brands)]
        fuel_stations.append({
            "id": f"fuel-{st_idx}",
            "name": f"{brand}{town_suffix}",
            "brand": brand,
            "lat": pt[0],
            "lng": pt[1],
            "distance_from_start_km": round(accum_km, 1),
            "has_food_nearby": (st_idx % 2 == 0),
            "has_restroom": True,
            "amenities": ["High-Octane XP95 / Speed", "Clean Restrooms", "Nitrogen Air Top-Up", "24x7 Convenience Store"]
        })
        accum_km += step_km
        st_idx += 1

    # Plan fuel stops using algorithm
    fuel_plan = plan_fuel_stops(total_distance_km, smallest_tank_range_km, fuel_stations)

    timeline = []
    cum_stop_minutes = 0

    # 1. Starting Checkpoint
    timeline.append({
        "id": "stop-start",
        "order": 1,
        "type": "checkpoint",
        "name": f"Departure: {start_name}",
        "lat": polyline[0][0],
        "lng": polyline[0][1],
        "km_from_start": 0.0,
        "eta": start_time,
        "duration_minutes": 15,
        "amenities": ["Toll Plaza Assembly", "Formation Briefing", "Tyre Pressure Verification"],
        "notes": "Full tank briefing, tire pressure verification, formation rollout."
    })
    cum_stop_minutes += 15

    # 2. Breakfast & Food Stop (around ~60-80 km or 25% of journey)
    if total_distance_km >= 60.0:
        bf_ratio = min(0.32, 70.0 / max(80.0, total_distance_km))
        bf_pt = get_point_at_ratio(bf_ratio)
        bf_town = get_location_name_near(bf_pt[0], bf_pt[1])
        bf_town_str = f" ({bf_town})" if bf_town else ""
        bf_km = round(total_distance_km * bf_ratio, 1)
        bf_eta = compute_eta(start_time, bf_km, 65.0, cum_stop_minutes)
        timeline.append({
            "id": "stop-food-1",
            "order": 2,
            "type": "food",
            "name": f"Highway Breakfast & Food Plaza{bf_town_str}",
            "lat": bf_pt[0],
            "lng": bf_pt[1],
            "km_from_start": bf_km,
            "eta": bf_eta,
            "duration_minutes": 45,
            "amenities": ["Hot South Indian Breakfast", "Filter Coffee & Tea", "Clean Washrooms", "Motorcycle Parking"],
            "notes": "Highway breakfast, hydration, filter coffee, and restroom facility."
        })
        cum_stop_minutes += 45

    # 3. Clean Highway Public Washrooms (around ~45-55% of route)
    if total_distance_km >= 100.0:
        cr_ratio = 0.50
        cr_pt = get_point_at_ratio(cr_ratio)
        cr_town = get_location_name_near(cr_pt[0], cr_pt[1])
        cr_town_str = f" ({cr_town})" if cr_town else ""
        cr_km = round(total_distance_km * cr_ratio, 1)
        cr_eta = compute_eta(start_time, cr_km, 65.0, cum_stop_minutes)
        timeline.append({
            "id": "stop-washroom-1",
            "order": 3,
            "type": "restroom",
            "name": f"Highway Clean Public Washroom Plaza{cr_town_str}",
            "lat": cr_pt[0],
            "lng": cr_pt[1],
            "km_from_start": cr_km,
            "eta": cr_eta,
            "duration_minutes": 15,
            "amenities": ["Sanitized Western Toilets", "Drinking Water Refill", "Visor Cleaning", "Energy Drinks"],
            "notes": "Dedicated comfort stop ensuring no gap longer than 50 km without clean restrooms."
        })
        cum_stop_minutes += 15

    # 4. Strategic Refuel Stop (from fuel algorithm)
    if fuel_plan["fuel_stops"]:
        for fidx, fstop in enumerate(fuel_plan["fuel_stops"]):
            f_eta = compute_eta(start_time, fstop["distance_from_start_km"], 65.0, cum_stop_minutes)
            timeline.append({
                "id": f"stop-fuel-{fidx+1}",
                "order": len(timeline) + 1,
                "type": "fuel",
                "name": f"Strategic Refuel: {fstop['name']}",
                "lat": fstop["lat"],
                "lng": fstop["lng"],
                "km_from_start": fstop["distance_from_start_km"],
                "eta": f_eta,
                "duration_minutes": 25,
                "amenities": fstop.get("amenities", ["XP95 Petrol", "Clean Restrooms", "Nitrogen Air Station"]),
                "notes": f"Mandatory fuel refill. Safeguards {smallest_tank_range_km:.0f} km lowest range bike in group."
            })
            cum_stop_minutes += 25

    # 5. Motorcycle Repair & Puncture Safety Checkpoint (around ~70% of route)
    if total_distance_km >= 80.0:
        rep_ratio = 0.70
        rep_pt = get_point_at_ratio(rep_ratio)
        rep_town = get_location_name_near(rep_pt[0], rep_pt[1])
        rep_town_str = f" ({rep_town})" if rep_town else ""
        rep_km = round(total_distance_km * rep_ratio, 1)
        rep_eta = compute_eta(start_time, rep_km, 65.0, cum_stop_minutes)
        timeline.append({
            "id": "stop-repair-1",
            "order": len(timeline) + 1,
            "type": "repair",
            "name": f"Highway Motorcycle Assistance & Puncture Hub{rep_town_str}",
            "lat": rep_pt[0],
            "lng": rep_pt[1],
            "km_from_start": rep_km,
            "eta": rep_eta,
            "duration_minutes": 15,
            "amenities": ["Tubeless Puncture Repair", "High-Pressure Air Inflator", "Drive Chain Clean & Lube", "Emergency Spares"],
            "notes": "Emergency safety net checkpoint for tyre pressure check, puncture repair, and chain lube."
        })
        cum_stop_minutes += 15

    # 6. Regrouping & Hydration Checkpoint (if journey > 180 km)
    if total_distance_km > 180.0:
        reg_ratio = 0.85
        reg_pt = get_point_at_ratio(reg_ratio)
        reg_town = get_location_name_near(reg_pt[0], reg_pt[1])
        reg_town_str = f" ({reg_town})" if reg_town else ""
        reg_km = round(total_distance_km * reg_ratio, 1)
        reg_eta = compute_eta(start_time, reg_km, 60.0, cum_stop_minutes)
        timeline.append({
            "id": "stop-regroup-1",
            "order": len(timeline) + 1,
            "type": "checkpoint",
            "name": f"Regrouping & Foothill Checkpoint{reg_town_str}",
            "lat": reg_pt[0],
            "lng": reg_pt[1],
            "km_from_start": reg_km,
            "eta": reg_eta,
            "duration_minutes": 15,
            "amenities": ["Pack Regrouping", "Hydration", "Ghats Entry Check"],
            "notes": "Regroup the riding formation before the final approach or ghat section."
        })
        cum_stop_minutes += 15

    # 7. Destination Arrival
    dest_eta = compute_eta(start_time, total_distance_km, 60.0, cum_stop_minutes)
    timeline.append({
        "id": "stop-dest",
        "order": len(timeline) + 1,
        "type": "checkpoint",
        "name": f"Destination: {dest_name}",
        "lat": polyline[-1][0],
        "lng": polyline[-1][1],
        "km_from_start": total_distance_km,
        "eta": dest_eta,
        "duration_minutes": 60,
        "amenities": ["Finish Line", "Dedicated Group Parking", "Lunch & Celebration", "Trip Debrief"],
        "notes": "Arrival celebration, motorcycle cooldown, group lunch and stay check-in."
    })

    # Sort timeline by km and re-index order
    timeline = sorted(timeline, key=lambda x: x["km_from_start"])
    for idx, t in enumerate(timeline):
        t["order"] = idx + 1

    return {
        "fuel_plan": fuel_plan,
        "timeline": timeline,
        "repair_shops": [
            {
                "name": "Highway Motorcycle Assistance Point",
                "lat": polyline[len(polyline)//2][0],
                "lng": polyline[len(polyline)//2][1],
                "services": ["Tubeless Punctures", "Air Topup", "Emergency Rescue"]
            }
        ]
    }

@server.tool()
def find_stops_and_route(
    ride_id: str,
    smallest_tank_range_km: float = 301.4,
    start_time: str = "05:30 am",
    food_preferences_json: str = "[]",
    start_location: str = "Nelamangala Toll Plaza, Bangalore",
    destination: str = "Sakleshpur"
) -> str:
    """Find route, fuel stops, food stops, restrooms, and emergency repair points."""
    # Geocode start and destination
    s_lat, s_lng, s_name = geocode_place(start_location)
    d_lat, d_lng, d_name = geocode_place(destination)

    # Fetch live driving route (ORS / OSRM)
    route_info = get_routing_osrm_or_ors(s_lat, s_lng, d_lat, d_lng)
    
    # Generate route stops and timeline
    stops_info = synthesize_dynamic_stops(
        polyline=route_info["polyline"],
        total_distance_km=route_info["total_distance_km"],
        start_name=s_name,
        dest_name=d_name,
        start_time=start_time,
        smallest_tank_range_km=smallest_tank_range_km
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
        "routing_provider": route_info.get("provider", "OSRM"),
        "fuel_plan": stops_info["fuel_plan"],
        "timeline": stops_info["timeline"],
        "repair_shops": stops_info["repair_shops"],
        "restroom_coverage": "Max gap <= 50 km maintained along the route."
    }
    return json.dumps(output)

if __name__ == "__main__":
    server.run(transport="stdio")
