import json
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from backend.app.models import Ride, Rider, RideStop, PendingAction, ActionLog
from backend.app.agent.llm_provider import get_llm_provider
from backend.app.agent.approval_gate import record_action_log, queue_pending_action
from backend.mcp_servers.chat_parser_server import parse_whatsapp_chat
from backend.mcp_servers.stop_finder_server import find_stops_and_route
from backend.mcp_servers.weather_server import get_route_weather
from backend.app.services.bikes_data import lookup_bike

class RideCaptainOrchestrator:
    def __init__(self, db: Session):
        self.db = db
        self.provider = get_llm_provider()

    def plan_ride_from_chat(
        self,
        chat_text: str,
        custom_destination: Optional[str] = None,
        custom_start: Optional[str] = None,
        custom_date: Optional[str] = None,
        custom_time: Optional[str] = None,
        demo_mode: bool = False
    ) -> Dict[str, Any]:
        """
        MCP Orchestration Workflow:
        1. Parse WhatsApp chat
        2. Create / update Ride & Rider records
        3. Identify smallest tank range in group
        4. Calculate route and stops (via live ORS/OSRM)
        5. Evaluate live weather
        6. Queue pending actions for Captain's review
        """
        # Step 1: Parse WhatsApp chat
        parsed_str = parse_whatsapp_chat(chat_text, demo_mode=demo_mode)
        parsed = json.loads(parsed_str)

        # Allow override from UI inputs if user customized them
        final_dest = custom_destination or parsed.get("destination") or "Sakleshpur"
        final_start = custom_start or parsed.get("start_location") or "Nelamangala Toll Plaza, Bangalore"
        final_date = custom_date or parsed.get("ride_date") or "2026-11-29"
        final_time = custom_time or parsed.get("start_time") or "05:30 am"

        # Log chat parsing action
        record_action_log(
            db=self.db,
            ride_id="pending",
            tool_name="chat_parser.parse_whatsapp_chat",
            input_summary=f"Parsed {parsed['raw_message_count']} WhatsApp messages",
            output_summary=f"Extracted {len(parsed['riders'])} riders, date: {final_date}, destination: {final_dest}",
            approved_by="AUTO_READ",
            status="SUCCESS"
        )

        # Step 2: Create Ride entity in DB
        ride = Ride(
            title=f"Ride to {final_dest}",
            start_location=final_start,
            destination=final_dest,
            ride_date=final_date,
            start_time=final_time,
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

            if rider.status == "confirmed" and tank_range_km < smallest_tank_range:
                smallest_tank_range = tank_range_km

        self.db.commit()

        if smallest_tank_range == 9999.0:
            smallest_tank_range = 301.4

        # Step 4: Route and Stop Finder (Live Routing)
        stops_str = find_stops_and_route(
            ride_id=ride.id,
            smallest_tank_range_km=smallest_tank_range,
            start_time=ride.start_time,
            food_preferences_json=json.dumps(parsed.get("food_preferences", [])),
            start_location=final_start,
            destination=final_dest,
            demo_mode=demo_mode
        )
        stops_data = json.loads(stops_str)

        ride.start_lat = stops_data.get("start_lat", 13.0945)
        ride.start_lng = stops_data.get("start_lng", 77.3910)
        ride.dest_lat = stops_data.get("dest_lat", 12.9733)
        ride.dest_lng = stops_data.get("dest_lng", 75.7833)
        ride.total_distance_km = stops_data["total_distance_km"]
        ride.duration_minutes = stops_data["estimated_duration_minutes"]
        ride.route_polyline_json = json.dumps(stops_data["polyline"])
        self.db.commit()

        record_action_log(
            db=self.db,
            ride_id=ride.id,
            tool_name="stop_finder.find_stops_and_route",
            input_summary=f"{final_start} to {final_dest} ({ride.total_distance_km} km), Safe Range Cap: {stops_data['fuel_plan']['safe_range_km']} km",
            output_summary=f"Planned {len(stops_data['timeline'])} timeline stops via {stops_data.get('routing_provider', 'car routing (demo server)')}.",
            approved_by="AUTO_READ",
            status="SUCCESS"
        )

        # Step 5: Weather Forecast Evaluation
        checkpoints_for_weather = [
            {"name": t["name"], "lat": t["lat"], "lng": t["lng"], "eta": t.get("eta", "")}
            for t in stops_data["timeline"][:4]
        ]
        weather_str = get_route_weather(
            target_date=ride.ride_date,
            demo_mode=demo_mode,
            checkpoints_json=json.dumps(checkpoints_for_weather)
        )
        weather_data = json.loads(weather_str)
        ride.weather_verdict = weather_data.get("overall_verdict", "GO")
        ride.weather_summary = weather_data.get("summary", "")
        self.db.commit()

        record_action_log(
            db=self.db,
            ride_id=ride.id,
            tool_name="weather.get_route_weather",
            input_summary=f"Target Date: {ride.ride_date}, Destination: {final_dest}",
            output_summary=f"Verdict: {ride.weather_verdict} - {ride.weather_summary[:100]}",
            approved_by="AUTO_READ",
            status="SUCCESS"
        )

        # Step 6: Approval Gate Queuing
        queue_pending_action(
            db=self.db,
            ride_id=ride.id,
            action_type="SAVE_PLAN",
            description=f"Approve and lock {len(stops_data['timeline'])} planned stops (Fuel, Food, Restrooms) to database",
            tool_name="ride_plan.save_plan",
            payload={"timeline": stops_data["timeline"]}
        )

        queue_pending_action(
            db=self.db,
            ride_id=ride.id,
            action_type="CALENDAR_EXPORT",
            description="Generate official group .ics calendar invite with itinerary stops and timeline",
            tool_name="calendar.export_calendar_ics",
            payload={"ride_id": ride.id}
        )

        queue_pending_action(
            db=self.db,
            ride_id=ride.id,
            action_type="GROUP_SUMMARY",
            description="Format and prepare official ride briefing announcement for group chat",
            tool_name="group_comms.post_group_summary",
            payload={"ride_id": ride.id}
        )

        # Initial seed stops into database
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
                order_index=idx,
                source=item.get("source", "osm"),
                brand=item.get("brand", ""),
                offset_km=float(item.get("offset_km", 0.0)),
                tags_json=json.dumps(item.get("tags", {})),
                maps_url=item.get("maps_url", ""),
                is_optional=bool(item.get("is_optional", False))
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

    def update_route(
        self,
        ride_id: str,
        start_location: str,
        destination: str,
        ride_date: Optional[str] = None,
        start_time: Optional[str] = None
    ) -> Dict[str, Any]:
        """Recalculate route and stops when user changes start or destination."""
        ride = self.db.query(Ride).filter(Ride.id == ride_id).first()
        if not ride:
            return {"status": "error", "message": "Ride not found"}

        ride.start_location = start_location
        ride.destination = destination
        ride.title = f"Ride to {destination}"
        if ride_date:
            ride.ride_date = ride_date
        if start_time:
            ride.start_time = start_time

        # Find smallest tank range
        smallest_tank_range = 9999.0
        for r in ride.riders:
            if r.status == "confirmed" and r.tank_range_km and r.tank_range_km < smallest_tank_range:
                smallest_tank_range = r.tank_range_km
        if smallest_tank_range == 9999.0:
            smallest_tank_range = 301.4

        # Recalculate route & stops
        stops_str = find_stops_and_route(
            ride_id=ride.id,
            smallest_tank_range_km=smallest_tank_range,
            start_time=ride.start_time,
            start_location=start_location,
            destination=destination
        )
        stops_data = json.loads(stops_str)

        ride.start_lat = stops_data.get("start_lat", 13.0945)
        ride.start_lng = stops_data.get("start_lng", 77.3910)
        ride.dest_lat = stops_data.get("dest_lat", 12.9733)
        ride.dest_lng = stops_data.get("dest_lng", 75.7833)
        ride.total_distance_km = stops_data["total_distance_km"]
        ride.duration_minutes = stops_data["estimated_duration_minutes"]
        ride.route_polyline_json = json.dumps(stops_data["polyline"])

        # Update stops in DB
        self.db.query(RideStop).filter(RideStop.ride_id == ride.id).delete()
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
                order_index=idx,
                source=item.get("source", "osm"),
                brand=item.get("brand", ""),
                offset_km=float(item.get("offset_km", 0.0)),
                tags_json=json.dumps(item.get("tags", {})),
                maps_url=item.get("maps_url", ""),
                is_optional=bool(item.get("is_optional", False))
            )
            self.db.add(stop)

        # Update weather
        checkpoints_for_weather = [
            {"name": t["name"], "lat": t["lat"], "lng": t["lng"], "eta": t.get("eta", "")}
            for t in stops_data["timeline"][:4]
        ]
        weather_str = get_route_weather(
            target_date=ride.ride_date,
            checkpoints_json=json.dumps(checkpoints_for_weather)
        )
        weather_data = json.loads(weather_str)
        ride.weather_verdict = weather_data.get("overall_verdict", "GO")
        ride.weather_summary = weather_data.get("summary", "")

        self.db.commit()

        record_action_log(
            db=self.db,
            ride_id=ride.id,
            tool_name="stop_finder.update_route",
            input_summary=f"Changed Route to: {start_location} -> {destination} ({ride.total_distance_km} km)",
            output_summary=f"Recalculated {len(stops_data['timeline'])} stops. Safe Range Cap: {stops_data['fuel_plan']['safe_range_km']} km.",
            approved_by="CAPTAIN",
            status="SUCCESS"
        )

        return {
            "status": "success",
            "ride_id": ride.id,
            "total_distance_km": ride.total_distance_km,
            "duration_minutes": ride.duration_minutes,
            "stops_count": len(stops_data["timeline"]),
            "weather_verdict": ride.weather_verdict
        }

    def answer_voice_query(self, ride_id: str, query: str) -> str:
        ride = self.db.query(Ride).filter(Ride.id == ride_id).first()
        if not ride:
            return "Ride record not found. Please select or start a ride."

        smallest_range = 9999.0
        smallest_name = "Rahul"
        smallest_bike = "Interceptor 650"
        for r in ride.riders:
            if r.status == "confirmed" and r.tank_range_km and r.tank_range_km < smallest_range:
                smallest_range = r.tank_range_km
                smallest_name = r.name
                smallest_bike = r.bike_model or "Interceptor 650"

        fuel_stop = next((s for s in ride.stops if s.stop_type == "fuel"), None)
        next_fuel_km = fuel_stop.distance_from_start_km if fuel_stop else 182.4
        next_fuel_name = fuel_stop.name if fuel_stop else "Indian Oil Highway Care"

        context = {
            "title": ride.title,
            "weather_verdict": ride.weather_verdict,
            "smallest_tank_range_km": smallest_range if smallest_range < 9999 else 301.4,
            "smallest_tank_bike": f"{smallest_bike} ({smallest_name})",
            "next_fuel_km": next_fuel_km,
            "next_fuel_name": next_fuel_name
        }

        q_lower = query.lower()
        if "confirm" in q_lower or "approve" in q_lower:
            pending = self.db.query(PendingAction).filter(
                PendingAction.ride_id == ride.id,
                PendingAction.status == "PENDING"
            ).first()
            if pending:
                from backend.app.agent.approval_gate import approve_action
                res = approve_action(self.db, pending.id)
                return f"Confirmed by voice. Approved {pending.action_type}."
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
