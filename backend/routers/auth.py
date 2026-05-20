"""
Auth Router — register, login, me
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
import bcrypt

from database import get_db
from models import User
from auth.jwt import create_access_token
from auth.dependencies import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


def _hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def _verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))


# ── Schemas ───────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    firm_name: str
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    firm_name: str
    email: str
    is_admin: bool = False


# ── Register ──────────────────────────────────────────────────────────────────

@router.post("/register", response_model=AuthResponse, status_code=201)
async def register(payload: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """Create a new firm account"""
    existing = await db.execute(select(User).where(User.email == payload.email.lower()))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists",
        )

    hashed = _hash_password(payload.password)
    user = User(
        firm_name=payload.firm_name.strip(),
        email=payload.email.lower().strip(),
        hashed_password=hashed,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)
    await db.commit()

    token = create_access_token(user.id, user.email, user.firm_name, user.is_admin)
    return AuthResponse(
        access_token=token,
        user_id=user.id,
        firm_name=user.firm_name,
        email=user.email,
        is_admin=user.is_admin,
    )


# ── Login ─────────────────────────────────────────────────────────────────────

@router.post("/login", response_model=AuthResponse)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Log in and receive a JWT token"""
    result = await db.execute(select(User).where(User.email == payload.email.lower()))
    user = result.scalar_one_or_none()

    if not user or not _verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    token = create_access_token(user.id, user.email, user.firm_name, user.is_admin)
    return AuthResponse(
        access_token=token,
        user_id=user.id,
        firm_name=user.firm_name,
        email=user.email,
        is_admin=user.is_admin,
    )


# ── Me ────────────────────────────────────────────────────────────────────────

@router.get("/me")
async def me(current_user: User = Depends(get_current_user)):
    """Return currently logged-in user info"""
    return {
        "user_id": current_user.id,
        "firm_name": current_user.firm_name,
        "email": current_user.email,
        "is_admin": current_user.is_admin,
        "created_at": current_user.created_at.isoformat(),
    }
