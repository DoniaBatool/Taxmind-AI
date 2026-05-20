"""
Analysis Router — AI analysis trigger, results, report download, live progress WebSocket
"""

import asyncio
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi import WebSocket, WebSocketDisconnect
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete as sa_delete
from datetime import datetime

from database import get_db, AsyncSessionLocal
from models import Client, TaxReturn, Financials, Analysis, Report
from agents.orchestrator import run_full_analysis
from agents.progress import subscribe, unsubscribe
from utils.pdf_report import generate_pdf_report

router = APIRouter(prefix="/api/clients", tags=["analysis"])


# ── Trigger Analysis ──────────────────────────────────────────────────────────

@router.post("/{client_id}/analyze")
async def trigger_analysis(
    client_id: str,
    analysis_year: int,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """Trigger full AI analysis — runs in background"""
    result = await db.execute(select(Client).where(Client.id == client_id))
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

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

    background_tasks.add_task(run_full_analysis, client_id, analysis.id, analysis_year)

    return {
        "analysis_id": analysis.id,
        "status": "running",
        "message": "AI analysis started — results will be ready shortly",
    }


# ── Live Progress WebSocket ───────────────────────────────────────────────────

@router.websocket("/{client_id}/analyze/{analysis_id}/progress")
async def analysis_progress_ws(
    websocket: WebSocket,
    client_id: str,
    analysis_id: str,
):
    """
    WebSocket that streams real-time agent progress updates.
    Frontend connects immediately after triggering analysis.
    Each message: { agent, label, icon, status, message, timestamp }
    """
    await websocket.accept()
    q = subscribe(analysis_id)
    try:
        while True:
            try:
                step = await asyncio.wait_for(q.get(), timeout=120)
                await websocket.send_json(step)
                # Close after orchestrator signals done or error
                if step.get("agent") == "orchestrator" and step.get("status") in ("done", "error"):
                    break
            except asyncio.TimeoutError:
                # Send keepalive ping
                await websocket.send_json({"type": "ping"})
    except WebSocketDisconnect:
        pass
    finally:
        unsubscribe(analysis_id, q)


# ── Get Analysis Results ──────────────────────────────────────────────────────

@router.get("/{client_id}/analysis")
async def get_analysis(client_id: str, db: AsyncSession = Depends(get_db)):
    """Fetch latest analysis result"""
    result = await db.execute(
        select(Analysis)
        .where(Analysis.client_id == client_id)
        .order_by(Analysis.created_at.desc())
    )
    analysis = result.scalar_one_or_none()
    if not analysis:
        raise HTTPException(status_code=404, detail="No analysis found yet")

    return {
        "id": analysis.id,
        "analysis_year": analysis.analysis_year,
        "status": analysis.status,
        "priority_level": analysis.priority_level,
        "one_line_summary": analysis.one_line_summary,
        "comparison_data": analysis.comparison_data,
        "red_flags": analysis.red_flags,
        "tax_opportunities": analysis.tax_opportunities,
        "smart_questions": analysis.smart_questions,
        "document_refs": analysis.document_refs,
        "created_at": analysis.created_at,
        "completed_at": analysis.completed_at,
    }


@router.get("/{client_id}/red-flags")
async def get_red_flags(client_id: str, db: AsyncSession = Depends(get_db)):
    """Fetch red flags from latest completed analysis"""
    result = await db.execute(
        select(Analysis)
        .where(Analysis.client_id == client_id, Analysis.status == "done")
        .order_by(Analysis.created_at.desc())
    )
    analysis = result.scalar_one_or_none()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")

    return {"red_flags": analysis.red_flags or []}


@router.get("/{client_id}/tax-plan")
async def get_tax_plan(client_id: str, db: AsyncSession = Depends(get_db)):
    """Fetch tax planning recommendations"""
    result = await db.execute(
        select(Analysis)
        .where(Analysis.client_id == client_id, Analysis.status == "done")
        .order_by(Analysis.created_at.desc())
    )
    analysis = result.scalar_one_or_none()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")

    return {"tax_opportunities": analysis.tax_opportunities or []}


# ── Report Download ───────────────────────────────────────────────────────────

@router.get("/{client_id}/report")
async def get_report(client_id: str, db: AsyncSession = Depends(get_db)):
    """Fetch latest report content (markdown)"""
    result = await db.execute(
        select(Report)
        .where(Report.client_id == client_id)
        .order_by(Report.generated_at.desc())
    )
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="No report found — run analysis first")

    return {
        "content_markdown": report.content_markdown,
        "generated_at": report.generated_at,
    }


@router.get("/{client_id}/report/download")
async def download_report(client_id: str, db: AsyncSession = Depends(get_db)):
    """Download latest report as a professionally styled PDF"""
    # Fetch client
    client_result = await db.execute(select(Client).where(Client.id == client_id))
    client = client_result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    # Fetch latest completed analysis
    analysis_result = await db.execute(
        select(Analysis)
        .where(Analysis.client_id == client_id, Analysis.status == "done")
        .order_by(Analysis.completed_at.desc())
    )
    analysis = analysis_result.scalar_one_or_none()
    if not analysis:
        raise HTTPException(status_code=404, detail="No completed analysis found — run AI analysis first")

    # Generate PDF from live analysis data
    pdf_bytes = generate_pdf_report(
        client_name=client.name,
        entity_type=client.entity_type,
        analysis_year=analysis.analysis_year,
        priority_level=analysis.priority_level or "on-track",
        one_line_summary=analysis.one_line_summary or "",
        comparison_data=analysis.comparison_data or {},
        red_flags=analysis.red_flags or [],
        tax_opportunities=analysis.tax_opportunities or [],
        smart_questions=analysis.smart_questions or [],
    )

    safe_name = client.name.replace(" ", "_").replace("/", "-")
    filename = f"TaxMind_Report_{safe_name}_{analysis.analysis_year}.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ── List All Analyses ─────────────────────────────────────────────────────────

@router.get("/{client_id}/analyses")
async def list_analyses(client_id: str, db: AsyncSession = Depends(get_db)):
    """List all analyses for a client, newest first"""
    result = await db.execute(
        select(Analysis)
        .where(Analysis.client_id == client_id)
        .order_by(Analysis.created_at.desc())
    )
    analyses = result.scalars().all()

    return [
        {
            "id": a.id,
            "analysis_year": a.analysis_year,
            "status": a.status,
            "priority_level": a.priority_level,
            "one_line_summary": a.one_line_summary,
            "document_refs": a.document_refs,
            "created_at": a.created_at,
            "completed_at": a.completed_at,
        }
        for a in analyses
    ]


# ── Delete Analysis ───────────────────────────────────────────────────────────

@router.delete("/{client_id}/analyses/{analysis_id}")
async def delete_analysis(
    client_id: str, analysis_id: str, db: AsyncSession = Depends(get_db)
):
    """Delete a specific analysis record (and its linked report)"""
    result = await db.execute(
        select(Analysis).where(
            Analysis.id == analysis_id, Analysis.client_id == client_id
        )
    )
    analysis = result.scalar_one_or_none()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")

    await db.delete(analysis)
    await db.commit()
    return {"message": "Analysis deleted successfully"}
