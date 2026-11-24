import json
import uuid
from typing import Dict, Any, List, Optional
from mcp.server.mcpserver import MCPServer
from backend.app.db import SessionLocal
from backend.app.models import Ride, Rider, RideStop, PendingAction, ActionLog
from backend.app.services.bikes_data import lookup_bike

server = MCPServer("ride_plan_server")

@server.tool()
def create_ride(
    title: str,
    start_location: str,
    destination: str,
    ride_date: str,
    start_time: str,
    budget_per_head: float = 1800.0,
    pace: str = "80-90 km/h cruising",
    food_preference: str = "Vegetarian breakfast, Malnad lunch"
) -> str:
    """Create a new ride record in SQLite database."""
    db = SessionLocal()
    try:
        ride = Ride(
            title=title,
            start_location=start_location,
            destination=destination,
            ride_date=ride_date,
            start_time=start_time,
            budget_per_head=budget_per_head,
            pace=pace,
            food_preference=food_preference
        )
        db.add(ride)
        db.commit()
        db.refresh(ride)
        return json.dumps({"status": "success", "ride_id": ride.id, "title": ride.title})
    finally:
        db.close()

@server.tool()
def add_rider(
    ride_id: str,
    name: str,
    status: str = "confirmed",
    is_captain: bool = False,
    phone: str = "",
    upi_id: str = "",
    bike_model: str = "Royal Enfield Himalayan 450",
    tank_litres: float = 17.0,
    mileage_kmpl: float = 28.0
) -> str:
    """Add a rider with their bike specs to a ride."""
    db = SessionLocal()
    try:
        ride = db.query(Ride).filter(Ride.id == ride_id).first()
        if not ride:
            return json.dumps({"status": "error", "message": f"Ride {ride_id} not found"})
        
        # Calculate tank range
        tank_range_km = tank_litres * mileage_kmpl
        rider = Rider(
            ride_id=ride_id,
            name=name,
            status=status,
            is_captain=is_captain,
            phone=phone,
            upi_id=upi_id,
            bike_model=bike_model,
            tank_litres=tank_litres,
            mileage_kmpl=mileage_kmpl,
            tank_range_km=tank_range_km
        )
        db.add(rider)
        db.commit()
        db.refresh(rider)
        return json.dumps({"status": "success", "rider_id": rider.id, "tank_range_km": tank_range_km})
    finally:
        db.close()

@server.tool()
def set_bike(
    rider_id: str,
    bike_model: str,
    tank_litres: Optional[float] = None,
    mileage_kmpl: Optional[float] = None
) -> str:
    """Update a rider's motorcycle model and specs."""
    db = SessionLocal()
    try:
        rider = db.query(Rider).filter(Rider.id == rider_id).first()
        if not rider:
            return json.dumps({"status": "error", "message": f"Rider {rider_id} not found"})
        
        spec = lookup_bike(bike_model)
        if spec:
            rider.bike_model = spec.model
            rider.tank_litres = tank_litres or spec.tank_litres
            rider.mileage_kmpl = mileage_kmpl or spec.mileage_kmpl
            rider.tank_range_km = rider.tank_litres * rider.mileage_kmpl
        else:
            rider.bike_model = bike_model
            if tank_litres:
                rider.tank_litres = tank_litres
            if mileage_kmpl:
                rider.mileage_kmpl = mileage_kmpl
            rider.tank_range_km = rider.tank_litres * rider.mileage_kmpl
            
        db.commit()
        return json.dumps({
            "status": "success",
            "rider_id": rider.id,
            "bike_model": rider.bike_model,
            "tank_range_km": rider.tank_range_km
        })
    finally:
        db.close()

@server.tool()
def get_ride(ride_id: str) -> str:
    """Retrieve full details of a ride including riders and planned stops."""
    db = SessionLocal()
    try:
        ride = db.query(Ride).filter(Ride.id == ride_id).first()
        if not ride:
            return json.dumps({"status": "error", "message": f"Ride {ride_id} not found"})
            
        riders_list = []
        for r in ride.riders:
            riders_list.append({
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
            })
            
        stops_list = []
        for s in ride.stops:
            stops_list.append({
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
            })

        return json.dumps({
            "id": ride.id,
            "title": ride.title,
            "start_location": ride.start_location,
            "destination": ride.destination,
            "ride_date": ride.ride_date,
            "start_time": ride.start_time,
            "budget_per_head": ride.budget_per_head,
            "pace": ride.pace,
            "food_preference": ride.food_preference,
            "total_distance_km": ride.total_distance_km,
            "duration_minutes": ride.duration_minutes,
            "status": ride.status,
            "weather_verdict": ride.weather_verdict,
            "weather_summary": ride.weather_summary,
            "riders": riders_list,
            "stops": stops_list
        })
    finally:
        db.close()

@server.tool()
def list_pending_actions(ride_id: str) -> str:
    """List pending actions awaiting captain's review."""
    db = SessionLocal()
    try:
        actions = db.query(PendingAction).filter(
            PendingAction.ride_id == ride_id,
            PendingAction.status == "PENDING"
        ).all()
        return json.dumps([
            {
                "id": a.id,
                "action_type": a.action_type,
                "description": a.description,
                "tool_name": a.tool_name,
                "payload": json.loads(a.payload_json or "{}"),
                "created_at": a.created_at.isoformat()
            }
            for a in actions
        ])
    finally:
        db.close()

if __name__ == "__main__":
    server.run(transport="stdio")
