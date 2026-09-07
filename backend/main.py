"""
main.py — FastAPI application entry point.
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.exercises import router as exercises_router
from app.api.seed import router as seed_router
from app.api.stats import router as stats_router
from app.api.workouts import router as workouts_router
from app.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: startup → yield → shutdown."""
    print(f"🚀 Workout Partner API starting [{settings.APP_ENV}]")
    yield
    print("👋 Shutting down")


app = FastAPI(
    title="Workout Partner API",
    description="Backend API for the Workout Partner AI fitness tracker.",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
API_PREFIX = "/api"

app.include_router(exercises_router, prefix=API_PREFIX)
app.include_router(workouts_router,  prefix=API_PREFIX)
app.include_router(stats_router,     prefix=API_PREFIX)

# Dev-only seed endpoint
if settings.APP_ENV == "development":
    app.include_router(seed_router, prefix=API_PREFIX)


# ── Health check ──────────────────────────────────────────────────────────────
@app.get("/health", tags=["health"], summary="Health check")
async def health():
    return {"status": "ok", "env": settings.APP_ENV}
