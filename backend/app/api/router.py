from fastapi import APIRouter

from app.api.routes import admin_reports, admin_users, auth, categories, health, reports

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(categories.router)
api_router.include_router(reports.router)
api_router.include_router(admin_reports.router)
api_router.include_router(admin_users.router)
