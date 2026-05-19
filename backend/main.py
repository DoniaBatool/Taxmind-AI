"""
TaxMind AI — FastAPI Main Entry Point
Run karne ke liye: uvicorn main:app --reload
"""

import os
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from database import create_tables
from routers import clients, documents, analysis, dashboard, chat

# Logging setup
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(name)s | %(levelname)s | %(message)s",
)
logger = logging.getLogger(__name__)


# ── Startup / Shutdown ────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """App startup aur shutdown logic"""
    # Startup
    logger.info("TaxMind AI starting up...")
    os.makedirs(settings.upload_dir, exist_ok=True)
    await create_tables()
    logger.info("Database tables ready ✓")
    logger.info(f"Gemini model: {settings.gemini_model} ✓")
    logger.info("TaxMind AI is ready! 🧠⚡")

    yield  # App yahan run karta hai

    # Shutdown
    logger.info("TaxMind AI shutting down...")


# ── FastAPI App ───────────────────────────────────────────────────────────────

app = FastAPI(
    title="TaxMind AI",
    description="Enterprise Tax & Accounting Workflow Automation Platform",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS (React frontend allow karo)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routes Include karo ───────────────────────────────────────────────────────

app.include_router(clients.router)
app.include_router(documents.router)
app.include_router(analysis.router)
app.include_router(dashboard.router)
app.include_router(chat.router)


# ── Health Check ─────────────────────────────────────────────────────────────

@app.get("/")
async def root():
    return {
        "name": "TaxMind AI",
        "version": "1.0.0",
        "status": "running",
        "gemini_model": settings.gemini_model,
    }


@app.get("/health")
async def health():
    return {"status": "healthy", "env": settings.app_env}
