import os
from pathlib import Path
from pydantic import BaseModel
from dotenv import load_dotenv

# Load .env file from project root or backend
ROOT_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(ROOT_DIR / ".env")

class Settings(BaseModel):
    PROJECT_NAME: str = "Ride Captain's Copilot"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    
    # LLM Settings
    LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "mock")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
    
    # External Services
    ORS_API_KEY: str = os.getenv("ORS_API_KEY", "")
    ELEVENLABS_API_KEY: str = os.getenv("ELEVENLABS_API_KEY", "")
    ELEVENLABS_VOICE_ID: str = os.getenv("ELEVENLABS_VOICE_ID", "21m00Tcm4TlvDq8ikWAM")
    GOOGLE_CALENDAR_CREDENTIALS: str = os.getenv("GOOGLE_CALENDAR_CREDENTIALS", "")
    
    # Environment & Database
    DEMO_MODE: bool = os.getenv("DEMO_MODE", "true").lower() in ("true", "1", "yes")
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{ROOT_DIR / 'ride_copilot.db'}")
    SAMPLE_DATA_DIR: Path = ROOT_DIR / "sample_data"

settings = Settings()
