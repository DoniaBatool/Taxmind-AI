"""
Clients Router — CRUD operations (protected — firm-level isolation)
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional

from database import get_db
from models import Client, User
from auth.dependencies import get_current_user

router = APIRouter(prefix="/api/clients", tags=["clients"])


# ── Pydantic Schemas ──────────────────────────────────────────────────────────

class ClientCreate(BaseModel):
    name: str
    entity_type: str  # S-Corp | LLC | Sole-Prop | Partnership
    industry: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None


class ClientUpdate(BaseModel):
    name: Optional[str] = None
    entity_type: Optional[str] = None
    industry: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None


class ClientResponse(BaseModel):
    id: str
    name: str
    entity_type: str
    industry: Optional[str]
    email: Optional[str]
    phone: Optional[str]
    priority_level: str
    one_line_summary: Optional[str]

    class Config:
        from_attributes = True


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/", response_model=ClientResponse, status_code=status.HTTP_201_CREATED)
async def create_client(
    payload: ClientCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new client — linked to the logged-in firm"""
    client = Client(**payload.model_dump(), user_id=current_user.id)
    db.add(client)
    await db.flush()
    await db.refresh(client)
    return client


@router.get("/", response_model=list[ClientResponse])
async def list_clients(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List only this firm's clients"""
    result = await db.execute(
        select(Client)
        .where(Client.user_id == current_user.id)
        .order_by(Client.created_at.desc())
    )
    return result.scalars().all()


@router.get("/{client_id}", response_model=ClientResponse)
async def get_client(
    client_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single client — admin can access any, firm sees only own"""
    query = select(Client).where(Client.id == client_id)
    if not current_user.is_admin:
        query = query.where(Client.user_id == current_user.id)
    result = await db.execute(query)
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return client


@router.patch("/{client_id}", response_model=ClientResponse)
async def update_client(
    client_id: str,
    payload: ClientUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update client info — admin can update any, firm updates only own"""
    query = select(Client).where(Client.id == client_id)
    if not current_user.is_admin:
        query = query.where(Client.user_id == current_user.id)
    result = await db.execute(query)
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    updates = payload.model_dump(exclude_none=True)
    for field, value in updates.items():
        setattr(client, field, value)

    await db.flush()
    await db.refresh(client)
    return client


@router.delete("/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_client(
    client_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a client — admin can delete any, firm deletes only own"""
    query = select(Client).where(Client.id == client_id)
    if not current_user.is_admin:
        query = query.where(Client.user_id == current_user.id)
    result = await db.execute(query)
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    await db.delete(client)
    await db.commit()
