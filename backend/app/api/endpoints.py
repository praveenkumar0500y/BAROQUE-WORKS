import json
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session
from backend.app.db import get_db
from backend.app.config import settings
from backend.app.models import Ride, Rider, RideStop, PendingAction, ActionLog, Expense
from backend.app.schemas import (
    ChatParseRequest, RiderBase, ExpenseCreate, SettlementPlan
)
from backend.app.agent.orchestrator import RideCaptainOrchestrator
from backend.app.agent.approval_gate import approve_action, reject_action
from backend.app.services.bikes_data import get_all_bikes, lookup_bike
from backend.app.services.speech_service import synthesize_speech_elevenlabs, get_briefing_text
from backend.mcp_servers.bill_split_server import compute_minimal_settlements

router = APIRouter()

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
def parse_chat_and_plan(req: ChatParseRequest, db: Session = Depends(get_db)):
    """Parse chat text, initiate ride, calculate route & stops, and queue pending approvals."""
    orchestrator = RideCaptainOrchestrator(db)
    result = orchestrator.plan_ride_from_chat(req.chat_text, demo_mode=req.demo_mode)
    return result

@router.get("/rides")
def list_rides(db: Session = Depends(get_db)):
    """List all created rides."""
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
    """Fetch complete ride model with riders, stops, pending actions, and logs."""
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
                "order_index": s.order_index
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
    """Update a rider's details, bike, or status."""
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
    """List standard Indian motorcycles with tank capacities and mileage specs."""
    return get_all_bikes()

@router.post("/pending-actions/{action_id}/approve")
def approve_pending_action(action_id: str, db: Session = Depends(get_db)):
    """Captain approves a pending action."""
    res = approve_action(db, action_id)
    if res.get("status") == "error":
        raise HTTPException(status_code=400, detail=res.get("message"))
    return res

@router.post("/pending-actions/{action_id}/reject")
def reject_pending_action(action_id: str, db: Session = Depends(get_db)):
    """Captain rejects a pending action."""
    res = reject_action(db, action_id)
    if res.get("status") == "error":
        raise HTTPException(status_code=400, detail=res.get("message"))
    return res

@router.get("/rides/{ride_id}/action-logs")
def get_action_logs(ride_id: str, db: Session = Depends(get_db)):
    """Fetch immutable action audit logs for this ride."""
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
    """Record an expense."""
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
    """List expenses for a ride."""
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
    """Compute minimal settlement debts and UPI payment deep links."""
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
    """Handle on-ride voice queries."""
    query = payload.get("query", "")
    if not query:
        raise HTTPException(status_code=400, detail="Query cannot be empty")
        
    orchestrator = RideCaptainOrchestrator(db)
    answer = orchestrator.answer_voice_query(ride_id, query)
    return {"query": query, "answer": answer}

@router.post("/tts")
def text_to_speech(payload: Dict[str, str]):
    """Synthesize text via ElevenLabs or signal frontend to use Web Speech API."""
    text = payload.get("text", "")
    language = payload.get("language", "en")
    
    # Try ElevenLabs if configured
    audio_bytes = synthesize_speech_elevenlabs(text, language)
    if audio_bytes:
        return Response(content=audio_bytes, media_type="audio/mpeg")

    # Fallback to browser Web Speech API
    return {
        "status": "browser_fallback",
        "message": "ElevenLabs API key not configured. Using client Web Speech API.",
        "text": text,
        "language": language
    }

@router.get("/rides/{ride_id}/briefing-text")
def get_ride_briefing_text(ride_id: str, lang: str = "en", db: Session = Depends(get_db)):
    """Get spoken briefing script in English, Hindi, or Kannada."""
    ride = db.query(Ride).filter(Ride.id == ride_id).first()
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")
    briefing = get_briefing_text(lang, ride.title, ride.total_distance_km, ride.pace)
    return {"language": lang, "text": briefing}

@router.delete("/rides/{ride_id}")
def delete_ride_data(ride_id: str, db: Session = Depends(get_db)):
    """Privacy rule: delete ride, chats, and associated data with one button."""
    ride = db.query(Ride).filter(Ride.id == ride_id).first()
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")
    db.delete(ride)
    db.commit()
    return {"status": "success", "message": f"Ride {ride_id} and all related logs deleted."}
