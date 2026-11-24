import json
import httpx
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from backend.app.config import settings
from backend.mcp_servers.chat_parser_server import parse_whatsapp_text_rule_based

class BaseLLMProvider(ABC):
    @abstractmethod
    def parse_chat(self, chat_text: str) -> Dict[str, Any]:
        pass

    @abstractmethod
    def answer_query(self, query: str, context: Dict[str, Any]) -> str:
        pass

class MockProvider(BaseLLMProvider):
    """Deterministic, zero-key offline provider that runs smoothly on any machine."""
    
    def parse_chat(self, chat_text: str) -> Dict[str, Any]:
        return parse_whatsapp_text_rule_based(chat_text)

    def answer_query(self, query: str, context: Dict[str, Any]) -> str:
        q = query.lower()
        ride_title = context.get("title", "Bangalore to Sakleshpur Ride")
        smallest_range = context.get("smallest_tank_range_km", 301.4)
        smallest_bike = context.get("smallest_tank_bike", "Royal Enfield Interceptor 650 (Rahul)")
        verdict = context.get("weather_verdict", "GO")
        next_fuel_km = context.get("next_fuel_km", 182.4)
        next_fuel_name = context.get("next_fuel_name", "Indian Oil Mega COCO Hassan Bypass")
        
        if "next fuel" in q or "how far is" in q or "fuel stop" in q:
            return f"The next planned fuel stop is at {next_fuel_name}, at the {next_fuel_km} km mark (approx 1 hour 45 minutes ahead)."
        elif "rain" in q or "weather" in q:
            if verdict == "GO":
                return "Forecast is GO! Precipitation probability is under 15% across all highway checkpoints. Road conditions are dry and clear."
            else:
                return f"Weather status is {verdict}. Keep rain gear handy and watch for crosswinds."
        elif "tank" in q or "range" in q or "bike" in q:
            return f"The group's lowest tank range is {smallest_range:.1f} km on the {smallest_bike}. Safe refuel threshold is capped at {smallest_range * 0.8:.1f} km."
        elif "confirm" in q or "approve" in q:
            return "Pending action confirmed and authorized by Ride Captain."
        elif "cancel" in q or "reject" in q:
            return "Pending action cancelled and rejected by Ride Captain."
        else:
            return f"Captain Copilot reporting for {ride_title}. Group formation is staggered, cruising speed 80-90 km/h, next stop Swathi Delicacy for breakfast."

class GeminiProvider(BaseLLMProvider):
    def __init__(self, api_key: str):
        self.api_key = api_key

    def parse_chat(self, chat_text: str) -> Dict[str, Any]:
        # Fallback to rule-based parser if API key is invalid or request fails
        if not self.api_key:
            return parse_whatsapp_text_rule_based(chat_text)
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={self.api_key}"
            prompt = (
                "You are an expert motorcycle ride captain assistant. Parse this WhatsApp group chat and return JSON with:\n"
                "title, start_location, destination, ride_date (YYYY-MM-DD), start_time, food_preferences (list), "
                "budget_estimate (float), pace, riders (list of objects with name, status [confirmed/undecided/declined], "
                "is_captain [bool], bike_model, tank_litres, mileage_kmpl, tank_range_km, upi_id), confidence_notes (list).\n\n"
                f"Chat text:\n{chat_text}"
            )
            payload = {
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {"response_mime_type": "application/json"}
            }
            with httpx.Client(timeout=10.0) as client:
                res = client.post(url, json=payload)
                if res.status_code == 200:
                    resp_json = res.json()
                    raw_text = resp_json["candidates"][0]["content"]["parts"][0]["text"]
                    return json.loads(raw_text)
        except Exception:
            pass
        return parse_whatsapp_text_rule_based(chat_text)

    def answer_query(self, query: str, context: Dict[str, Any]) -> str:
        mock = MockProvider()
        return mock.answer_query(query, context)

def get_llm_provider() -> BaseLLMProvider:
    provider = settings.LLM_PROVIDER.lower()
    if provider == "gemini" and settings.GEMINI_API_KEY:
        return GeminiProvider(settings.GEMINI_API_KEY)
    return MockProvider()
