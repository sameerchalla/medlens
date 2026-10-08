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

# CORS middleware for frontend communication (local dev + production)
# Production origin added via VERCEL_URL env; fallback allows common origins
_prod_origin = os.getenv("VERCEL_URL") or os.getenv("FRONTEND_URL") or ""
_cors_origins = [
    "http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"
]
if _prod_origin:
    _cors_origins.append(_prod_origin if _prod_origin.startswith("http") else f"https://{_prod_origin}")
# Also allow common vercel.app domain patterns for demo
_cors_origins.append("*.vercel.app")

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
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
