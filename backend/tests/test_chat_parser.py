import json
from pathlib import Path
from backend.mcp_servers.chat_parser_server import parse_whatsapp_text_rule_based
from backend.app.config import settings

def test_whatsapp_parser_sample_chat():
    chat_file = settings.SAMPLE_DATA_DIR / "whatsapp_chat.txt"
    assert chat_file.exists(), "Sample chat file must exist"
    
    with open(chat_file, "r", encoding="utf-8") as f:
        chat_text = f.read()
        
    result = parse_whatsapp_text_rule_based(chat_text)
    
    # 1. Verify Destination and Date
    assert "Sakleshpur" in result["destination"]
    assert result["ride_date"] == "2026-11-29"
    assert "Nelamangala" in result["start_location"]
    
    # 2. Verify Riders extraction
    riders = {r["name"]: r for r in result["riders"]}
    assert "Rohan" in riders or "Rohan (Captain)" in riders
    assert "Rahul" in riders
    assert "Vikram" in riders
    assert "Ananya" in riders
    assert "Suresh" in riders
    assert "Manisha" in riders
    
    # Check statuses
    assert riders["Rahul"]["status"] == "confirmed"
    assert riders["Suresh"]["status"] == "declined"
    assert riders["Manisha"]["status"] == "undecided"
    
    # Check bike extraction for Rahul
    assert "Interceptor 650" in riders["Rahul"]["bike_model"]
    assert riders["Rahul"]["tank_litres"] == 13.7
    assert riders["Rahul"]["mileage_kmpl"] == 22.0
    assert riders["Rahul"]["tank_range_km"] == 13.7 * 22.0
    
    # Check UPI extraction
    assert riders["Rahul"]["upi_id"] == "rahul.re650@okhdfcbank"
    
    # Check food preferences
    prefs = " ".join(result["food_preferences"]).lower()
    assert "thatte idli" in prefs or "swathi delicacy" in prefs or "veg" in prefs
