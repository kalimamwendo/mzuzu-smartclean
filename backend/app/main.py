from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.router import api_router
from app.core.config import settings
from app.db.session import Base, SessionLocal, engine
from app import models  # noqa: F401

app = FastAPI(title=settings.app_name, version="0.1.0", description="Waste reporting API for Mzuzu City.")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(api_router)


@app.get("/", tags=["root"])
def root():
    return {
        "app": settings.app_name,
        "status": "online",
        "documentation": "/docs",
        "health": "/api/v1/health",
        "ready": "/api/v1/health/ready",
    }


UPLOAD_DIR = Path(__file__).resolve().parents[1] / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


@app.on_event("startup")
def initialize_local_database():
    if SessionLocal is None or engine is None:
        return
    Base.metadata.create_all(bind=engine)
    from scripts.seed_categories import seed_categories

    seed_categories()
    if settings.seed_default_accounts:
        from scripts.seed_demo_accounts import seed_default_accounts

        seed_default_accounts()
