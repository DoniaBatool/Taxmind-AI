"""
Analysis Router — AI analysis trigger + results fetch
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime

from database import get_db
from models import Client, TaxReturn, Financials, Analysis
from agents.orchestrator import run_full_analysis

router = APIRouter(prefix="/api/clients", tags=["analysis"])


@router.post("/{client_id}/analyze")
async def trigger_analysis(
    client_id: str,
    analysis_year: int,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """Full AI analysis trigger karo — background mein chalega"""
    # Client check
    result = await db.execute(select(Client).where(Client.id == client_id))
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Client nahi mila")

    # Existing analysis check
    existing = await db.execute(
        select(Analysis).where(
            Analysis.client_id == client_id,
            Analysis.analysis_year == analysis_year,
        )
    )
    analysis = existing.scalar_one_or_none()

    if not analysis:
        analysis = Analysis(
            client_id=client_id,
            analysis_year=analysis_year,
            status="running",
        )
        db.add(analysis)
        await db.flush()
        await db.refresh(analysis)
    else:
        analysis.status = "running"
        await db.flush()

    # Background task mein AI agents chalao
    background_tasks.add_task(run_full_analysis, client_id, analysis.id, analysis_year)

    return {
        "analysis_id": analysis.id,
        "status": "running",
        "message": "AI analysis shuru ho gayi — thoda waqt lagega",
    }


@router.get("/{client_id}/analysis")
async def get_analysis(client_id: str, db: AsyncSession = Depends(get_db)):
    """Latest analysis result fetch karo"""
    result = await db.execute(
        select(Analysis)
        .where(Analysis.client_id == client_id)
        .order_by(Analysis.created_at.desc())
    )
    analysis = result.scalar_one_or_none()
    if not analysis:
        raise HTTPException(status_code=404, detail="Koi analysis nahi mili abhi tak")

    return {
        "id": analysis.id,
        "status": analysis.status,
        "priority_level": analysis.priority_level,
        "one_line_summary": analysis.one_line_summary,
        "comparison_data": analysis.comparison_data,
        "red_flags": analysis.red_flags,
        "tax_opportunities": analysis.tax_opportunities,
        "smart_questions": analysis.smart_questions,
        "created_at": analysis.created_at,
        "completed_at": analysis.completed_at,
    }


@router.get("/{client_id}/red-flags")
async def get_red_flags(client_id: str, db: AsyncSession = Depends(get_db)):
    """Sirf red flags fetch karo"""
    result = await db.execute(
        select(Analysis)
        .where(Analysis.client_id == client_id, Analysis.status == "done")
        .order_by(Analysis.created_at.desc())
    )
    analysis = result.scalar_one_or_none()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis nahi mili")

    return {"red_flags": analysis.red_flags or []}


@router.get("/{client_id}/tax-plan")
async def get_tax_plan(client_id: str, db: AsyncSession = Depends(get_db)):
    """Tax planning recommendations fetch karo"""
    result = await db.execute(
        select(Analysis)
        .where(Analysis.client_id == client_id, Analysis.status == "done")
        .order_by(Analysis.created_at.desc())
    )
    analysis = result.scalar_one_or_none()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis nahi mili")

    return {"tax_opportunities": analysis.tax_opportunities or []}
