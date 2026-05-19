"""
Dashboard Router — Morning briefing, priority list
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database import get_db
from models import Client, Analysis

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/briefing")
async def morning_briefing(db: AsyncSession = Depends(get_db)):
    """
    Morning briefing — priority-ranked saare clients
    Red (urgent) pehle, phir Yellow (review), phir Green (on-track)
    """
    clients_result = await db.execute(select(Client).order_by(Client.updated_at.desc()))
    clients = clients_result.scalars().all()

    briefing = []
    priority_order = {"urgent": 0, "review": 1, "on-track": 2}

    for client in clients:
        # Latest analysis fetch karo
        analysis_result = await db.execute(
            select(Analysis)
            .where(Analysis.client_id == client.id, Analysis.status == "done")
            .order_by(Analysis.created_at.desc())
        )
        latest_analysis = analysis_result.scalar_one_or_none()

        red_flags_count = 0
        if latest_analysis and latest_analysis.red_flags:
            red_flags_count = len(latest_analysis.red_flags)

        briefing.append({
            "id": client.id,
            "name": client.name,
            "entity_type": client.entity_type,
            "industry": client.industry,
            "priority_level": client.priority_level,
            "one_line_summary": client.one_line_summary or "Analysis pending",
            "red_flags_count": red_flags_count,
            "has_analysis": latest_analysis is not None,
        })

    # Priority ke hisaab se sort karo
    briefing.sort(key=lambda x: priority_order.get(x["priority_level"], 99))

    return {
        "total_clients": len(briefing),
        "urgent_count": sum(1 for c in briefing if c["priority_level"] == "urgent"),
        "review_count": sum(1 for c in briefing if c["priority_level"] == "review"),
        "on_track_count": sum(1 for c in briefing if c["priority_level"] == "on-track"),
        "clients": briefing,
    }


@router.get("/priority-list")
async def priority_list(db: AsyncSession = Depends(get_db)):
    """Sirf priority-ranked client list (lightweight)"""
    result = await db.execute(
        select(Client.id, Client.name, Client.entity_type, Client.priority_level, Client.one_line_summary)
    )
    clients = result.all()

    priority_order = {"urgent": 0, "review": 1, "on-track": 2}
    sorted_clients = sorted(
        [{"id": c.id, "name": c.name, "entity_type": c.entity_type,
          "priority_level": c.priority_level, "summary": c.one_line_summary}
         for c in clients],
        key=lambda x: priority_order.get(x["priority_level"], 99),
    )

    return sorted_clients
