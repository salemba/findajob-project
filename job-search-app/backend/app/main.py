from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware

from app.config import get_settings
from app.database import engine, Base
from app.routers import job_offers, applications, documents, claude_ai, alerts

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create tables if they don't exist (dev only; use Alembic in production)
    if settings.environment == "development":
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    yield
    # Shutdown
    await engine.dispose()


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="API de gestion de recherche d'emploi pour architecte IT senior",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(job_offers.router, prefix="/api/v1/job-offers", tags=["Job Offers"])
app.include_router(applications.router, prefix="/api/v1/applications", tags=["Applications"])
app.include_router(documents.router, prefix="/api/v1/documents", tags=["Documents"])
app.include_router(claude_ai.router, prefix="/api/v1/ai", tags=["AI"])
app.include_router(alerts.router, prefix="/api/v1/alerts", tags=["Alerts"])


@app.get("/api/health", tags=["Health"])
async def health_check():
    return {
        "status": "ok",
        "version": settings.app_version,
        "environment": settings.environment,
    }
