from typing import Dict, List, Optional
from backend.app.schemas import BikeSpec

INDIAN_BIKES_DATABASE: Dict[str, BikeSpec] = {
    "royal enfield himalayan 450": BikeSpec(
        model="Royal Enfield Himalayan 450",
        tank_litres=17.0,
        mileage_kmpl=28.0,
        tank_range_km=476.0
    ),
    "royal enfield hunter 350": BikeSpec(
        model="Royal Enfield Hunter 350",
        tank_litres=13.0,
        mileage_kmpl=32.0,
        tank_range_km=416.0
    ),
    "royal enfield classic 350": BikeSpec(
        model="Royal Enfield Classic 350",
        tank_litres=13.0,
        mileage_kmpl=35.0,
        tank_range_km=455.0
    ),
    "royal enfield interceptor 650": BikeSpec(
        model="Royal Enfield Interceptor 650",
        tank_litres=13.7,
        mileage_kmpl=22.0,
        tank_range_km=301.4
    ),
    "ktm 390 adventure": BikeSpec(
        model="KTM 390 Adventure",
        tank_litres=14.5,
        mileage_kmpl=25.0,
        tank_range_km=362.5
    ),
    "ktm duke 390": BikeSpec(
        model="KTM Duke 390",
        tank_litres=15.0,
        mileage_kmpl=24.0,
        tank_range_km=360.0
    ),
    "bajaj dominar 400": BikeSpec(
        model="Bajaj Dominar 400",
        tank_litres=13.0,
        mileage_kmpl=26.0,
        tank_range_km=338.0
    ),
    "triumph scrambler 400x": BikeSpec(
        model="Triumph Scrambler 400X",
        tank_litres=13.0,
        mileage_kmpl=28.0,
        tank_range_km=364.0
    ),
    "triumph speed 400": BikeSpec(
        model="Triumph Speed 400",
        tank_litres=13.0,
        mileage_kmpl=29.0,
        tank_range_km=377.0
    ),
    "yamaha r15 v4": BikeSpec(
        model="Yamaha R15 V4",
        tank_litres=11.0,
        mileage_kmpl=45.0,
        tank_range_km=495.0
    ),
    "yamaha mt 15": BikeSpec(
        model="Yamaha MT 15",
        tank_litres=10.0,
        mileage_kmpl=45.0,
        tank_range_km=450.0
    ),
    "hero xpulse 200 4v": BikeSpec(
        model="Hero XPulse 200 4V",
        tank_litres=13.0,
        mileage_kmpl=36.0,
        tank_range_km=468.0
    ),
    "hero splendor plus": BikeSpec(
        model="Hero Splendor Plus",
        tank_litres=9.8,
        mileage_kmpl=65.0,
        tank_range_km=637.0
    ),
    "bmw g310 gs": BikeSpec(
        model="BMW G310 GS",
        tank_litres=11.5,
        mileage_kmpl=28.0,
        tank_range_km=322.0
    ),
    "tvs apache rr 310": BikeSpec(
        model="TVS Apache RR 310",
        tank_litres=11.0,
        mileage_kmpl=30.0,
        tank_range_km=330.0
    ),
    "suzuki v-strom sx 250": BikeSpec(
        model="Suzuki V-Strom SX 250",
        tank_litres=12.0,
        mileage_kmpl=36.0,
        tank_range_km=432.0
    )
}

def lookup_bike(query: str) -> Optional[BikeSpec]:
    if not query:
        return None
    q = query.lower().strip()
    
    # Exact or alias match
    for key, spec in INDIAN_BIKES_DATABASE.items():
        if key in q or q in key:
            return spec
            
    # Fuzzy keyword heuristics
    if "himalayan" in q:
        return INDIAN_BIKES_DATABASE["royal enfield himalayan 450"]
    if "hunter" in q:
        return INDIAN_BIKES_DATABASE["royal enfield hunter 350"]
    if "interceptor" in q or "650" in q:
        return INDIAN_BIKES_DATABASE["royal enfield interceptor 650"]
    if "390 adv" in q or "ktm adv" in q or "390 adventure" in q:
        return INDIAN_BIKES_DATABASE["ktm 390 adventure"]
    if "dominar" in q:
        return INDIAN_BIKES_DATABASE["bajaj dominar 400"]
    if "scrambler" in q or "400x" in q:
        return INDIAN_BIKES_DATABASE["triumph scrambler 400x"]
    if "r15" in q:
        return INDIAN_BIKES_DATABASE["yamaha r15 v4"]
    if "xpulse" in q:
        return INDIAN_BIKES_DATABASE["hero xpulse 200 4v"]
    if "splendor" in q:
        return INDIAN_BIKES_DATABASE["hero splendor plus"]

    return None

def get_all_bikes() -> List[BikeSpec]:
    return list(INDIAN_BIKES_DATABASE.values())
