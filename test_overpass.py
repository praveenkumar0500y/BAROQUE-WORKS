import httpx

query = """[out:json][timeout:8];
(
  node["amenity"="fuel"](around:5000, 13.0, 77.0);
  node["amenity"="restaurant"](around:5000, 13.0, 77.0);
);
out 10;"""

servers = [
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass-api.de/api/interpreter",
]

for s in servers:
    try:
        print("Testing:", s)
        res = httpx.post(s, data={"data": query}, headers={"User-Agent": "RideCopilot/1.0"}, timeout=8.0)
        print(s, "Status:", res.status_code, "Count:", len(res.json().get("elements", [])))
        for el in res.json().get("elements", [])[:3]:
            print(el.get("tags", {}).get("name"), el.get("lat"), el.get("lon"))
        break
    except Exception as e:
        print(s, "Failed:", e)
