import argparse
import json
import os
import sys
from datetime import datetime
from pathlib import Path

# Ensure root dir is in sys.path
root_dir = Path(__file__).resolve().parent.parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

from backend.mcp_servers.stop_finder_server import geocode_place, get_routing_osrm_or_ors
from backend.app.services.places_service import extract_real_places_from_route

RECORDED_DIR = root_dir / "sample_data" / "recorded"
RECORDED_DIR.mkdir(parents=True, exist_ok=True)

DEFAULT_ROUTES = [
    ("bengaluru-mysuru", "Bengaluru", "Mysuru"),
    ("bengaluru-hassan", "Bengaluru", "Hassan"),
    ("bengaluru-sakleshpur", "Bengaluru", "Sakleshpur"),
    ("pune-mahabaleshwar", "Pune", "Mahabaleshwar")
]

def record_single_route(slug: str, start_loc: str, dest_loc: str):
    print(f"\n=======================================================")
    print(f"Recording Route: {slug} ({start_loc} -> {dest_loc})")
    print(f"=======================================================")

    print(f"[1/3] Geocoding start: '{start_loc}' and dest: '{dest_loc}'...")
    s_lat, s_lng, s_name = geocode_place(start_loc)
    d_lat, d_lng, d_name = geocode_place(dest_loc)
    print(f"  Start: {s_name} ({s_lat:.4f}, {s_lng:.4f})")
    print(f"  Dest:  {d_name} ({d_lat:.4f}, {d_lng:.4f})")

    print(f"[2/3] Fetching live driving route from OSRM...")
    route_info = get_routing_osrm_or_ors(s_lat, s_lng, d_lat, d_lng)
    dist_km = route_info["total_distance_km"]
    dur_min = route_info["estimated_duration_minutes"]
    pts = len(route_info["polyline"])
    print(f"  Route: {dist_km} km, ~{dur_min} mins, {pts} polyline vertices")

    print(f"[3/3] Querying real OSM places via Overpass (fuel, dining, toilets, repairs)...")
    places_data = extract_real_places_from_route(
        full_polyline=route_info["polyline"],
        total_distance_km=dist_km
    )
    n_fuel = len(places_data.get("fuel_stations", []))
    n_food = len(places_data.get("food_places", []))
    n_toilet = len(places_data.get("restrooms", []))
    n_repair = len(places_data.get("repair_shops", []))
    print(f"  Discovered: {n_fuel} fuel stations, {n_food} restaurants, {n_toilet} toilets, {n_repair} repair shops")

    payload = {
        "slug": slug,
        "start_location": s_name,
        "destination": d_name,
        "start_lat": s_lat,
        "start_lng": s_lng,
        "dest_lat": d_lat,
        "dest_lng": d_lng,
        "route": route_info,
        "places": places_data,
        "recorded_at": datetime.utcnow().isoformat()
    }

    out_file = RECORDED_DIR / f"{slug}.json"
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)

    print(f"Saved successfully to: {out_file} ({out_file.stat().st_size / 1024:.1f} KB)")
    return payload

def main():
    parser = argparse.ArgumentParser(description="Record live routes and real OSM places for offline demo caching.")
    parser.add_argument("--slug", help="Route slug name (e.g. bengaluru-mysuru)")
    parser.add_argument("--start", help="Start location name")
    parser.add_argument("--dest", help="Destination name")
    parser.add_argument("--all", action="store_true", help="Record all 4 standard evaluation routes")

    args = parser.parse_args()

    if args.slug and args.start and args.dest:
        record_single_route(args.slug, args.start, args.dest)
    elif args.all or not (args.slug or args.start or args.dest):
        for slug, start, dest in DEFAULT_ROUTES:
            try:
                record_single_route(slug, start, dest)
            except Exception as e:
                print(f"ERROR recording {slug}: {e}")
    else:
        print("Please specify both --start and --dest or pass --all.")

if __name__ == "__main__":
    main()
