import json
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from backend.app.models import Ride, Rider, RideStop, PendingAction, ActionLog
from backend.app.agent.llm_provider import get_llm_provider
from backend.app.agent.approval_gate import record_action_log, queue_pending_action
from backend.mcp_servers.chat_parser_server import parse_whatsapp_chat
from backend.mcp_servers.stop_finder_server import find_stops_and_route
from backend.mcp_servers.weather_server import get_route_weather
from backend.mcp_servers.bill_split_server import compute_settlement
from backend.app.services.bikes_data import lookup_bike

class RideCaptainOrchestrator:
    def __init__(self, db: Session):
        self.db = db
        self.provider = get_llm_provider()

    def plan_ride_from_chat(self, chat_text: str, demo_mode: bool = True) -> Dict[str, Any]:
        """
        Full MCP Orchestration Workflow:
        1. Tool: parse_whatsapp_chat (READ) -> Extracts riders, bikes, prefs
        2. Create / update Ride & Rider records
        3. Identify smallest tank range in group
        4. Tool: find_stops_and_route (READ) -> Calculates safe fuel legs (0.8x), food, restrooms, repair
        5. Tool: get_route_weather (READ) -> Evaluates GO / CAUTION / NO-GO verdict
        6. Intercept Mutations via Approval Gate -> Queue SAVE_PLAN, GROUP_SUMMARY, CALENDAR_EXPORT
        """
        # Step 1: Parse WhatsApp chat
        parsed_str = parse_whatsapp_chat(chat_text, demo_mode=demo_mode)
        parsed = json.loads(parsed_str)

        # Log chat parsing action
        record_action_log(
            db=self.db,
            ride_id="pending",
            tool_name="chat_parser.parse_whatsapp_chat",
            input_summary=f"Parsed {parsed['raw_message_count']} WhatsApp messages",
            output_summary=f"Extracted {len(parsed['riders'])} riders, date: {parsed['ride_date']}, destination: {parsed['destination']}",
            approved_by="AUTO_READ",
            status="SUCCESS"
        )

        # Step 2: Create Ride entity in DB
        ride = Ride(
            title=parsed["title"],
            start_location=parsed["start_location"],
            destination=parsed["destination"],
            ride_date=parsed.get("ride_date") or "2026-11-29",
            start_time=parsed.get("start_time") or "05:30 am",
            budget_per_head=parsed.get("budget_estimate") or 1800.0,
            pace=parsed.get("pace") or "80-90 km/h cruising",
            food_preference=", ".join(parsed.get("food_preferences", [])),
            status="DRAFT"
        )
        self.db.add(ride)
        self.db.commit()
        self.db.refresh(ride)

        # Step 3: Populate riders
        smallest_tank_range = 9999.0
        smallest_tank_rider = None

        for rdata in parsed.get("riders", []):
            bike_model = rdata.get("bike_model")
            spec = lookup_bike(bike_model) if bike_model else None
            
            tank_litres = rdata.get("tank_litres") or (spec.tank_litres if spec else 14.0)
            mileage_kmpl = rdata.get("mileage_kmpl") or (spec.mileage_kmpl if spec else 28.0)
            tank_range_km = rdata.get("tank_range_km") or (tank_litres * mileage_kmpl)

            rider = Rider(
                ride_id=ride.id,
                name=rdata["name"],
                status=rdata.get("status", "confirmed"),
                is_captain=rdata.get("is_captain", False),
                phone=rdata.get("phone", ""),
                upi_id=rdata.get("upi_id", ""),
                bike_model=bike_model or (spec.model if spec else "Motorcycle"),
                tank_litres=tank_litres,
                mileage_kmpl=mileage_kmpl,
                tank_range_km=tank_range_km
            )
            self.db.add(rider)

            # Track smallest tank among confirmed riders
            if rider.status == "confirmed" and tank_range_km < smallest_tank_range:
                smallest_tank_range = tank_range_km
                smallest_tank_rider = rider

        self.db.commit()

        if smallest_tank_range == 9999.0:
            smallest_tank_range = 301.4

        # Step 4: Route and Stop Finder (READ)
        stops_str = find_stops_and_route(
            ride_id=ride.id,
            smallest_tank_range_km=smallest_tank_range,
            start_time=ride.start_time,
            food_preferences_json=json.dumps(parsed.get("food_preferences", []))
        )
        stops_data = json.loads(stops_str)

        ride.total_distance_km = stops_data["total_distance_km"]
        ride.duration_minutes = stops_data["estimated_duration_minutes"]
        ride.route_polyline_json = json.dumps(stops_data["polyline"])
        self.db.commit()

        record_action_log(
            db=self.db,
            ride_id=ride.id,
            tool_name="stop_finder.find_stops_and_route",
            input_summary=f"Distance: {ride.total_distance_km} km, Smallest Range: {smallest_tank_range:.1f} km",
            output_summary=f"Planned {len(stops_data['timeline'])} timeline stops. Safe fuel range cap: {stops_data['fuel_plan']['safe_range_km']} km.",
            approved_by="AUTO_READ",
            status="SUCCESS"
        )

        # Step 5: Weather Forecast Evaluation (READ)
        weather_str = get_route_weather(target_date=ride.ride_date, demo_mode=demo_mode)
        weather_data = json.loads(weather_str)
        ride.weather_verdict = weather_data.get("overall_verdict", "GO")
        ride.weather_summary = weather_data.get("summary", "")
        self.db.commit()

        record_action_log(
            db=self.db,
            ride_id=ride.id,
            tool_name="weather.get_route_weather",
            input_summary=f"Target Date: {ride.ride_date}, Route: {ride.start_location} to {ride.destination}",
            output_summary=f"Verdict: {ride.weather_verdict} - {ride.weather_summary[:100]}...",
            approved_by="AUTO_READ",
            status="SUCCESS"
        )

        # Step 6: APPROVAL GATE - Intercept Write / Send Actions
        # Action 1: Save & Lock Plan
        queue_pending_action(
            db=self.db,
            ride_id=ride.id,
            action_type="SAVE_PLAN",
            description=f"Approve and lock {len(stops_data['timeline'])} planned stops (Fuel, Food, Restrooms) to database",
            tool_name="ride_plan.save_plan",
            payload={"timeline": stops_data["timeline"]}
        )

        # Action 2: Calendar Export
        queue_pending_action(
            db=self.db,
            ride_id=ride.id,
            action_type="CALENDAR_EXPORT",
            description="Generate official group .ics calendar invite with itinerary stops and timeline",
            tool_name="calendar.export_calendar_ics",
            payload={"ride_id": ride.id}
        )

        # Action 3: Group Summary WhatsApp Post
        queue_pending_action(
            db=self.db,
            ride_id=ride.id,
            action_type="GROUP_SUMMARY",
            description="Format and prepare official ride captain briefing announcement for group chat",
            tool_name="group_comms.post_group_summary",
            payload={"ride_id": ride.id}
        )

        # Initial seed stops into database so map displays immediately in DRAFT state
        for idx, item in enumerate(stops_data["timeline"]):
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
            self.db.add(stop)
        self.db.commit()

        return {
            "ride_id": ride.id,
            "title": ride.title,
            "parsed_summary": parsed,
            "stops_data": stops_data,
            "weather_data": weather_data,
            "pending_actions_count": 3
        }

    def answer_voice_query(self, ride_id: str, query: str) -> str:
        """Handle on-ride voice queries with context."""
        ride = self.db.query(Ride).filter(Ride.id == ride_id).first()
        if not ride:
            return "Ride record not found. Please select or start a ride."

        # Find smallest tank rider
        smallest_range = 9999.0
        smallest_name = "Rahul"
        smallest_bike = "Interceptor 650"
        for r in ride.riders:
            if r.status == "confirmed" and r.tank_range_km and r.tank_range_km < smallest_range:
                smallest_range = r.tank_range_km
                smallest_name = r.name
                smallest_bike = r.bike_model or "Interceptor 650"

        # Find fuel stop
        fuel_stop = next((s for s in ride.stops if s.stop_type == "fuel"), None)
        next_fuel_km = fuel_stop.distance_from_start_km if fuel_stop else 182.4
        next_fuel_name = fuel_stop.name if fuel_stop else "Indian Oil Mega COCO Hassan Bypass"

        context = {
            "title": ride.title,
            "weather_verdict": ride.weather_verdict,
            "smallest_tank_range_km": smallest_range if smallest_range < 9999 else 301.4,
            "smallest_tank_bike": f"{smallest_bike} ({smallest_name})",
            "next_fuel_km": next_fuel_km,
            "next_fuel_name": next_fuel_name
        }

        # If user spoke "confirm" or "approve", check if there is a pending action to approve!
        q_lower = query.lower()
        if "confirm" in q_lower or "approve" in q_lower:
            pending = self.db.query(PendingAction).filter(
                PendingAction.ride_id == ride.id,
                PendingAction.status == "PENDING"
            ).first()
            if pending:
                from backend.app.agent.approval_gate import approve_action
                res = approve_action(self.db, pending.id)
                return f"Confirmed by voice! Approved {pending.action_type}: {pending.description}."
            return "No pending actions found awaiting approval."

        if "cancel" in q_lower or "reject" in q_lower:
            pending = self.db.query(PendingAction).filter(
                PendingAction.ride_id == ride.id,
                PendingAction.status == "PENDING"
            ).first()
            if pending:
                from backend.app.agent.approval_gate import reject_action
                reject_action(self.db, pending.id)
                return f"Action {pending.action_type} cancelled and rejected by voice."
            return "No pending actions to cancel."

        return self.provider.answer_query(query, context)
