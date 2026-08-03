from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.health import router as health_router
from app.api.routes.groceries import router as groceries_router
from app.api.routes.meal_plans import router as meal_plans_router
from app.api.routes.recommendations import router as recommendations_router
from app.api.routes.recipes import router as recipes_router
from app.core.config import get_settings

settings = get_settings()
app = FastAPI(title=settings.app_name, version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.backend_cors_origins.split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(health_router, prefix="/api")
app.include_router(groceries_router, prefix="/api")
app.include_router(meal_plans_router, prefix="/api")
app.include_router(recommendations_router, prefix="/api")
app.include_router(recipes_router, prefix="/api")
