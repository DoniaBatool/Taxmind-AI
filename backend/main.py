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
from database import create_tables, AsyncSessionLocal
from routers import clients, documents, analysis, dashboard, chat, auth, admin

# Logging setup
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(name)s | %(levelname)s | %(message)s",
)
logger = logging.getLogger(__name__)


# ── Startup / Shutdown ────────────────────────────────────────────────────────

async def _run_migrations():
    """Add any new columns that don't exist yet (safe, idempotent)."""
    from sqlalchemy import text
    async with AsyncSessionLocal() as db:
        migrations = [
            ("analyses",  "document_refs JSON"),
            ("clients",   "user_id VARCHAR"),
            ("users",     "is_admin BOOLEAN DEFAULT false"),
        ]
        for table, col_def in migrations:
            col_name = col_def.split()[0]
            try:
                await db.execute(text(
                    f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {col_def}"
                ))
                await db.commit()
                logger.info(f"Migration: {table}.{col_name} ready ✓")
            except Exception as e:
                await db.rollback()
                logger.warning(f"Migration {table}.{col_name} skipped: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """App startup aur shutdown logic"""
    # Startup
    logger.info("TaxMind AI starting up...")
    os.makedirs(settings.upload_dir, exist_ok=True)
    await create_tables()
    await _run_migrations()
    logger.info("Database tables ready ✓")
    logger.info(f"OpenAI model: {settings.openai_model} ✓")
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

app.include_router(auth.router)
app.include_router(admin.router)
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
        "openai_model": settings.openai_model,
    }


@app.get("/health")
async def health():
    return {"status": "healthy", "env": settings.app_env}
