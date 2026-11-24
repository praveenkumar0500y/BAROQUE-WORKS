import httpx
from typing import Optional, Dict, Any
from backend.app.config import settings

VOICE_SCRIPTS = {
    "en": {
        "greeting": "Attention riders, this is your Ride Captain Copilot briefing.",
        "fuel_alert": "Alert: We are approaching the pre-ghat fuel stop at Hassan Bypass. Full tank mandatory.",
        "weather_alert": "Weather check: Skies are clear, crosswinds below fifteen kilometers per hour. Ride safe!"
    },
    "hi": {
        "greeting": "Dhyan dein sabhi riders, yeh aapka Ride Captain Copilot briefing hai.",
        "fuel_alert": "Savdhaan: Hassan bypass fuel stop nazdeek hai. Ghat section se pehle full tank zaroori hai.",
        "weather_alert": "Mausam report: Raste par aasmaan saaf hai aur baarish ka khatra nahi hai. Savdhani se ride karein!"
    },
    "kn": {
        "greeting": "Ellaru riders kshamisi, idhu nimma Ride Captain Copilot briefing.",
        "fuel_alert": "Hassan bypass petrol bunk hatthiravidhe. Ghat rastege hoguva munche full tank thumbisi.",
        "weather_alert": "Havamaana hegidhe andre raste tumbaa safe aagidhe, male illa. Safe aagi ride maadi!"
    }
}

def synthesize_speech_elevenlabs(text: str, language: str = "en") -> Optional[bytes]:
    """Call ElevenLabs API if key is available."""
    if not settings.ELEVENLABS_API_KEY:
        return None
        
    try:
        url = f"https://api.elevenlabs.io/v1/text-to-speech/{settings.ELEVENLABS_VOICE_ID}"
        headers = {
            "Accept": "audio/mpeg",
            "Content-Type": "application/json",
            "xi-api-key": settings.ELEVENLABS_API_KEY
        }
        payload = {
            "text": text,
            "model_id": "eleven_multilingual_v2",
            "voice_settings": {
                "stability": 0.5,
                "similarity_boost": 0.75
            }
        }
        with httpx.Client(timeout=10.0) as client:
            resp = client.post(url, json=payload, headers=headers)
            if resp.status_code == 200:
                return resp.content
    except Exception:
        pass
    return None

def get_briefing_text(language: str, ride_title: str, distance: float, pace: str) -> str:
    lang = language.lower()
    if lang == "hi":
        return (
            f"Suniye riders! {ride_title} ka plan ready hai. "
            f"Total distance {distance} kilometer hai aur cruising pace {pace} rahega. "
            f"Sabhi safety gear pehnein aur formation maintain karein."
        )
    elif lang == "kn":
        return (
            f"Namaskara riders! {ride_title} yojana tayaragidhe. "
            f"Ottaare doora {distance} kilometer mathu vegavu {pace}. "
            f"Dayavittu helmet mathu safety gear dharisi."
        )
    else:
        return (
            f"Attention riders! The ride plan for {ride_title} is ready and approved. "
            f"Total distance is {distance} kilometers at a steady pace of {pace}. "
            f"Full protective gear is mandatory. Ride in staggered formation."
        )
