"""
app/main.py — FastAPI application entry point.

Base URL: /api/v1  (per api-contract.md)
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import Base, engine
from app.routers import checkins, patients, trends


# ---------------------------------------------------------------------------
# Lifespan: create tables on startup (development only)
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    On startup: create all tables if they don't exist.
    In production, prefer running Alembic migrations instead.
    """
    if settings.ENV == "development":
        Base.metadata.create_all(bind=engine)
    yield
    # Shutdown: nothing to clean up for now


# ---------------------------------------------------------------------------
# Application
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Fracture Recovery Dashboard API",
    description=(
        "Backend for the physio/patient rehab tracking dashboard. "
        "Tracks exercise form quality and functional recovery trend (ROM, adherence). "
        "NOT a bone-healing diagnostic — see api-contract.md for field naming rules."
    ),
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers — all mounted under /api/v1 per contract
# ---------------------------------------------------------------------------

API_PREFIX = "/api/v1"

app.include_router(patients.router, prefix=API_PREFIX)
app.include_router(checkins.router, prefix=API_PREFIX)
app.include_router(trends.router, prefix=API_PREFIX)


# ---------------------------------------------------------------------------
# Health check (outside versioned prefix for load-balancer / Render)
# ---------------------------------------------------------------------------

@app.get("/health", tags=["meta"])
def health():
    return {"status": "ok"}
