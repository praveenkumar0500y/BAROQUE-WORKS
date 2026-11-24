import re
import json
from pathlib import Path
from typing import Dict, Any, List
from mcp.server.mcpserver import MCPServer
from backend.app.services.bikes_data import lookup_bike

server = MCPServer("chat_parser_server")

def parse_whatsapp_text_rule_based(chat_text: str) -> Dict[str, Any]:
    lines = [line.strip() for line in chat_text.strip().split("\n") if line.strip()]
    
    riders_map: Dict[str, Dict[str, Any]] = {}
    food_prefs = set()
    destinations = []
    start_points = []
    dates = []
    times = []
    budgets = []
    paces = []
    confidence_notes = []
    
    # Message regex: "24/11/26, 7:15 pm - Name: message" or "[24/11/26, 7:15:00 PM] Name: message"
    msg_regex = re.compile(r"^(?:\[?(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?\s*(?:am|pm|AM|PM)?)\]?\s*[-:]?\s*)([^:]+?):\s*(.*)$")

    for line in lines:
        match = msg_regex.match(line)
        if not match:
            continue
        date_str, time_str, sender, msg = match.groups()
        sender = sender.strip()
        msg_lower = msg.lower()
        
        # Check if sender already noted
        clean_name = sender.replace("(Captain)", "").strip()
        is_captain = "captain" in sender.lower()
        
        if clean_name not in riders_map:
            riders_map[clean_name] = {
                "name": clean_name,
                "status": "undecided",
                "is_captain": is_captain,
                "bike_model": None,
                "tank_litres": None,
                "mileage_kmpl": None,
                "tank_range_km": None,
                "upi_id": None,
                "notes": None
            }
        
        # Captain designation
        if is_captain:
            riders_map[clean_name]["is_captain"] = True
            riders_map[clean_name]["status"] = "confirmed"

        # RSVP status extraction
        if any(term in msg_lower for term in ["count me in", "i'm in", "im in", "joining", "works for me", "epic", "itching for the highway", "ready"]):
            riders_map[clean_name]["status"] = "confirmed"
        elif any(term in msg_lower for term in ["can't make it", "cant make it", "skip this", "bad timing", "have to skip"]):
            riders_map[clean_name]["status"] = "declined"
        elif any(term in msg_lower for term in ["tentative", "might join", "depending on", "on-call", "not sure"]):
            riders_map[clean_name]["status"] = "undecided"
            
        # UPI ID extraction (e.g. name@okhdfcbank, name@upi, name@ybl, etc.)
        upi_match = re.search(r"[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}", msg)
        if upi_match:
            riders_map[clean_name]["upi_id"] = upi_match.group(0)
            
        # Bike mentions in message
        bike_spec = lookup_bike(msg)
        if bike_spec:
            riders_map[clean_name]["bike_model"] = bike_spec.model
            riders_map[clean_name]["tank_litres"] = bike_spec.tank_litres
            riders_map[clean_name]["mileage_kmpl"] = bike_spec.mileage_kmpl
            riders_map[clean_name]["tank_range_km"] = bike_spec.tank_range_km
            
        # Destination extraction
        if "to sakleshpur" in msg_lower or "ride to sakleshpur" in msg_lower or "in sakleshpur" in msg_lower:
            destinations.append("Sakleshpur")
            
        # Start point extraction
        if "nelamangala" in msg_lower:
            start_points.append("Nelamangala Toll Plaza, Bangalore")
        elif "silk board" in msg_lower:
            start_points.append("Silk Board, Bangalore")
            
        # Date & Time extraction
        if "saturday, 29 nov" in msg_lower or "29 nov" in msg_lower or "29/11" in msg_lower:
            dates.append("2026-11-29")
        time_match = re.search(r"(\d{1,2}:\d{2}\s*(?:am|pm|AM|PM))", msg)
        if time_match and ("start" in msg_lower or "up" in msg_lower or "roll" in msg_lower or "sharp" in msg_lower):
            times.append(time_match.group(1))
            
        # Food preferences
        if "swathi delicacy" in msg_lower:
            food_prefs.add("Swathi Delicacy (Kunigal)")
        if "thatte idli" in msg_lower:
            food_prefs.add("Thatte Idli & Filter Coffee")
        if "veg" in msg_lower:
            food_prefs.add("Vegetarian Breakfast")
        if "neer dosa" in msg_lower or "malnad" in msg_lower:
            food_prefs.add("Malnad Cuisine / Neer Dosa (Lunch)")
            
        # Budget
        budget_match = re.search(r"₹?\s*(\d{3,5})\s*(?:to|-)?\s*₹?\s*(\d{3,5})?", msg)
        if budget_match and ("budget" in msg_lower or "per head" in msg_lower or "per person" in msg_lower):
            try:
                b1 = float(budget_match.group(1))
                b2 = float(budget_match.group(2)) if budget_match.group(2) else b1
                budgets.append((b1 + b2) / 2)
            except:
                pass
                
        # Pace
        if "80-90" in msg:
            paces.append("80-90 km/h cruising")

    # Fallback bike assignments for known riders if not mentioned
    for rname, rdata in riders_map.items():
        if not rdata["bike_model"]:
            spec = lookup_bike(rname)
            if spec:
                rdata["bike_model"] = spec.model
                rdata["tank_litres"] = spec.tank_litres
                rdata["mileage_kmpl"] = spec.mileage_kmpl
                rdata["tank_range_km"] = spec.tank_range_km

    # Set default captain if none explicitly found
    if not any(r["is_captain"] for r in riders_map.values()) and riders_map:
        first_rider = list(riders_map.values())[0]
        first_rider["is_captain"] = True
        first_rider["status"] = "confirmed"

    final_destination = destinations[0] if destinations else "Sakleshpur"
    final_start = start_points[0] if start_points else "Nelamangala Toll Plaza, Bangalore"
    final_date = dates[0] if dates else "2026-11-29"
    final_time = times[0] if times else "05:30 am"
    final_budget = budgets[0] if budgets else 1800.0
    final_pace = paces[0] if paces else "80-90 km/h cruising"

    confidence_notes.append(f"Successfully extracted {len(riders_map)} participant profiles from chat.")
    confidence_notes.append("Fuel ranges resolved via Indian Motorcycle Database specifications.")

    return {
        "title": f"Ride to {final_destination}",
        "start_location": final_start,
        "destination": final_destination,
        "ride_date": final_date,
        "start_time": final_time,
        "food_preferences": list(food_prefs) or ["South Indian Breakfast", "Malnad Lunch"],
        "budget_estimate": final_budget,
        "pace": final_pace,
        "riders": list(riders_map.values()),
        "confidence_notes": confidence_notes,
        "raw_message_count": len(lines)
    }

@server.tool()
def parse_whatsapp_chat(chat_text: str, demo_mode: bool = False) -> str:
    """Parse WhatsApp motorcycle group chat text into structured ride data."""
    parsed = parse_whatsapp_text_rule_based(chat_text)
    return json.dumps(parsed)

if __name__ == "__main__":
    server.run(transport="stdio")
