"""
Admin Router — firm management, role assignment (admin-only)
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel

from database import get_db
from models import User, Client
from auth.dependencies import get_current_user

router = APIRouter(prefix="/api/admin", tags=["admin"])


# ── Admin guard dependency ────────────────────────────────────────────────────

async def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user


# ── Schemas ───────────────────────────────────────────────────────────────────

class SetAdminRequest(BaseModel):
    is_admin: bool


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/firms")
async def list_all_firms(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """List all registered firms with client counts"""
    users_result = await db.execute(select(User).order_by(User.created_at.desc()))
    users = users_result.scalars().all()

    firms = []
    for u in users:
        count_result = await db.execute(
            select(func.count()).select_from(Client).where(Client.user_id == u.id)
        )
        client_count = count_result.scalar() or 0
        firms.append({
            "id": u.id,
            "firm_name": u.firm_name,
            "email": u.email,
            "is_admin": u.is_admin,
            "client_count": client_count,
            "created_at": u.created_at.isoformat() if u.created_at else None,
        })

    return firms


@router.patch("/firms/{user_id}/admin")
async def set_admin_role(
    user_id: str,
    payload: SetAdminRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Grant or revoke admin role for a firm"""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Firm not found")
    if user.id == admin.id and not payload.is_admin:
        raise HTTPException(status_code=400, detail="Cannot remove your own admin role")

    user.is_admin = payload.is_admin
    await db.flush()
    await db.refresh(user)
    return {"id": user.id, "firm_name": user.firm_name, "is_admin": user.is_admin}


@router.delete("/firms/{user_id}")
async def delete_firm(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Permanently delete a firm and all its clients/data"""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Firm not found")
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account from admin panel")

    await db.delete(user)
    await db.commit()
    return {"message": f"Firm '{user.firm_name}' deleted successfully"}


@router.get("/firms/{user_id}/clients")
async def get_firm_clients(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Get all clients belonging to a specific firm"""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Firm not found")

    clients_result = await db.execute(
        select(Client).where(Client.user_id == user_id).order_by(Client.created_at.desc())
    )
    clients = clients_result.scalars().all()
    return [
        {
            "id": c.id,
            "name": c.name,
            "entity_type": c.entity_type,
            "industry": c.industry,
            "priority_level": c.priority_level,
            "one_line_summary": c.one_line_summary,
            "email": c.email,
            "phone": c.phone,
        }
        for c in clients
    ]


@router.get("/stats")
async def platform_stats(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """High-level platform stats"""
    firm_count   = (await db.execute(select(func.count()).select_from(User))).scalar() or 0
    client_count = (await db.execute(select(func.count()).select_from(Client))).scalar() or 0
    return {"total_firms": firm_count, "total_clients": client_count}
