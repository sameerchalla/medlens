from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

from app.routes import patients, reports
from app.models import HealthResponse
from datetime import datetime

load_dotenv()

app = FastAPI(
    title="MedLens API",
    description="AI-Powered Clinical Information Dashboard - Backend API",
    version="1.0.0"
)

# CORS middleware for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(patients.router, prefix="/api/patients", tags=["patients"])
app.include_router(reports.router, prefix="/api/reports", tags=["reports"])


@app.get("/api/health", response_model=HealthResponse, tags=["health"])
async def health_check():
    """Health check endpoint."""
    return HealthResponse(status="healthy", timestamp=datetime.utcnow())


@app.get("/api/", tags=["root"])
async def root():
    """Root endpoint."""
    return {
        "name": "MedLens API",
        "version": "1.0.0",
        "docs": "/docs"
    }


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    uvicorn.run(app, host=host, port=port)
