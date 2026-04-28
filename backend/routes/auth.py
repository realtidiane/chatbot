"""Authentication routes — /api/auth/register, /login, /me."""
from __future__ import annotations

import os

from fastapi import APIRouter, Depends, HTTPException, Request, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from auth.dependencies import get_current_user
from auth.security import create_access_token, hash_password, verify_password
from db.database import get_db
from db.models import User
from models.schemas import (
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    UserPublic,
)

router = APIRouter(prefix="/auth", tags=["auth"])
_limiter = Limiter(key_func=get_remote_address)


def _registration_enabled() -> bool:
    return os.getenv("ALLOW_REGISTRATION", "true").lower() in {"1", "true", "yes"}


@router.post("/register", response_model=TokenResponse, status_code=201)
@_limiter.limit("10/minute")
async def register(request: Request, payload: RegisterRequest, db: AsyncSession = Depends(get_db)):
    if not _registration_enabled():
        raise HTTPException(status_code=403, detail="Registration is disabled")

    email = payload.email.lower().strip()
    existing = await db.scalar(select(User).where(User.email == email))
    if existing:
        raise HTTPException(status_code=409, detail="Email déjà utilisé")

    user = User(
        email=email,
        password_hash=hash_password(payload.password),
        name=(payload.name or None),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    token = create_access_token(user.id, extra={"email": user.email})
    return TokenResponse(access_token=token)


@router.post("/login", response_model=TokenResponse)
@_limiter.limit("10/minute")
async def login(request: Request, payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    email = payload.email.lower().strip()
    user = await db.scalar(select(User).where(User.email == email))
    if not user or not verify_password(payload.password, user.password_hash):
        # Generic message — do not reveal whether the email exists.
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou mot de passe invalide",
        )
    token = create_access_token(user.id, extra={"email": user.email})
    return TokenResponse(access_token=token)


@router.get("/me", response_model=UserPublic)
async def me(user: User = Depends(get_current_user)):
    return user


@router.get("/config")
async def auth_config():
    """Public flag so the frontend can hide the register tab when disabled."""
    return {"registration_enabled": _registration_enabled()}
