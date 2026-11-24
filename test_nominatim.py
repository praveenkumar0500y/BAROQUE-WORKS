import httpx

headers = {"User-Agent": "RideCaptainCopilot/1.1 (ridecopilot@gmail.com)"}
queries = [
    {"q": "petrol pump on NH 75 near Kunigal, Karnataka", "format": "json", "limit": 2},
    {"q": "restaurant on Bangalore Mangalore highway", "format": "json", "limit": 2},
    {"q": "Indian Oil petrol pump Hassan, Karnataka", "format": "json", "limit": 2},
]

for q in queries:
    try:
        res = httpx.get("https://nominatim.openstreetmap.org/search", params=q, headers=headers, timeout=4.0)
        print(q["q"], res.status_code, [r.get("display_name", "").split(",")[0] for r in res.json()])
    except Exception as e:
        print(q["q"], "Error:", e)
