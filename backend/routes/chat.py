"""Chat (streaming, persisted) + models endpoints.

Flow of POST /api/chat:
  1. Load the conversation (and verify it belongs to the caller).
  2. Optionally apply per-turn overrides (model/system_prompt/temperature)
     and persist them onto the conversation.
  3. Persist the new user message.
  4. Stream the assistant reply from OpenRouter back to the client,
     accumulating the text. On stream end, persist the assistant message.
  5. If the conversation had no title yet, derive one from the first
     user message (first 60 chars).
"""
from __future__ import annotations

import json

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from auth.dependencies import get_current_user
from db.database import SessionLocal, get_db
from db.models import Conversation, Message, User
from models.schemas import ChatSendRequest
from services.openrouter import OpenRouterClient, OpenRouterError

router = APIRouter()
_client: OpenRouterClient | None = None


def get_client() -> OpenRouterClient:
    global _client
    if _client is None:
        _client = OpenRouterClient()
    return _client


# ---------- Models list (still public — no auth) ----------
@router.get("/models")
async def models():
    client = get_client()
    try:
        data = await client.list_models()
    except OpenRouterError as e:
        raise HTTPException(status_code=502, detail=str(e))

    items = [
        {
            "id": m.get("id"),
            "name": m.get("name") or m.get("id"),
            "context_length": m.get("context_length"),
            "pricing": m.get("pricing"),
        }
        for m in data
        if m.get("id")
    ]
    items.sort(key=lambda m: m["name"].lower())
    return {"models": items}


# ---------- Chat (auth required) ----------
@router.post("/chat")
async def chat(
    payload: ChatSendRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    convo = await db.get(Conversation, payload.conversation_id)
    if convo is None or convo.user_id != user.id:
        raise HTTPException(status_code=404, detail="Conversation introuvable")

    # Persist the user turn now so we don't lose it if the stream errors.
    if payload.model:
        convo.model = payload.model
    if payload.system_prompt is not None:
        convo.system_prompt = payload.system_prompt or None
    if payload.temperature is not None:
        convo.temperature = payload.temperature

    user_msg = Message(role="user", content=payload.content)
    convo.messages.append(user_msg)

    # Auto-title on first user turn.
    if not convo.title or convo.title == "Nouvelle conversation":
        first_line = payload.content.strip().splitlines()[0]
        convo.title = first_line[:60] + ("…" if len(first_line) > 60 else "")

    await db.commit()
    await db.refresh(convo)

    # Snapshot the data we need for the upstream call BEFORE the stream
    # starts — we'll be running with a fresh session afterward.
    convo_id = convo.id
    model = convo.model
    system_prompt = convo.system_prompt
    temperature = convo.temperature
    history = [{"role": m.role, "content": m.content} for m in convo.messages]

    api_messages: list[dict] = []
    if system_prompt:
        api_messages.append({"role": "system", "content": system_prompt})
    api_messages.extend(history)

    upstream_payload = {
        "model": model,
        "messages": api_messages,
        "temperature": temperature,
    }

    client = get_client()

    async def event_stream():
        accumulated = ""
        try:
            async for chunk in client.stream_chat(upstream_payload):
                if await request.is_disconnected():
                    break
                # The chunk is already an SSE-formatted string; we also
                # peek at the JSON to accumulate the assistant text.
                if chunk.startswith("data: ") and chunk.strip() != "data: [DONE]":
                    try:
                        body = json.loads(chunk[6:].strip())
                        delta = (
                            body.get("choices", [{}])[0]
                            .get("delta", {})
                            .get("content")
                        )
                        if delta:
                            accumulated += delta
                    except json.JSONDecodeError:
                        pass
                yield chunk
        except OpenRouterError as e:
            yield f"event: error\ndata: {str(e)}\n\n"
        finally:
            # Persist what we got, even on disconnect / error, so the
            # client can recover the partial answer on next load.
            if accumulated:
                async with SessionLocal() as fresh:
                    convo_again = await fresh.get(Conversation, convo_id)
                    if convo_again is not None:
                        convo_again.messages.append(
                            Message(role="assistant", content=accumulated)
                        )
                        await fresh.commit()

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
