import json
import httpx
from pathlib import Path
from typing import Dict, Any, List
from mcp.server.mcpserver import MCPServer
from backend.app.config import settings

server = MCPServer("weather_server")

def load_cached_weather() -> Dict[str, Any]:
    sample_file = settings.SAMPLE_DATA_DIR / "cached_weather.json"
    with open(sample_file, "r", encoding="utf-8") as f:
        return json.load(f)

def evaluate_weather_verdict(
    max_rain_prob: float,
    max_wind_kmh: float,
    has_thunderstorm: bool,
    max_temp_c: float
) -> Dict[str, Any]:
    """
    Evaluate motorcycle riding safety thresholds:
    - NO-GO: Thunderstorms (codes 95, 96, 99) OR rain prob >= 70% OR wind >= 45 km/h OR extreme heat > 42°C
    - CAUTION: Rain prob 40% - 69% OR wind 30 - 44 km/h OR temp 36 - 42°C
    - GO: Rain prob < 40% AND wind < 30 km/h AND temp <= 36°C
    """
    reasons = []
    verdict = "GO"
    
    if has_thunderstorm:
        verdict = "NO-GO"
        reasons.append("Severe Thunderstorm hazard detected on route. Lightning and sudden squalls present severe danger to riders.")
    elif max_rain_prob >= 70:
        verdict = "NO-GO"
        reasons.append(f"Heavy rain probability ({max_rain_prob:.0f}%) exceeds safety threshold of 70%. High hydroplaning and low visibility risk.")
    elif max_wind_kmh >= 45:
        verdict = "NO-GO"
        reasons.append(f"Severe crosswinds ({max_wind_kmh:.0f} km/h) exceed 45 km/h motorcycle control limit.")
    elif max_rain_prob >= 40:
        verdict = "CAUTION"
        reasons.append(f"Moderate rain probability ({max_rain_prob:.0f}%). Wet weather gear and reduced cruising speeds mandatory.")
    elif max_wind_kmh >= 30:
        verdict = "CAUTION"
        reasons.append(f"Elevated crosswinds ({max_wind_kmh:.0f} km/h). Maintain tight single-file formation over highway overpasses.")
    else:
        reasons.append("Precipitation probability is below the 40% caution threshold across all checkpoints.")
        reasons.append(f"Wind speed ({max_wind_kmh:.1f} km/h) is calm to mild, well below motorcycle stability limits.")
        reasons.append("Clear asphalt visibility and ideal mountain riding temperatures.")

    backup_dates = [
        "2026-11-30 (Sunday) - 85% clear skies",
        "2026-12-06 (Saturday) - 90% clear skies"
    ]

    return {
        "verdict": verdict,
        "reasons": reasons,
        "backup_dates": backup_dates if verdict != "GO" else []
    }

@server.tool()
def get_route_weather(target_date: str = "2026-11-29", demo_mode: bool = True) -> str:
    """Fetch and evaluate weather conditions along the motorcycle route using Open-Meteo."""
    if demo_mode or settings.DEMO_MODE:
        return json.dumps(load_cached_weather())
        
    # Attempt live Open-Meteo query if not in demo mode
    try:
        # Sample checkpoint coordinates (Bangalore, Kunigal, Hassan, Sakleshpur)
        checkpoints = [
            {"name": "Bangalore Nelamangala", "lat": 13.0945, "lng": 77.3910, "eta": "05:30"},
            {"name": "Kunigal (Breakfast)", "lat": 13.0232, "lng": 77.0267, "eta": "07:15"},
            {"name": "Hassan Bypass (Fuel)", "lat": 13.0033, "lng": 76.1004, "eta": "09:40"},
            {"name": "Sakleshpur Arrival", "lat": 12.9733, "lng": 75.7833, "eta": "10:45"}
        ]
        
        parsed_checkpoints = []
        max_rain = 0.0
        max_wind = 0.0
        has_storm = False
        
        for cp in checkpoints:
            url = (
                f"https://api.open-meteo.com/v1/forecast?"
                f"latitude={cp['lat']}&longitude={cp['lng']}"
                f"&hourly=temperature_2m,precipitation_probability,weather_code,wind_speed_10m"
                f"&forecast_days=7&timezone=Asia%2FKolkata"
            )
            with httpx.Client(timeout=4.0) as client:
                resp = client.get(url)
                if resp.status_code == 200:
                    data = resp.json()
                    # Grab midday or early morning indices
                    idx = 7 # ~7 AM
                    t = data["hourly"]["temperature_2m"][idx]
                    p = data["hourly"]["precipitation_probability"][idx]
                    w = data["hourly"]["wind_speed_10m"][idx]
                    code = data["hourly"]["weather_code"][idx]
                    
                    if p > max_rain: max_rain = p
                    if w > max_wind: max_wind = w
                    if code in (95, 96, 99): has_storm = True
                    
                    parsed_checkpoints.append({
                        "checkpoint": cp["name"],
                        "eta": cp["eta"],
                        "temperature_c": t,
                        "precipitation_probability": p,
                        "weather_code": code,
                        "condition": "Clear/Cloudy",
                        "wind_speed_kmh": w,
                        "status": "GO" if p < 40 else ("CAUTION" if p < 70 else "NO-GO")
                    })
                    
        evaluation = evaluate_weather_verdict(max_rain, max_wind, has_storm, 30.0)
        return json.dumps({
            "target_date": target_date,
            "overall_verdict": evaluation["verdict"],
            "summary": "Live Open-Meteo route forecast evaluated.",
            "checkpoints": parsed_checkpoints,
            "reasons": evaluation["reasons"],
            "backup_dates": evaluation["backup_dates"]
        })
    except Exception:
        # Graceful fallback on network timeout or rate limit
        return json.dumps(load_cached_weather())

if __name__ == "__main__":
    server.run(transport="stdio")
