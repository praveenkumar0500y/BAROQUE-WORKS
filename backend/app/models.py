import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, Integer, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.db import Base

def gen_uuid():
    return str(uuid.uuid4())

class Ride(Base):
    __tablename__ = "rides"

    id = Column(String, primary_key=True, default=gen_uuid)
    title = Column(String, nullable=False, default="Untitled Motorcycle Ride")
    start_location = Column(String, default="Nelamangala Toll Plaza, Bangalore")
    start_lat = Column(Float, default=13.0945)
    start_lng = Column(Float, default=77.3910)
    destination = Column(String, default="Sakleshpur")
    dest_lat = Column(Float, default=12.9733)
    dest_lng = Column(Float, default=75.7833)
    ride_date = Column(String, default="2026-11-29")
    start_time = Column(String, default="05:30")
    budget_per_head = Column(Float, default=1800.0)
    pace = Column(String, default="80-90 km/h cruising")
    food_preference = Column(String, default="Vegetarian breakfast, Malnad lunch")
    total_distance_km = Column(Float, default=221.5)
    duration_minutes = Column(Integer, default=235)
    status = Column(String, default="DRAFT") # DRAFT, PLANNED, APPROVED, IN_PROGRESS, COMPLETED
    route_polyline_json = Column(Text, default="[]")
    weather_verdict = Column(String, default="GO")
    weather_summary = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)

    riders = relationship("Rider", back_populates="ride", cascade="all, delete-orphan")
    stops = relationship("RideStop", back_populates="ride", cascade="all, delete-orphan", order_by="RideStop.order_index")
    pending_actions = relationship("PendingAction", back_populates="ride", cascade="all, delete-orphan")
    action_logs = relationship("ActionLog", back_populates="ride", cascade="all, delete-orphan")
    expenses = relationship("Expense", back_populates="ride", cascade="all, delete-orphan")

class Rider(Base):
    __tablename__ = "riders"

    id = Column(String, primary_key=True, default=gen_uuid)
    ride_id = Column(String, ForeignKey("rides.id"), nullable=False)
    name = Column(String, nullable=False)
    status = Column(String, default="confirmed") # confirmed, undecided, declined
    is_captain = Column(Boolean, default=False)
    phone = Column(String, default="")
    upi_id = Column(String, default="")
    bike_model = Column(String, default="Royal Enfield Himalayan 450")
    tank_litres = Column(Float, default=17.0)
    mileage_kmpl = Column(Float, default=28.0)
    tank_range_km = Column(Float, default=476.0)

    ride = relationship("Ride", back_populates="riders")

class RideStop(Base):
    __tablename__ = "ride_stops"

    id = Column(String, primary_key=True, default=gen_uuid)
    ride_id = Column(String, ForeignKey("rides.id"), nullable=False)
    stop_type = Column(String, nullable=False) # fuel, food, restroom, repair, checkpoint
    name = Column(String, nullable=False)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    distance_from_start_km = Column(Float, default=0.0)
    eta = Column(String, default="")
    duration_minutes = Column(Integer, default=15)
    notes = Column(Text, default="")
    order_index = Column(Integer, default=0)
    source = Column(String, default="osm") # osm, cached, estimated
    brand = Column(String, default="")
    offset_km = Column(Float, default=0.0)
    tags_json = Column(Text, default="{}")
    maps_url = Column(String, default="")
    is_optional = Column(Boolean, default=False)

    ride = relationship("Ride", back_populates="stops")

class PendingAction(Base):
    __tablename__ = "pending_actions"

    id = Column(String, primary_key=True, default=gen_uuid)
    ride_id = Column(String, ForeignKey("rides.id"), nullable=False)
    action_type = Column(String, nullable=False) # SAVE_PLAN, CALENDAR_EXPORT, GROUP_SUMMARY, SETTLEMENT_LINKS
    description = Column(Text, nullable=False)
    tool_name = Column(String, nullable=False)
    payload_json = Column(Text, default="{}")
    status = Column(String, default="PENDING") # PENDING, APPROVED, REJECTED, EXECUTED
    result_json = Column(Text, default="{}")
    created_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)

    ride = relationship("Ride", back_populates="pending_actions")

class ActionLog(Base):
    __tablename__ = "action_logs"

    id = Column(String, primary_key=True, default=gen_uuid)
    ride_id = Column(String, ForeignKey("rides.id"), nullable=False)
    tool_name = Column(String, nullable=False)
    input_summary = Column(Text, default="")
    output_summary = Column(Text, default="")
    timestamp = Column(DateTime, default=datetime.utcnow)
    approved_by = Column(String, default="SYSTEM") # CAPTAIN, SYSTEM, AUTO_READ
    status = Column(String, default="SUCCESS") # SUCCESS, FAILED, BLOCKED_FOR_APPROVAL, EXECUTED_ON_APPROVAL

    ride = relationship("Ride", back_populates="action_logs")

class Expense(Base):
    __tablename__ = "expenses"

    id = Column(String, primary_key=True, default=gen_uuid)
    ride_id = Column(String, ForeignKey("rides.id"), nullable=False)
    payer_id = Column(String, nullable=False)
    payer_name = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    category = Column(String, default="food") # food, fuel, stay, toll, other
    description = Column(String, default="")
    split_type = Column(String, default="EQUAL") # EQUAL, CUSTOM
    split_among_json = Column(Text, default="[]") # list of rider IDs
    created_at = Column(DateTime, default=datetime.utcnow)

    ride = relationship("Ride", back_populates="expenses")
