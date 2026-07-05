import logging
import sys
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.websocket_manager import manager

# ─── Routers ────────────────────────────────────────────────────────────────
from app.api import (
    auth, machines, sensors, predictions,
    maintenance, inventory, reports, chat,
)

# ─── Logging setup ──────────────────────────────────────────────────────────
logging.basicConfig(
    stream=sys.stdout,
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)
logger = logging.getLogger("predictive_maintenance")


# ─── Lifespan ────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Predictive Maintenance API (env=%s)", settings.ENVIRONMENT)

    # DB seed
    from app.core.db import SessionLocal
    from app.db.init_db import seed_db
    from app.services.simulator import simulator

    db = SessionLocal()
    try:
        seed_db(db)
    except Exception as exc:
        logger.error("Error seeding database on startup: %s", exc)
    finally:
        db.close()

    await simulator.start()
    logger.info("Telemetry simulator started.")

    yield

    logger.info("Shutting down …")
    await simulator.stop()


# ─── App ─────────────────────────────────────────────────────────────────────
app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    lifespan=lifespan,
    # Hide docs in production unless explicitly enabled
    docs_url="/docs" if not settings.ENVIRONMENT == "production" or settings.DEBUG else None,
    redoc_url="/redoc" if not settings.ENVIRONMENT == "production" or settings.DEBUG else None,
    openapi_url="/openapi.json",
)

# ─── CORS ────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Routers ─────────────────────────────────────────────────────────────────
PREFIX = settings.API_V1_STR
app.include_router(auth.router,        prefix=f"{PREFIX}/auth",        tags=["Authentication"])
app.include_router(machines.router,    prefix=f"{PREFIX}/machines",    tags=["Machine Management"])
app.include_router(sensors.router,     prefix=f"{PREFIX}/sensors",     tags=["Sensor Streams"])
app.include_router(predictions.router, prefix=f"{PREFIX}/predictions", tags=["AI Predictive Agent"])
app.include_router(maintenance.router, prefix=f"{PREFIX}/maintenance", tags=["Maintenance Scheduler"])
app.include_router(inventory.router,   prefix=f"{PREFIX}/inventory",   tags=["Spare Parts Inventory"])
app.include_router(reports.router,     prefix=f"{PREFIX}/reports",     tags=["Reports & Analytics"])
app.include_router(chat.router,        prefix=f"{PREFIX}/chat",        tags=["AI Chat Assistant"])


# ─── Health check ────────────────────────────────────────────────────────────
@app.get("/health", tags=["Health"], summary="Service health check")
def health_check():
    """Used by Railway, Docker, and monitoring systems."""
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "environment": settings.ENVIRONMENT,
        "version": "1.0.0",
    }


@app.get("/", tags=["Root"])
def root():
    return {
        "status": "active",
        "service": settings.PROJECT_NAME,
        "docs": "/docs",
        "health": "/health",
    }


# ─── WebSocket ───────────────────────────────────────────────────────────────
@app.websocket(f"{PREFIX}/ws")
async def websocket_endpoint(websocket: WebSocket):
    """Real-time machine telemetry broadcast over WebSocket."""
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            await websocket.send_json({
                "type": "heartbeat",
                "message": f"Echo: {data}",
            })
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as exc:
        logger.warning("WebSocket error: %s", exc)
        manager.disconnect(websocket)


# ─── Global exception handler ────────────────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error("Unhandled exception: %s", exc, exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error. Please try again later."},
    )


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL,
    )
