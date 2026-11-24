import pytest
from backend.mcp_servers.weather_server import evaluate_weather_verdict

def test_weather_verdict_go():
    # Mild rain (15%), gentle wind (12 km/h), no storm, mild temp (24°C)
    res = evaluate_weather_verdict(max_rain_prob=15.0, max_wind_kmh=12.0, has_thunderstorm=False, max_temp_c=24.0)
    assert res["verdict"] == "GO"
    assert len(res["backup_dates"]) == 0

def test_weather_verdict_caution():
    # Moderate rain (50%) or crosswinds (35 km/h)
    res1 = evaluate_weather_verdict(max_rain_prob=50.0, max_wind_kmh=15.0, has_thunderstorm=False, max_temp_c=24.0)
    assert res1["verdict"] == "CAUTION"
    assert len(res1["backup_dates"]) > 0

    res2 = evaluate_weather_verdict(max_rain_prob=20.0, max_wind_kmh=38.0, has_thunderstorm=False, max_temp_c=25.0)
    assert res2["verdict"] == "CAUTION"

def test_weather_verdict_no_go():
    # Severe thunderstorm or heavy rain (80%) or dangerous crosswinds (50 km/h)
    res_storm = evaluate_weather_verdict(max_rain_prob=20.0, max_wind_kmh=15.0, has_thunderstorm=True, max_temp_c=22.0)
    assert res_storm["verdict"] == "NO-GO"
    assert "Thunderstorm" in res_storm["reasons"][0]

    res_rain = evaluate_weather_verdict(max_rain_prob=85.0, max_wind_kmh=20.0, has_thunderstorm=False, max_temp_c=22.0)
    assert res_rain["verdict"] == "NO-GO"

    res_wind = evaluate_weather_verdict(max_rain_prob=10.0, max_wind_kmh=52.0, has_thunderstorm=False, max_temp_c=22.0)
    assert res_wind["verdict"] == "NO-GO"
