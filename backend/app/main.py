from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.config import settings
from backend.app.db import engine, Base
from backend.app.api.endpoints import router as api_router

# Initialize SQLite database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Ride Captain's Copilot: An MCP-powered agent turning group chats into approved motorcycle ride plans."
)

# CORS configuration for Vite React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_PREFIX)

@app.get("/")
def root():
    return {
        "app": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "demo_mode": settings.DEMO_MODE,
        "docs": "/docs",
        "api_prefix": settings.API_PREFIX
    }

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "llm_provider": settings.LLM_PROVIDER,
        "demo_mode": settings.DEMO_MODE,
        "mcp_servers": [
            "chat_parser",
            "ride_plan",
            "stop_finder",
            "weather",
            "calendar",
            "bill_split"
        ]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
