"""
Dashboard Router — Morning briefing, priority list
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database import get_db
from models import Client, Analysis, User
from auth.dependencies import get_current_user

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/briefing")
async def morning_briefing(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Morning briefing — this firm's clients ranked by priority.
    Urgent (red) first, then Review (yellow), then On-Track (green).
    """
    # Admin sees ALL clients across all firms; regular user sees only their own
    query = select(Client).order_by(Client.updated_at.desc())
    if not current_user.is_admin:
        query = query.where(Client.user_id == current_user.id)
    clients_result = await db.execute(query)
    clients = clients_result.scalars().all()

    briefing = []
    priority_order = {"urgent": 0, "review": 1, "on-track": 2}

    for client in clients:
        # Fetch latest completed analysis
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

    # Sort by priority
    briefing.sort(key=lambda x: priority_order.get(x["priority_level"], 99))

    return {
        "total_clients": len(briefing),
        "urgent_count": sum(1 for c in briefing if c["priority_level"] == "urgent"),
        "review_count": sum(1 for c in briefing if c["priority_level"] == "review"),
        "on_track_count": sum(1 for c in briefing if c["priority_level"] == "on-track"),
        "clients": briefing,
    }


@router.get("/priority-list")
async def priority_list(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Priority-ranked client list (lightweight)"""
    pq = select(Client.id, Client.name, Client.entity_type, Client.priority_level, Client.one_line_summary)
    if not current_user.is_admin:
        pq = pq.where(Client.user_id == current_user.id)
    result = await db.execute(pq)
    clients = result.all()

    priority_order = {"urgent": 0, "review": 1, "on-track": 2}
    sorted_clients = sorted(
        [{"id": c.id, "name": c.name, "entity_type": c.entity_type,
          "priority_level": c.priority_level, "summary": c.one_line_summary}
         for c in clients],
        key=lambda x: priority_order.get(x["priority_level"], 99),
    )

    return sorted_clients
