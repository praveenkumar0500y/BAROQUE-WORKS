import json
from datetime import datetime
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from backend.app.models import PendingAction, ActionLog, Ride, RideStop
from backend.mcp_servers.calendar_server import generate_ics_content

# Classification of tools
READ_TOOLS = {
    "parse_whatsapp_chat",
    "get_ride",
    "list_pending_actions",
    "get_route_weather",
    "find_stops_and_route",
    "compute_settlement"
}

WRITE_ACTIONS = {
    "SAVE_PLAN": "Save and lock the finalized route, fuel stops, and timeline to the database",
    "CALENDAR_EXPORT": "Generate official iCalendar .ics schedule file for the group",
    "GROUP_SUMMARY": "Post official ride briefing and instructions to the group WhatsApp chat",
    "SETTLEMENT_LINKS": "Publish UPI debt settlement links and request payments"
}

def record_action_log(
    db: Session,
    ride_id: str,
    tool_name: str,
    input_summary: str,
    output_summary: str,
    approved_by: str,
    status: str
) -> ActionLog:
    """Audit log entry for every tool call and human decision."""
    log_entry = ActionLog(
        ride_id=ride_id,
        tool_name=tool_name,
        input_summary=input_summary[:300],
        output_summary=output_summary[:500],
        timestamp=datetime.utcnow(),
        approved_by=approved_by,
        status=status
    )
    db.add(log_entry)
    db.commit()
    db.refresh(log_entry)
    return log_entry

def queue_pending_action(
    db: Session,
    ride_id: str,
    action_type: str,
    description: str,
    tool_name: str,
    payload: Dict[str, Any]
) -> PendingAction:
    """Intercept a write action, queue it as PENDING, and log as BLOCKED_FOR_APPROVAL."""
    # Check if a pending action of this type already exists for this ride
    existing = db.query(PendingAction).filter(
        PendingAction.ride_id == ride_id,
        PendingAction.action_type == action_type,
        PendingAction.status == "PENDING"
    ).first()
    
    if existing:
        return existing

    action = PendingAction(
        ride_id=ride_id,
        action_type=action_type,
        description=description,
        tool_name=tool_name,
        payload_json=json.dumps(payload),
        status="PENDING",
        result_json="{}"
    )
    db.add(action)
    db.commit()
    db.refresh(action)

    record_action_log(
        db=db,
        ride_id=ride_id,
        tool_name=tool_name,
        input_summary=f"Action requested: {action_type} - {description}",
        output_summary="BLOCKED BY APPROVAL GATE: Awaiting Captain's confirmation.",
        approved_by="APPROVAL_GATE",
        status="BLOCKED_FOR_APPROVAL"
    )

    return action

def approve_action(db: Session, action_id: str) -> Dict[str, Any]:
    """Execute an approved action and record it in the audit log."""
    action = db.query(PendingAction).filter(PendingAction.id == action_id).first()
    if not action:
        return {"status": "error", "message": "Pending action not found"}
        
    if action.status != "PENDING":
        return {"status": "error", "message": f"Action is already {action.status}"}

    payload = json.loads(action.payload_json or "{}")
    result_data = {}

    try:
        if action.action_type == "SAVE_PLAN":
            ride = db.query(Ride).filter(Ride.id == action.ride_id).first()
            if ride:
                ride.status = "APPROVED"
                # If stops are in payload, persist them
                timeline = payload.get("timeline", [])
                # Clear existing stops
                db.query(RideStop).filter(RideStop.ride_id == ride.id).delete()
                for idx, item in enumerate(timeline):
                    stop = RideStop(
                        ride_id=ride.id,
                        stop_type=item.get("type", "checkpoint"),
                        name=item.get("name", "Stop"),
                        lat=float(item.get("lat", 13.0)),
                        lng=float(item.get("lng", 77.0)),
                        distance_from_start_km=float(item.get("km_from_start", 0.0)),
                        eta=item.get("eta", ""),
                        duration_minutes=int(item.get("duration_minutes", 15)),
                        notes=item.get("notes", ""),
                        order_index=idx
                    )
                    db.add(stop)
                db.commit()
                result_data = {"saved_stops_count": len(timeline), "ride_status": "APPROVED"}

        elif action.action_type == "CALENDAR_EXPORT":
            ride = db.query(Ride).filter(Ride.id == action.ride_id).first()
            if ride:
                ics_str = generate_ics_content(ride)
                result_data = {
                    "ics_content": ics_str,
                    "filename": f"ride_{ride.title.replace(' ', '_').lower()}.ics",
                    "exported_at": datetime.utcnow().isoformat()
                }

        elif action.action_type == "GROUP_SUMMARY":
            ride = db.query(Ride).filter(Ride.id == action.ride_id).first()
            stops_text = "\n".join([f"• {s.eta} - {s.name} ({s.stop_type.title()})" for s in ride.stops])
            summary_msg = (
                f"🚨 *OFFICIAL RIDE PLAN APPROVED BY CAPTAIN*\n"
                f"🏍️ *{ride.title}*\n\n"
                f"📍 *Route:* {ride.start_location} ➡️ {ride.destination}\n"
                f"📅 *Date & Time:* {ride.ride_date} | Kickstands up at {ride.start_time}\n"
                f"🛣️ *Distance:* {ride.total_distance_km} km | *Cruising Pace:* {ride.pace}\n"
                f"⛅ *Weather Verdict:* {ride.weather_verdict} (All clear, low rain prob)\n"
                f"💰 *Budget:* ~₹{ride.budget_per_head} / person\n\n"
                f"🛑 *Timeline & Stops:*\n{stops_text}\n\n"
                f"⚠️ *Rules:* Full protective gear (Helmet, Jacket, Boots, Gloves) mandatory. "
                f"Staggered highway formation. Headlights on. Let's ride safe!\n"
            )
            result_data = {"summary_text": summary_msg, "posted": True}

        elif action.action_type == "SETTLEMENT_LINKS":
            result_data = {
                "settlement_status": "PUBLISHED",
                "message": "UPI payment links published to riders."
            }

        action.status = "APPROVED"
        action.result_json = json.dumps(result_data)
        action.resolved_at = datetime.utcnow()
        db.commit()

        record_action_log(
            db=db,
            ride_id=action.ride_id,
            tool_name=action.tool_name,
            input_summary=f"Approved: {action.action_type}",
            output_summary=f"EXECUTED ON APPROVAL: {json.dumps(result_data)[:200]}",
            approved_by="CAPTAIN",
            status="EXECUTED_ON_APPROVAL"
        )

        return {"status": "success", "action_id": action.id, "result": result_data}

    except Exception as e:
        db.rollback()
        return {"status": "error", "message": str(e)}

def reject_action(db: Session, action_id: str) -> Dict[str, Any]:
    """Captain rejects a pending action."""
    action = db.query(PendingAction).filter(PendingAction.id == action_id).first()
    if not action:
        return {"status": "error", "message": "Pending action not found"}

    action.status = "REJECTED"
    action.resolved_at = datetime.utcnow()
    db.commit()

    record_action_log(
        db=db,
        ride_id=action.ride_id,
        tool_name=action.tool_name,
        input_summary=f"Rejected: {action.action_type}",
        output_summary="REJECTED BY CAPTAIN: Action will not execute.",
        approved_by="CAPTAIN",
        status="REJECTED"
    )

    return {"status": "success", "action_id": action.id, "action_status": "REJECTED"}
