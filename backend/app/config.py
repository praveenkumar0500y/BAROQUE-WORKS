import os
from pathlib import Path
from pydantic import BaseModel
from dotenv import load_dotenv, set_key

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
ENV_FILE = ROOT_DIR / ".env"
load_dotenv(ENV_FILE)

class Settings(BaseModel):
    PROJECT_NAME: str = "Ride Captain's Copilot"
    VERSION: str = "1.1.0"
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
    DEMO_MODE: bool = os.getenv("DEMO_MODE", "false").lower() in ("true", "1", "yes")
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{ROOT_DIR / 'ride_copilot.db'}")
    SAMPLE_DATA_DIR: Path = ROOT_DIR / "sample_data"

settings = Settings()

def update_env_key(key: str, value: str):
    """Dynamically update an API key in memory and in .env file."""
    if hasattr(settings, key):
        setattr(settings, key, value)
    os.environ[key] = value
    if ENV_FILE.exists():
        try:
            set_key(str(ENV_FILE), key, value)
        except Exception:
            pass
