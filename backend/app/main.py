"""
FastAPI application bootstrap.

Design decisions:
  - A single app instance is created here and imported by uvicorn.
  - Routers are registered in one place to give a clear endpoint inventory.
  - Logging is configured at startup so every module inherits the same format.
  - The /health endpoint is intentionally unauthenticated – monitoring agents
    must be able to probe it without credentials.

WHY separate main.py from router registration: keeps bootstrap concerns
(lifespan, middleware, logging) isolated from domain concerns (routes).
"""

from __future__ import annotations

import logging
import sys

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.auth.router import router as auth_router
from app.core.config import settings
from app.tenants.router import router as tenants_router

# ------------------------------------------------------------------
# Logging configuration
# WHY JSON-like format: cloud-native log aggregators parse structured
# logs automatically.  The format below is minimal but consistent.
# ------------------------------------------------------------------
logging.basicConfig(
    stream=sys.stdout,
    level=logging.DEBUG if settings.app_env == "development" else logging.INFO,
    format='{"time":"%(asctime)s","level":"%(levelname)s","logger":"%(name)s","message":%(message)s}',
)

logger = logging.getLogger(__name__)

# ------------------------------------------------------------------
# Application factory
# ------------------------------------------------------------------
app = FastAPI(
    title="Compliance Operations SaaS – API",
    description=(
        "Multitenant compliance platform (GDPR, ISO 27001, NIS2, 231). "
        "Every request is tenant-isolated and auditable."
    ),
    version="0.1.0",
    # Disable /docs and /redoc in production to reduce attack surface.
    # WHY conditional: developers need interactive docs; production does not.
    docs_url="/docs" if settings.app_env != "production" else None,
    redoc_url="/redoc" if settings.app_env != "production" else None,
)

# ------------------------------------------------------------------
# CORS – intentionally restrictive by default
# WHY: The frontend origin must be explicitly declared; wildcard origins
# are never acceptable in a compliance-grade application.
# ------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    # Configured via CORS_ORIGINS env var (comma-separated list).
    # WHY empty default: wildcard origins are never acceptable in a
    # compliance-grade application.
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH"],
    allow_headers=["Authorization", "Content-Type"],
)

# ------------------------------------------------------------------
# Router registration
# ------------------------------------------------------------------
app.include_router(auth_router)
app.include_router(tenants_router)

logger.info('"Application startup complete"')


# ------------------------------------------------------------------
# Health check endpoint
# WHY unauthenticated: monitoring probes (load balancers, Kubernetes
# liveness/readiness) must work without a token.
# ------------------------------------------------------------------
@app.get("/health", tags=["infra"], summary="Application health check")
def health() -> dict:
    """Return 200 OK with basic status information."""
    return {"status": "ok", "env": settings.app_env}
