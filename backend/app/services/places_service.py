import hashlib
import json
import math
import sqlite3
import time
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple
import urllib.request
import urllib.parse
from backend.app.config import settings

def get_db_path() -> Path:
    url = settings.DATABASE_URL
    if url.startswith("sqlite:///"):
        rel = url.replace("sqlite:///", "")
        return Path(rel).resolve()
    return Path("ride_copilot.db").resolve()

def init_cache_tables():
    db_file = get_db_path()
    with sqlite3.connect(db_file) as conn:
        c = conn.cursor()
        c.execute("""
            CREATE TABLE IF NOT EXISTS geocode_cache (
                query TEXT PRIMARY KEY,
                candidates_json TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        c.execute("""
            CREATE TABLE IF NOT EXISTS overpass_cache (
                query_hash TEXT PRIMARY KEY,
                response_json TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.commit()

# Ensure caches exist at import time
try:
    init_cache_tables()
except Exception:
    pass

def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2.0)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2.0)**2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return r * c

def compute_cumulative_distances(polyline: List[List[float]]) -> List[float]:
    """Compute cumulative haversine distance in km at each vertex."""
    if not polyline:
        return []
    cum = [0.0]
    total = 0.0
    for i in range(len(polyline) - 1):
        d = haversine_km(polyline[i][0], polyline[i][1], polyline[i+1][0], polyline[i+1][1])
        total += d
        cum.append(round(total, 4))
    return cum

def snap_to_route(
    lat: float,
    lon: float,
    polyline: List[List[float]],
    cumulative_distances_km: List[float]
) -> Tuple[float, float, int]:
    """
    Project point (lat, lon) onto polyline segments.
    Returns (distance_from_start_km, offset_km, nearest_index).
    """
    if not polyline or len(polyline) < 2:
        return 0.0, 0.0, 0

    best_offset = float("inf")
    best_dist = 0.0
    best_idx = 0

    for i in range(len(polyline) - 1):
        p1 = polyline[i]
        p2 = polyline[i+1]
        mid_lat = (p1[0] + p2[0]) / 2.0
        cos_lat = math.cos(math.radians(mid_lat))

        # Local equirectangular flat-earth approximation for each segment
        dx = (p2[1] - p1[1]) * cos_lat * 111.32
        dy = (p2[0] - p1[0]) * 111.32
        seg_sq = dx * dx + dy * dy

        px = (lon - p1[1]) * cos_lat * 111.32
        py = (lat - p1[0]) * 111.32

        if seg_sq < 1e-12:
            t = 0.0
        else:
            t = max(0.0, min(1.0, (px * dx + py * dy) / seg_sq))

        proj_x = t * dx
        proj_y = t * dy
        offset = math.sqrt((px - proj_x)**2 + (py - proj_y)**2)

        if offset < best_offset:
            best_offset = offset
            d1 = cumulative_distances_km[i]
            d2 = cumulative_distances_km[i+1] if i + 1 < len(cumulative_distances_km) else d1
            best_dist = d1 + t * (d2 - d1)
            best_idx = i

    return round(best_dist, 2), round(best_offset, 2), best_idx

def perpendicular_distance(pt: List[float], line_start: List[float], line_end: List[float]) -> float:
    dx = line_end[1] - line_start[1]
    dy = line_end[0] - line_start[0]
    line_len_sq = dx * dx + dy * dy
    if line_len_sq == 0:
        return math.hypot(pt[0] - line_start[0], pt[1] - line_start[1])
    t = max(0.0, min(1.0, ((pt[1] - line_start[1]) * dx + (pt[0] - line_start[0]) * dy) / line_len_sq))
    proj_y = line_start[0] + t * dy
    proj_x = line_start[1] + t * dx
    return math.hypot(pt[0] - proj_y, pt[1] - proj_x)

def douglas_peucker(points: List[List[float]], epsilon: float) -> List[List[float]]:
    """Ramer-Douglas-Peucker line simplification."""
    if len(points) <= 2:
        return points
    dmax = 0.0
    index = 0
    for i in range(1, len(points) - 1):
        d = perpendicular_distance(points[i], points[0], points[-1])
        if d > dmax:
            index = i
            dmax = d
    if dmax > epsilon:
        rec1 = douglas_peucker(points[:index+1], epsilon)
        rec2 = douglas_peucker(points[index:], epsilon)
        return rec1[:-1] + rec2
    else:
        return [points[0], points[-1]]

def simplify_polyline(points: List[List[float]], target_count: int = 150) -> List[List[float]]:
    """Simplify polyline to approximately target_count points."""
    if len(points) <= target_count:
        return points
    low = 0.0001
    high = 0.1
    best = points
    for _ in range(14):
        mid = (low + high) / 2.0
        res = douglas_peucker(points, mid)
        if len(res) > target_count:
            low = mid
        else:
            high = mid
            best = res
    if points[0] not in best:
        best.insert(0, points[0])
    if points[-1] not in best:
        best.append(points[-1])
    return best

def chunk_polyline_by_distance(
    polyline: List[List[float]],
    target_chunk_km: float = 60.0
) -> List[List[List[float]]]:
    """Split polyline into chunks of approximately target_chunk_km."""
    if not polyline:
        return []
    chunks = []
    current_chunk = [polyline[0]]
    current_dist = 0.0

    for i in range(len(polyline) - 1):
        d = haversine_km(polyline[i][0], polyline[i][1], polyline[i+1][0], polyline[i+1][1])
        current_dist += d
        current_chunk.append(polyline[i+1])
        if current_dist >= target_chunk_km:
            chunks.append(current_chunk)
            current_chunk = [polyline[i+1]]
            current_dist = 0.0

    if len(current_chunk) > 1 or not chunks:
        chunks.append(current_chunk)
    return chunks

OVERPASS_SERVERS = [
    "https://overpass.openstreetmap.fr/api/interpreter",
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
    "https://overpass-api.open-access.nl/api/interpreter"
]

def query_overpass_cached(query: str, timeout_seconds: int = 25) -> Dict[str, Any]:
    """Execute Overpass query with SQLite caching and fallback mirrors."""
    q_hash = hashlib.sha256(query.encode("utf-8")).hexdigest()
    db_file = get_db_path()

    # 1. Check SQLite Cache
    try:
        with sqlite3.connect(db_file) as conn:
            c = conn.cursor()
            c.execute("SELECT response_json FROM overpass_cache WHERE query_hash = ?", (q_hash,))
            row = c.fetchone()
            if row:
                return json.loads(row[0])
    except Exception:
        pass

    # 2. Query Overpass with mirrors and retries
    headers = {"User-Agent": "RideCaptainCopilot/1.1 (https://github.com/praveenkumar0500y/BAROQUE-WORKS)"}
    data_payload = urllib.parse.quote(query)

    for server_url in OVERPASS_SERVERS:
        try:
            req_url = f"{server_url}?data={data_payload}"
            req = urllib.request.Request(req_url, headers=headers)
            with urllib.request.urlopen(req, timeout=timeout_seconds) as resp:
                if resp.status == 200:
                    raw_text = resp.read().decode("utf-8")
                    data = json.loads(raw_text)
                    # Cache successful response in SQLite
                    try:
                        with sqlite3.connect(db_file) as conn:
                            c = conn.cursor()
                            c.execute(
                                "INSERT OR REPLACE INTO overpass_cache (query_hash, response_json) VALUES (?, ?)",
                                (q_hash, raw_text)
                            )
                            conn.commit()
                    except Exception:
                        pass
                    return data
        except Exception:
            continue

    return {"elements": []}

KNOWN_FUEL_BRANDS = [
    "Indian Oil", "IOCL", "Bharat Petroleum", "BPCL", "Hindustan Petroleum", "HPCL",
    "Shell", "Nayara", "Jio-bp", "Essar", "Reliance"
]

def detect_known_brand(name: str, brand_tag: str) -> Optional[str]:
    combined = f"{name} {brand_tag}".lower()
    if "indian oil" in combined or "iocl" in combined:
        return "Indian Oil"
    if "bharat petroleum" in combined or "bpcl" in combined:
        return "BPCL"
    if "hindustan petroleum" in combined or "hpcl" in combined or "hp auto" in combined:
        return "HPCL"
    if "shell" in combined:
        return "Shell"
    if "nayara" in combined:
        return "Nayara"
    if "jio-bp" in combined or "jio bp" in combined:
        return "Jio-bp"
    if "reliance" in combined:
        return "Reliance"
    return brand_tag if brand_tag else None

def extract_real_places_from_route(
    full_polyline: List[List[float]],
    total_distance_km: float
) -> Dict[str, List[Dict[str, Any]]]:
    """
    Query real OSM places along the route using Overpass polyline `around`.
    Normalise, snap to route, and spatially link food/restrooms.
    """
    cumulative_distances = compute_cumulative_distances(full_polyline)
    simplified = simplify_polyline(full_polyline, target_count=150)
    chunks = chunk_polyline_by_distance(simplified, target_chunk_km=60.0)

    raw_elements = []
    seen_element_ids = set()

    for chunk in chunks:
        if len(chunk) < 2:
            continue
        coords_str = ",".join(f"{pt[0]:.5f},{pt[1]:.5f}" for pt in chunk)
        query = f"""[out:json][timeout:25];
(
  nwr["amenity"="fuel"](around:1500,{coords_str});
  nwr["amenity"~"^(restaurant|cafe|fast_food)$"](around:1500,{coords_str});
  nwr["amenity"="toilets"](around:1500,{coords_str});
  nwr["shop"~"^(motorcycle_repair|motorcycle|tyres)$"](around:2500,{coords_str});
);
out center tags;"""

        res = query_overpass_cached(query)
        for el in res.get("elements", []):
            el_id = f"{el.get('type')}_{el.get('id')}"
            if el_id not in seen_element_ids:
                seen_element_ids.add(el_id)
                raw_elements.append(el)

    fuel_stations: List[Dict[str, Any]] = []
    food_places: List[Dict[str, Any]] = []
    restrooms: List[Dict[str, Any]] = []
    repair_shops: List[Dict[str, Any]] = []

    for el in raw_elements:
        tags = el.get("tags", {})
        lat = el.get("lat") or el.get("center", {}).get("lat")
        lon = el.get("lon") or el.get("center", {}).get("lon")
        if lat is None or lon is None:
            continue

        dist_km, offset_km, _ = snap_to_route(lat, lon, full_polyline, cumulative_distances)
        if offset_km > 2.0:
            continue

        raw_name = tags.get("name", "").strip()
        brand_tag = tags.get("brand", "").strip()

        # Extract useful tag subset
        tag_subset = {}
        for k in ["cuisine", "toilets", "opening_hours", "phone", "website", "diet:vegetarian"]:
            if k in tags:
                tag_subset[k] = tags[k]
        for k, v in tags.items():
            if k.startswith("fuel:octane_") or k.startswith("fuel:diesel") or k.startswith("fuel:petrol"):
                tag_subset[k] = v

        place_id = str(el.get("id"))
        maps_url = f"https://www.google.com/maps/search/?api=1&query={lat:.6f},{lon:.6f}"

        # Classify by OSM tags
        amenity = tags.get("amenity")
        shop = tags.get("shop")

        if amenity == "fuel":
            name = raw_name if raw_name else "Fuel station (unnamed)"
            brand = detect_known_brand(name, brand_tag)
            fuel_stations.append({
                "id": f"fuel-{place_id}",
                "osm_id": place_id,
                "type": "fuel",
                "name": name,
                "brand": brand or "",
                "lat": round(lat, 6),
                "lng": round(lon, 6),
                "distance_from_start_km": dist_km,
                "offset_km": offset_km,
                "opening_hours": tags.get("opening_hours", ""),
                "tags": tag_subset,
                "source": "osm",
                "maps_url": maps_url,
                "has_food_nearby": False,
                "has_restroom": False,
                "amenities": []
            })
        elif amenity in ("restaurant", "cafe", "fast_food"):
            if not raw_name:
                continue
            food_places.append({
                "id": f"food-{place_id}",
                "osm_id": place_id,
                "type": "food",
                "name": raw_name,
                "brand": brand_tag,
                "lat": round(lat, 6),
                "lng": round(lon, 6),
                "distance_from_start_km": dist_km,
                "offset_km": offset_km,
                "opening_hours": tags.get("opening_hours", ""),
                "tags": tag_subset,
                "source": "osm",
                "maps_url": maps_url
            })
        elif amenity == "toilets":
            name = raw_name if raw_name else "Public Restroom"
            restrooms.append({
                "id": f"restroom-{place_id}",
                "osm_id": place_id,
                "type": "restroom",
                "name": name,
                "brand": brand_tag,
                "lat": round(lat, 6),
                "lng": round(lon, 6),
                "distance_from_start_km": dist_km,
                "offset_km": offset_km,
                "opening_hours": tags.get("opening_hours", ""),
                "tags": tag_subset,
                "source": "osm",
                "maps_url": maps_url
            })
        elif shop in ("motorcycle_repair", "motorcycle", "tyres"):
            name = raw_name if raw_name else f"Motorcycle Service ({shop.replace('_', ' ').title()})"
            repair_shops.append({
                "id": f"repair-{place_id}",
                "osm_id": place_id,
                "type": "repair",
                "name": name,
                "brand": brand_tag,
                "lat": round(lat, 6),
                "lng": round(lon, 6),
                "distance_from_start_km": dist_km,
                "offset_km": offset_km,
                "opening_hours": tags.get("opening_hours", ""),
                "tags": tag_subset,
                "source": "osm",
                "maps_url": maps_url
            })

    # Spatial Join for fuel stations: food/toilets within 300 m (0.3 km)
    for st in fuel_stations:
        st_lat, st_lng = st["lat"], st["lng"]
        # Check food within 300m
        has_food = any(
            haversine_km(st_lat, st_lng, fp["lat"], fp["lng"]) <= 0.3
            for fp in food_places
        )
        # Check toilets within 300m or tag
        has_restroom = (
            st.get("tags", {}).get("toilets") == "yes" or
            any(
                haversine_km(st_lat, st_lng, rp["lat"], rp["lng"]) <= 0.3
                for rp in restrooms
            )
        )
        st["has_food_nearby"] = has_food
        st["has_restroom"] = has_restroom

        # Real tags only for amenities
        amenity_list = []
        if st.get("brand"):
            amenity_list.append(st["brand"])
        for k, v in st.get("tags", {}).items():
            if k.startswith("fuel:octane_") and v == "yes":
                amenity_list.append(f"High-Octane ({k.replace('fuel:octane_', 'RON ')})")
            elif k == "toilets" and v == "yes":
                amenity_list.append("Restrooms Mapped")
        if has_food:
            amenity_list.append("Food within 300m")
        if has_restroom and "Restrooms Mapped" not in amenity_list:
            amenity_list.append("Restroom within 300m")
        st["amenities"] = amenity_list

    return {
        "fuel_stations": sorted(fuel_stations, key=lambda x: x["distance_from_start_km"]),
        "food_places": sorted(food_places, key=lambda x: x["distance_from_start_km"]),
        "restrooms": sorted(restrooms, key=lambda x: x["distance_from_start_km"]),
        "repair_shops": sorted(repair_shops, key=lambda x: x["distance_from_start_km"])
    }
