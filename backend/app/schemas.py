from typing import List, Optional, Dict, Any
from pydantic import BaseModel, ConfigDict
from datetime import datetime

# Bike Specs
class BikeSpec(BaseModel):
    model: str
    tank_litres: float
    mileage_kmpl: float
    tank_range_km: float

# Rider Schemas
class RiderBase(BaseModel):
    name: str
    status: str = "confirmed" # confirmed, undecided, declined
    is_captain: bool = False
    phone: Optional[str] = ""
    upi_id: Optional[str] = ""
    bike_model: Optional[str] = "Royal Enfield Himalayan 450"
    tank_litres: Optional[float] = 17.0
    mileage_kmpl: Optional[float] = 28.0
    tank_range_km: Optional[float] = 476.0

class RiderCreate(RiderBase):
    pass

class RiderResponse(RiderBase):
    id: str
    ride_id: str

    model_config = ConfigDict(from_attributes=True)

# Ride Stop Schemas
class RideStopBase(BaseModel):
    stop_type: str # fuel, food, restroom, repair, checkpoint
    name: str
    lat: float
    lng: float
    distance_from_start_km: float = 0.0
    eta: Optional[str] = ""
    duration_minutes: int = 15
    notes: Optional[str] = ""
    order_index: int = 0

class RideStopCreate(RideStopBase):
    pass

class RideStopResponse(RideStopBase):
    id: str
    ride_id: str

    model_config = ConfigDict(from_attributes=True)

# Pending Action Schemas
class PendingActionResponse(BaseModel):
    id: str
    ride_id: str
    action_type: str
    description: str
    tool_name: str
    payload_json: str
    status: str # PENDING, APPROVED, REJECTED, EXECUTED
    result_json: str
    created_at: datetime
    resolved_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

# Action Log Schemas
class ActionLogResponse(BaseModel):
    id: str
    ride_id: str
    tool_name: str
    input_summary: str
    output_summary: str
    timestamp: datetime
    approved_by: str
    status: str

    model_config = ConfigDict(from_attributes=True)

# Expense & Settlement Schemas
class ExpenseCreate(BaseModel):
    payer_id: str
    payer_name: str
    amount: float
    category: str = "food"
    description: str = ""
    split_type: str = "EQUAL"
    split_among: List[str] = []

class ExpenseResponse(BaseModel):
    id: str
    ride_id: str
    payer_id: str
    payer_name: str
    amount: float
    category: str
    description: str
    split_type: str
    split_among_json: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class SettlementItem(BaseModel):
    from_rider_id: str
    from_rider_name: str
    to_rider_id: str
    to_rider_name: str
    amount: float
    upi_id: str
    upi_link: str

class SettlementPlan(BaseModel):
    total_expenses: float
    settlements: List[SettlementItem]
    per_rider_balance: Dict[str, float]

# Ride Schemas
class RideBase(BaseModel):
    title: str = "Bangalore to Sakleshpur Ride"
    start_location: str = "Nelamangala Toll Plaza, Bangalore"
    start_lat: float = 13.0945
    start_lng: float = 77.3910
    destination: str = "Sakleshpur"
    dest_lat: float = 12.9733
    dest_lng: float = 75.7833
    ride_date: str = "2026-11-29"
    start_time: str = "05:30"
    budget_per_head: float = 1800.0
    pace: str = "80-90 km/h cruising"
    food_preference: str = "Vegetarian breakfast, Malnad lunch"
    total_distance_km: float = 221.5
    duration_minutes: int = 235
    status: str = "DRAFT"
    route_polyline_json: str = "[]"
    weather_verdict: str = "GO"
    weather_summary: str = ""

class RideCreate(RideBase):
    pass

class RideResponse(RideBase):
    id: str
    created_at: datetime
    riders: List[RiderResponse] = []
    stops: List[RideStopResponse] = []

    model_config = ConfigDict(from_attributes=True)


# Chat Parsing Schemas
class ChatParseRequest(BaseModel):
    chat_text: str
    demo_mode: bool = True

class ExtractedRider(BaseModel):
    name: str
    status: str # confirmed, undecided, declined
    is_captain: bool = False
    bike_model: Optional[str] = None
    tank_litres: Optional[float] = None
    mileage_kmpl: Optional[float] = None
    tank_range_km: Optional[float] = None
    upi_id: Optional[str] = None
    notes: Optional[str] = None

class ChatParseResult(BaseModel):
    title: str
    start_location: str
    destination: str
    ride_date: Optional[str]
    start_time: Optional[str]
    food_preferences: List[str] = []
    budget_estimate: Optional[float] = None
    pace: Optional[str] = None
    riders: List[ExtractedRider] = []
    confidence_notes: List[str] = []
    raw_message_count: int = 0
