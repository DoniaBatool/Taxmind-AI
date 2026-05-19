"""
Clients Router — CRUD operations for client management
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional

from database import get_db
from models import Client

router = APIRouter(prefix="/api/clients", tags=["clients"])


# ── Pydantic Schemas ──────────────────────────────────────────────────────────

class ClientCreate(BaseModel):
    name: str
    entity_type: str  # S-Corp | LLC | Sole-Prop | Partnership
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
async def create_client(payload: ClientCreate, db: AsyncSession = Depends(get_db)):
    """Naya client create karo"""
    client = Client(**payload.model_dump())
    db.add(client)
    await db.flush()
    await db.refresh(client)
    return client


@router.get("/", response_model=list[ClientResponse])
async def list_clients(db: AsyncSession = Depends(get_db)):
    """Saare clients ki list"""
    result = await db.execute(select(Client).order_by(Client.created_at.desc()))
    return result.scalars().all()


@router.get("/{client_id}", response_model=ClientResponse)
async def get_client(client_id: str, db: AsyncSession = Depends(get_db)):
    """Single client detail"""
    result = await db.execute(select(Client).where(Client.id == client_id))
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Client nahi mila")
    return client


@router.delete("/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_client(client_id: str, db: AsyncSession = Depends(get_db)):
    """Client delete karo"""
    result = await db.execute(select(Client).where(Client.id == client_id))
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Client nahi mila")
    await db.delete(client)
