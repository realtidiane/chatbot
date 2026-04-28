"""CRUD over conversations + bulk import from localStorage."""
from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from auth.dependencies import get_current_user
from db.database import get_db
from db.models import Conversation, Message, User
from models.schemas import (
    ConversationCreate,
    ConversationDetail,
    ConversationSummary,
    ConversationUpdate,
    ImportRequest,
    ImportResponse,
)

router = APIRouter(prefix="/conversations", tags=["conversations"])


async def _load_owned(
    db: AsyncSession, conversation_id: str, user: User
) -> Conversation:
    convo = await db.get(Conversation, conversation_id)
    if convo is None or convo.user_id != user.id:
        raise HTTPException(status_code=404, detail="Conversation introuvable")
    return convo


def _to_summary(c: Conversation) -> ConversationSummary:
    return ConversationSummary(
        id=c.id,
        title=c.title,
        model=c.model,
        temperature=c.temperature,
        system_prompt=c.system_prompt,
        created_at=c.created_at,
        updated_at=c.updated_at,
        message_count=len(c.messages) if c.messages is not None else 0,
    )


@router.get("", response_model=List[ConversationSummary])
async def list_conversations(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    rows = await db.execute(
        select(Conversation)
        .where(Conversation.user_id == user.id)
        .order_by(Conversation.updated_at.desc())
    )
    return [_to_summary(c) for c in rows.scalars().all()]


@router.post("", response_model=ConversationDetail, status_code=201)
async def create_conversation(
    payload: ConversationCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    convo = Conversation(
        user_id=user.id,
        title=payload.title or "Nouvelle conversation",
        model=payload.model or "openai/gpt-4o-mini",
        system_prompt=payload.system_prompt,
        temperature=payload.temperature,
    )
    db.add(convo)
    await db.commit()
    await db.refresh(convo)
    return ConversationDetail(
        **_to_summary(convo).model_dump(),
        messages=[],
    )


@router.get("/{conversation_id}", response_model=ConversationDetail)
async def get_conversation(
    conversation_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    convo = await _load_owned(db, conversation_id, user)
    return ConversationDetail(
        **_to_summary(convo).model_dump(),
        messages=convo.messages,
    )


@router.patch("/{conversation_id}", response_model=ConversationSummary)
async def update_conversation(
    conversation_id: str,
    payload: ConversationUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    convo = await _load_owned(db, conversation_id, user)
    if payload.title is not None:
        convo.title = payload.title.strip() or convo.title
    if payload.model is not None:
        convo.model = payload.model
    if payload.system_prompt is not None:
        convo.system_prompt = payload.system_prompt or None
    if payload.temperature is not None:
        convo.temperature = payload.temperature
    await db.commit()
    await db.refresh(convo)
    return _to_summary(convo)


@router.delete("/{conversation_id}", status_code=204)
async def delete_conversation(
    conversation_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    convo = await _load_owned(db, conversation_id, user)
    await db.delete(convo)
    await db.commit()
    return None


@router.post("/import", response_model=ImportResponse)
async def import_conversations(
    payload: ImportRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Bulk-import conversations coming from the user's old localStorage."""
    count = 0
    for c in payload.conversations:
        convo = Conversation(
            user_id=user.id,
            title=(c.title or "Conversation importée")[:200],
            model=c.model or "openai/gpt-4o-mini",
            system_prompt=c.system_prompt,
            temperature=c.temperature,
        )
        for m in c.messages:
            if not m.content:
                continue
            convo.messages.append(Message(role=m.role, content=m.content))
        db.add(convo)
        count += 1
    await db.commit()
    return ImportResponse(imported=count)
