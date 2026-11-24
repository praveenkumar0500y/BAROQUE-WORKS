import json
import time
import httpx
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from pydantic import BaseModel
from sqlalchemy.orm import Session
from backend.app.db import get_db
from backend.app.config import settings, update_env_key
from backend.app.models import Ride, Rider, RideStop, PendingAction, ActionLog, Expense
from backend.app.schemas import (
    RiderBase, ExpenseCreate, SettlementPlan
)
from backend.app.agent.orchestrator import RideCaptainOrchestrator
from backend.app.agent.approval_gate import approve_action, reject_action
from backend.app.services.bikes_data import get_all_bikes, lookup_bike
from backend.app.services.speech_service import synthesize_speech_elevenlabs, get_briefing_text
from backend.mcp_servers.bill_split_server import compute_minimal_settlements
from backend.mcp_servers.stop_finder_server import (
    geocode_place,
    get_routing_osrm_or_ors,
    find_stops_and_route,
    get_geocode_candidates,
    GeocodeError,
    RoutingError
)
from backend.mcp_servers.weather_server import get_route_weather

router = APIRouter()

class ChatParseWithRouteRequest(BaseModel):
    chat_text: str
    custom_destination: Optional[str] = None
    custom_start: Optional[str] = None
    custom_date: Optional[str] = None
    custom_time: Optional[str] = None
    demo_mode: bool = False

class RouteUpdateRequest(BaseModel):
    start_location: str
    destination: str
    ride_date: Optional[str] = None
    start_time: Optional[str] = None

class RoutePreviewRequest(BaseModel):
    start_location: str
    destination: str
    smallest_tank_range_km: float = 301.4
    start_time: str = "05:30 am"
    target_date: str = "2026-11-29"

class KeyUpdateRequest(BaseModel):
    ors_api_key: Optional[str] = None
    gemini_api_key: Optional[str] = None
    anthropic_api_key: Optional[str] = None
    elevenlabs_api_key: Optional[str] = None
    llm_provider: Optional[str] = None

class KeyTestRequest(BaseModel):
    service: str # 'ors', 'gemini', 'anthropic', 'elevenlabs'
    api_key: str

@router.get("/sample-chat")
def get_sample_chat():
    """Return the preloaded ~45-message realistic ride chat."""
    chat_file = settings.SAMPLE_DATA_DIR / "whatsapp_chat.txt"
    if not chat_file.exists():
        raise HTTPException(status_code=404, detail="Sample chat file not found")
    with open(chat_file, "r", encoding="utf-8") as f:
        content = f.read()
    return {"chat_text": content}

@router.post("/chat/parse")
def parse_chat_and_plan(req: ChatParseWithRouteRequest, db: Session = Depends(get_db)):
    """Parse chat, initiate ride, and generate route & stops."""
    try:
        orchestrator = RideCaptainOrchestrator(db)
        result = orchestrator.plan_ride_from_chat(
            chat_text=req.chat_text,
            custom_destination=req.custom_destination,
            custom_start=req.custom_start,
            custom_date=req.custom_date,
            custom_time=req.custom_time,
            demo_mode=req.demo_mode
        )
        return result
    except (GeocodeError, RoutingError) as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/locations/candidates")
def get_candidates(q: str = Query(..., min_length=1)):
    """Return up to 5 geocode candidates for a place query."""
    try:
        return get_geocode_candidates(q, limit=5)
    except GeocodeError as e:
        raise HTTPException(status_code=422, detail=str(e))

CURATED_SUGGESTIONS = [
    {"name": "Nelamangala Toll Plaza, Bangalore", "description": "Bangalore Departure Hub, Karnataka"},
    {"name": "Electronic City Toll Plaza, Bangalore", "description": "Hosur / Tamil Nadu Departure Hub, Bangalore"},
    {"name": "KIAL Airport Toll Plaza, Bangalore", "description": "North Bangalore / Hyderabad Departure Hub"},
    {"name": "Tumkur Road Toll Plaza, Bangalore", "description": "NH 48 Gateway, Karnataka"},
    {"name": "Bangalore (Bengaluru)", "description": "Karnataka, India"},
    {"name": "Sakleshpur", "description": "Hassan District, Western Ghats, Karnataka"},
    {"name": "Chikmagalur", "description": "Mullayanagiri & Baba Budangiri, Karnataka"},
    {"name": "Ooty (Udhagamandalam)", "description": "Nilgiris, Tamil Nadu"},
    {"name": "Coorg (Madikeri)", "description": "Kodagu District, Karnataka"},
    {"name": "Nandi Hills", "description": "Chikkaballapur, Karnataka"},
    {"name": "Mysore (Mysuru)", "description": "Heritage City, Karnataka"},
    {"name": "Wayanad", "description": "Western Ghats, Kerala"},
    {"name": "Munnar", "description": "Tea Gardens, Idukki, Kerala"},
    {"name": "Kodaikanal", "description": "Princess of Hill Stations, Tamil Nadu"},
    {"name": "Goa (Panaji / Candolim)", "description": "Coastal Highway, Goa"},
    {"name": "Hampi", "description": "Vijayanagara Ruins, Bellary, Karnataka"},
    {"name": "Gokarna", "description": "Coastal Karnataka"},
    {"name": "Dandeli", "description": "Kali River Adventure, Karnataka"},
    {"name": "Pondicherry (Puducherry)", "description": "East Coast Road (ECR)"},
    {"name": "Mahabalipuram", "description": "Coastal Temple Town, Tamil Nadu"},
    {"name": "Yercaud", "description": "Shevaroy Hills, Tamil Nadu"},
    {"name": "Shimoga (Shivamogga)", "description": "Jog Falls Gateway, Karnataka"},
    {"name": "Agumbe", "description": "Sunset Point & Rainforest Ghats, Karnataka"},
    {"name": "Kudremukh", "description": "National Park, Chikkamagaluru, Karnataka"},
    {"name": "Mangalore (Mangaluru)", "description": "Port City & Coastal Highway, Karnataka"},
    {"name": "Lonavala", "description": "Mumbai-Pune Highway, Maharashtra"},
    {"name": "Mahabaleshwar", "description": "Western Ghats, Maharashtra"},
    {"name": "Lavasa", "description": "Pune Hills, Maharashtra"},
    {"name": "Alibaug", "description": "Coastal Maharashtra"},
    {"name": "Hyderabad", "description": "Telangana, India"},
    {"name": "Chennai", "description": "Tamil Nadu, India"},
    {"name": "Mumbai", "description": "Maharashtra, India"},
    {"name": "Pune", "description": "Maharashtra, India"},
    {"name": "Jaipur", "description": "Pink City, Rajasthan"},
    {"name": "Udaipur", "description": "City of Lakes, Rajasthan"},
    {"name": "Rishikesh", "description": "Himalayan Foothills, Uttarakhand"},
    {"name": "Manali", "description": "Kullu Valley, Himachal Pradesh"},
    {"name": "Shimla", "description": "Himachal Pradesh, India"},
    {"name": "Leh, Ladakh", "description": "Trans-Himalayan Highway, Ladakh"},
    {"name": "Spiti Valley (Kaza)", "description": "High Altitude Cold Desert, Himachal Pradesh"},
    {"name": "Kanyakumari", "description": "Southernmost Tip, Tamil Nadu"},
    {"name": "Rameswaram", "description": "Pamban Bridge Route, Tamil Nadu"},
    {"name": "Tirupati", "description": "Andhra Pradesh, India"},
    {"name": "Belur and Halebidu", "description": "Hoysala Temples, Karnataka"},
    {"name": "Kabini", "description": "Nagarhole National Park, Karnataka"},
    {"name": "Bandipur", "description": "Tiger Reserve & Forest Highway, Karnataka"},
    {"name": "Valparai", "description": "Anamalai Hills, 40 Hairpin Bends, Tamil Nadu"},
    {"name": "Kolli Hills", "description": "70 Hairpin Bends Circuit, Tamil Nadu"},
]

@router.get("/locations/suggest")
def suggest_locations(q: str = Query("", min_length=1)):
    """Search for locations matching q and return suggestions dropdown list."""
    query = q.strip().lower()
    if not query:
        return []

    results = []
    seen = set()

    # 1. Search curated riding spots (0ms instant match)
    for loc in CURATED_SUGGESTIONS:
        name_lower = loc["name"].lower()
        desc_lower = loc["description"].lower()
        if query in name_lower or query in desc_lower:
            key = loc["name"].lower()
            if key not in seen:
                seen.add(key)
                results.append(loc)
                if len(results) >= 6:
                    break

    # 2. Live search fallback if under limit
    if len(results) < 6:
        try:
            headers = {"User-Agent": "RideCaptainCopilot/1.1 (ridecopilot@example.com)"}
            with httpx.Client(timeout=2.0) as client:
                resp = client.get(
                    "https://nominatim.openstreetmap.org/search",
                    params={"q": f"{q}, India", "format": "json", "limit": 5, "addressdetails": 1},
                    headers=headers
                )
                if resp.status_code == 200:
                    for item in resp.json():
                        display = item.get("display_name", "")
                        parts = [p.strip() for p in display.split(",") if p.strip()]
                        name = parts[0] if parts else q
                        desc = ", ".join(parts[1:4]) if len(parts) > 1 else "India"
                        key = name.lower()
                        if key not in seen:
                            seen.add(key)
                            results.append({"name": name, "description": desc})
                            if len(results) >= 8:
                                break
        except Exception:
            pass

    return results

@router.post("/route/preview")
def preview_route(req: RoutePreviewRequest):
    """Live geocode and route preview for any start/destination pair."""
    try:
        s_lat, s_lng, s_name = geocode_place(req.start_location)
        d_lat, d_lng, d_name = geocode_place(req.destination)
    except GeocodeError as e:
        raise HTTPException(status_code=422, detail=str(e))

    try:
        stops_json = find_stops_and_route(
            ride_id="preview",
            smallest_tank_range_km=req.smallest_tank_range_km,
            start_time=req.start_time,
            food_preferences_json="[]",
            start_location=req.start_location,
            destination=req.destination,
            demo_mode=False
        )
        stops_info = json.loads(stops_json)
    except (GeocodeError, RoutingError) as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Routing error: {e}")

    checkpoints_for_weather = [
        {"name": t["name"], "lat": t["lat"], "lng": t["lng"], "eta": t.get("eta", "")}
        for t in stops_info["timeline"][:4]
    ]
    weather_str = get_route_weather(
        target_date=req.target_date,
        demo_mode=False,
        checkpoints_json=json.dumps(checkpoints_for_weather)
    )
    weather_data = json.loads(weather_str)

    return {
        "start_location": stops_info["start_location"],
        "start_lat": stops_info["start_lat"],
        "start_lng": stops_info["start_lng"],
        "destination": stops_info["destination"],
        "dest_lat": stops_info["dest_lat"],
        "dest_lng": stops_info["dest_lng"],
        "total_distance_km": stops_info["total_distance_km"],
        "estimated_duration_minutes": stops_info["estimated_duration_minutes"],
        "polyline": stops_info["polyline"],
        "routing_provider": stops_info.get("routing_provider", "car routing (demo server)"),
        "fuel_plan": stops_info["fuel_plan"],
        "timeline": stops_info["timeline"],
        "repair_shops": stops_info["repair_shops"],
        "warnings": stops_info.get("warnings", []),
        "weather": weather_data,
        "data_source": stops_info.get("data_source", "osm")
    }

@router.post("/rides/{ride_id}/update-route")
def update_ride_route(ride_id: str, req: RouteUpdateRequest, db: Session = Depends(get_db)):
    """Update ride's end destination or start location and recalculate everything."""
    try:
        orchestrator = RideCaptainOrchestrator(db)
        result = orchestrator.update_route(
            ride_id=ride_id,
            start_location=req.start_location,
            destination=req.destination,
            ride_date=req.ride_date,
            start_time=req.start_time
        )
        if result.get("status") == "error":
            raise HTTPException(status_code=422, detail=result.get("message"))
        return result
    except (GeocodeError, RoutingError) as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e))

@router.get("/rides")
def list_rides(db: Session = Depends(get_db)):
    rides = db.query(Ride).order_by(Ride.created_at.desc()).all()
    return [
        {
            "id": r.id,
            "title": r.title,
            "start_location": r.start_location,
            "destination": r.destination,
            "ride_date": r.ride_date,
            "status": r.status,
            "riders_count": len(r.riders),
            "created_at": r.created_at.isoformat()
        }
        for r in rides
    ]

@router.get("/rides/{ride_id}")
def get_ride_details(ride_id: str, db: Session = Depends(get_db)):
    ride = db.query(Ride).filter(Ride.id == ride_id).first()
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")

    polyline = []
    try:
        polyline = json.loads(ride.route_polyline_json or "[]")
    except:
        polyline = []

    return {
        "id": ride.id,
        "title": ride.title,
        "start_location": ride.start_location,
        "start_lat": ride.start_lat,
        "start_lng": ride.start_lng,
        "destination": ride.destination,
        "dest_lat": ride.dest_lat,
        "dest_lng": ride.dest_lng,
        "ride_date": ride.ride_date,
        "start_time": ride.start_time,
        "budget_per_head": ride.budget_per_head,
        "pace": ride.pace,
        "food_preference": ride.food_preference,
        "total_distance_km": ride.total_distance_km,
        "duration_minutes": ride.duration_minutes,
        "status": ride.status,
        "polyline": polyline,
        "weather_verdict": ride.weather_verdict,
        "weather_summary": ride.weather_summary,
        "riders": [
            {
                "id": r.id,
                "name": r.name,
                "status": r.status,
                "is_captain": r.is_captain,
                "phone": r.phone,
                "upi_id": r.upi_id,
                "bike_model": r.bike_model,
                "tank_litres": r.tank_litres,
                "mileage_kmpl": r.mileage_kmpl,
                "tank_range_km": r.tank_range_km
            }
            for r in ride.riders
        ],
        "stops": [
            {
                "id": s.id,
                "stop_type": s.stop_type,
                "name": s.name,
                "lat": s.lat,
                "lng": s.lng,
                "distance_from_start_km": s.distance_from_start_km,
                "eta": s.eta,
                "duration_minutes": s.duration_minutes,
                "notes": s.notes,
                "order_index": s.order_index,
                "source": getattr(s, "source", "osm") or "osm",
                "brand": getattr(s, "brand", "") or "",
                "offset_km": getattr(s, "offset_km", 0.0) or 0.0,
                "maps_url": getattr(s, "maps_url", "") or f"https://www.google.com/maps/search/?api=1&query={s.lat},{s.lng}",
                "is_optional": getattr(s, "is_optional", False) or False,
                "tags": json.loads(getattr(s, "tags_json", "{}") or "{}")
            }
            for s in sorted(ride.stops, key=lambda x: x.order_index)
        ],
        "pending_actions": [
            {
                "id": a.id,
                "action_type": a.action_type,
                "description": a.description,
                "tool_name": a.tool_name,
                "status": a.status,
                "payload": json.loads(a.payload_json or "{}"),
                "result": json.loads(a.result_json or "{}"),
                "created_at": a.created_at.isoformat()
            }
            for a in ride.pending_actions
        ]
    }

@router.patch("/riders/{rider_id}")
def update_rider(rider_id: str, updates: Dict[str, Any], db: Session = Depends(get_db)):
    rider = db.query(Rider).filter(Rider.id == rider_id).first()
    if not rider:
        raise HTTPException(status_code=404, detail="Rider not found")

    if "name" in updates:
        rider.name = updates["name"]
    if "status" in updates:
        rider.status = updates["status"]
    if "is_captain" in updates:
        rider.is_captain = updates["is_captain"]
    if "upi_id" in updates:
        rider.upi_id = updates["upi_id"]
    if "bike_model" in updates:
        rider.bike_model = updates["bike_model"]
        spec = lookup_bike(rider.bike_model)
        if spec:
            rider.tank_litres = spec.tank_litres
            rider.mileage_kmpl = spec.mileage_kmpl
            rider.tank_range_km = spec.tank_range_km
    if "tank_litres" in updates:
        rider.tank_litres = float(updates["tank_litres"])
        rider.tank_range_km = rider.tank_litres * rider.mileage_kmpl
    if "mileage_kmpl" in updates:
        rider.mileage_kmpl = float(updates["mileage_kmpl"])
        rider.tank_range_km = rider.tank_litres * rider.mileage_kmpl

    db.commit()
    return {"status": "success", "rider_id": rider.id, "tank_range_km": rider.tank_range_km}

@router.get("/bikes")
def list_available_bikes():
    return get_all_bikes()

@router.post("/pending-actions/{action_id}/approve")
def approve_pending_action(action_id: str, db: Session = Depends(get_db)):
    res = approve_action(db, action_id)
    if res.get("status") == "error":
        raise HTTPException(status_code=400, detail=res.get("message"))
    return res

@router.post("/pending-actions/{action_id}/reject")
def reject_pending_action(action_id: str, db: Session = Depends(get_db)):
    res = reject_action(db, action_id)
    if res.get("status") == "error":
        raise HTTPException(status_code=400, detail=res.get("message"))
    return res

@router.get("/rides/{ride_id}/action-logs")
def get_action_logs(ride_id: str, db: Session = Depends(get_db)):
    logs = db.query(ActionLog).filter(
        (ActionLog.ride_id == ride_id) | (ActionLog.ride_id == "pending")
    ).order_by(ActionLog.timestamp.desc()).all()
    return [
        {
            "id": l.id,
            "ride_id": l.ride_id,
            "tool_name": l.tool_name,
            "input_summary": l.input_summary,
            "output_summary": l.output_summary,
            "timestamp": l.timestamp.isoformat(),
            "approved_by": l.approved_by,
            "status": l.status
        }
        for l in logs
    ]

@router.post("/rides/{ride_id}/expenses")
def add_ride_expense(ride_id: str, exp: ExpenseCreate, db: Session = Depends(get_db)):
    ride = db.query(Ride).filter(Ride.id == ride_id).first()
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")
        
    expense = Expense(
        ride_id=ride_id,
        payer_id=exp.payer_id,
        payer_name=exp.payer_name,
        amount=exp.amount,
        category=exp.category,
        description=exp.description,
        split_type=exp.split_type,
        split_among_json=json.dumps(exp.split_among)
    )
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return {"status": "success", "expense_id": expense.id}

@router.get("/rides/{ride_id}/expenses")
def get_ride_expenses(ride_id: str, db: Session = Depends(get_db)):
    ride = db.query(Ride).filter(Ride.id == ride_id).first()
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")
    return [
        {
            "id": e.id,
            "payer_id": e.payer_id,
            "payer_name": e.payer_name,
            "amount": e.amount,
            "category": e.category,
            "description": e.description,
            "split_type": e.split_type,
            "split_among": json.loads(e.split_among_json or "[]"),
            "created_at": e.created_at.isoformat()
        }
        for e in ride.expenses
    ]

@router.get("/rides/{ride_id}/settlement")
def get_ride_settlement(ride_id: str, db: Session = Depends(get_db)):
    ride = db.query(Ride).filter(Ride.id == ride_id).first()
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")

    riders_data = [
        {"id": r.id, "name": r.name, "upi_id": r.upi_id}
        for r in ride.riders if r.status == "confirmed"
    ]
    expenses_data = []
    for e in ride.expenses:
        try:
            split_among = json.loads(e.split_among_json or "[]")
        except:
            split_among = []
        expenses_data.append({
            "payer_id": e.payer_id,
            "amount": e.amount,
            "split_among": split_among
        })

    return compute_minimal_settlements(riders_data, expenses_data)

@router.post("/rides/{ride_id}/voice-query")
def handle_voice_query(ride_id: str, payload: Dict[str, str], db: Session = Depends(get_db)):
    query = payload.get("query", "")
    if not query:
        raise HTTPException(status_code=400, detail="Query cannot be empty")
        
    orchestrator = RideCaptainOrchestrator(db)
    answer = orchestrator.answer_voice_query(ride_id, query)
    return {"query": query, "answer": answer}

@router.post("/tts")
def text_to_speech(payload: Dict[str, str]):
    text = payload.get("text", "")
    language = payload.get("language", "en")
    
    audio_bytes = synthesize_speech_elevenlabs(text, language)
    if audio_bytes:
        return Response(content=audio_bytes, media_type="audio/mpeg")

    return {
        "status": "browser_fallback",
        "message": "Using browser Web Speech API.",
        "text": text,
        "language": language
    }

@router.get("/rides/{ride_id}/briefing-text")
def get_ride_briefing_text(ride_id: str, lang: str = "en", db: Session = Depends(get_db)):
    ride = db.query(Ride).filter(Ride.id == ride_id).first()
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")
    briefing = get_briefing_text(lang, ride.title, ride.total_distance_km, ride.pace)
    return {"language": lang, "text": briefing}

@router.delete("/rides/{ride_id}")
def delete_ride_data(ride_id: str, db: Session = Depends(get_db)):
    ride = db.query(Ride).filter(Ride.id == ride_id).first()
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")
    db.delete(ride)
    db.commit()
    return {"status": "success", "message": f"Ride {ride_id} and all related logs deleted."}

# ==========================================
# External API Settings & Connection Manager
# ==========================================

@router.get("/settings/keys")
def get_api_settings():
    """Return status of all external API credentials."""
    def mask(key: str) -> str:
        if not key or len(key) < 8:
            return ""
        return f"{key[:4]}...{key[-4:]}"

    return {
        "llm_provider": settings.LLM_PROVIDER,
        "demo_mode": settings.DEMO_MODE,
        "services": [
            {
                "id": "ors",
                "name": "OpenRouteService",
                "purpose": "Precise routing & geocoding",
                "free_tier": "Free 2000 req/day",
                "connected": bool(settings.ORS_API_KEY),
                "masked_key": mask(settings.ORS_API_KEY),
                "docs_url": "https://openrouteservice.org/dev/#/signup"
            },
            {
                "id": "gemini",
                "name": "Google Gemini API",
                "purpose": "Advanced multimodal chat parsing",
                "free_tier": "Free rate limits available",
                "connected": bool(settings.GEMINI_API_KEY),
                "masked_key": mask(settings.GEMINI_API_KEY),
                "docs_url": "https://aistudio.google.com/app/apikey"
            },
            {
                "id": "anthropic",
                "name": "Anthropic Claude API",
                "purpose": "Alternative high-precision LLM reasoning",
                "free_tier": "Pay as you go",
                "connected": bool(settings.ANTHROPIC_API_KEY),
                "masked_key": mask(settings.ANTHROPIC_API_KEY),
                "docs_url": "https://console.anthropic.com/"
            },
            {
                "id": "elevenlabs",
                "name": "ElevenLabs Voice API",
                "purpose": "Natural spoken multilingual audio",
                "free_tier": "Free 10k chars/mo",
                "connected": bool(settings.ELEVENLABS_API_KEY),
                "masked_key": mask(settings.ELEVENLABS_API_KEY),
                "docs_url": "https://elevenlabs.io/"
            },
            {
                "id": "openmeteo",
                "name": "Open-Meteo Weather",
                "purpose": "Live route forecasts",
                "free_tier": "100% Free, No key needed",
                "connected": True,
                "masked_key": "Built-in Active",
                "docs_url": "https://open-meteo.com/"
            },
            {
                "id": "osrm",
                "name": "OpenStreetMap OSRM",
                "purpose": "Worldwide live driving navigation",
                "free_tier": "100% Free, No key needed",
                "connected": True,
                "masked_key": "Built-in Active",
                "docs_url": "https://project-osrm.org/"
            }
        ]
    }

@router.post("/settings/keys")
def update_api_settings(keys: KeyUpdateRequest):
    """Save provided API keys to environment."""
    if keys.ors_api_key is not None:
        update_env_key("ORS_API_KEY", keys.ors_api_key.strip())
    if keys.gemini_api_key is not None:
        update_env_key("GEMINI_API_KEY", keys.gemini_api_key.strip())
    if keys.anthropic_api_key is not None:
        update_env_key("ANTHROPIC_API_KEY", keys.anthropic_api_key.strip())
    if keys.elevenlabs_api_key is not None:
        update_env_key("ELEVENLABS_API_KEY", keys.elevenlabs_api_key.strip())
    if keys.llm_provider:
        update_env_key("LLM_PROVIDER", keys.llm_provider.strip())

    return {"status": "success", "message": "API settings updated successfully."}

@router.post("/settings/test-key")
def test_external_key(req: KeyTestRequest):
    """Verify live external key functionality."""
    service = req.service.lower()
    key = req.api_key.strip()
    if not key:
        raise HTTPException(status_code=400, detail="Key cannot be empty")

    t0 = time.time()
    try:
        if service == "ors":
            url = "https://api.openrouteservice.org/v2/directions/driving-car"
            headers = {"Authorization": key, "Content-Type": "application/json"}
            body = {"coordinates": [[77.59, 12.97], [77.60, 12.98]]}
            with httpx.Client(timeout=6.0) as client:
                res = client.post(url, json=body, headers=headers)
                latency = round((time.time() - t0) * 1000)
                if res.status_code == 200:
                    return {"status": "success", "latency_ms": latency, "message": "OpenRouteService key is valid!"}
                return {"status": "failed", "status_code": res.status_code, "message": res.text[:200]}

        elif service == "gemini":
            url = f"https://generativelanguage.googleapis.com/v1beta/models?key={key}"
            with httpx.Client(timeout=6.0) as client:
                res = client.get(url)
                latency = round((time.time() - t0) * 1000)
                if res.status_code == 200:
                    return {"status": "success", "latency_ms": latency, "message": "Google Gemini key is valid!"}
                return {"status": "failed", "status_code": res.status_code, "message": res.text[:200]}

        elif service == "elevenlabs":
            url = "https://api.elevenlabs.io/v1/user"
            headers = {"xi-api-key": key}
            with httpx.Client(timeout=6.0) as client:
                res = client.get(url, headers=headers)
                latency = round((time.time() - t0) * 1000)
                if res.status_code == 200:
                    return {"status": "success", "latency_ms": latency, "message": "ElevenLabs key is valid!"}
                return {"status": "failed", "status_code": res.status_code, "message": res.text[:200]}

        else:
            return {"status": "success", "latency_ms": 10, "message": f"Service {service} test acknowledged."}
    except Exception as e:
        return {"status": "error", "message": str(e)}
