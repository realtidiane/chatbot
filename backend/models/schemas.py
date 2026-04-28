"""Pydantic schemas — API request / response shapes."""
from __future__ import annotations

from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, EmailStr, Field


# ---------- Auth ----------
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=200)
    name: Optional[str] = Field(default=None, max_length=120)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(max_length=200)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserPublic(BaseModel):
    id: int
    email: EmailStr
    name: Optional[str] = None

    class Config:
        from_attributes = True


# ---------- Conversation / Message ----------
class MessagePublic(BaseModel):
    id: int
    role: Literal["system", "user", "assistant"]
    content: str
    created_at: datetime

    class Config:
        from_attributes = True


class ConversationSummary(BaseModel):
    id: str
    title: str
    model: str
    temperature: float
    system_prompt: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    message_count: int = 0


class ConversationDetail(ConversationSummary):
    messages: List[MessagePublic] = []


class ConversationCreate(BaseModel):
    title: Optional[str] = Field(default=None, max_length=200)
    model: Optional[str] = Field(default=None, max_length=200)
    system_prompt: Optional[str] = Field(default=None, max_length=8_000)
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)


class ConversationUpdate(BaseModel):
    title: Optional[str] = Field(default=None, max_length=200)
    model: Optional[str] = Field(default=None, max_length=200)
    system_prompt: Optional[str] = Field(default=None, max_length=8_000)
    temperature: Optional[float] = Field(default=None, ge=0.0, le=2.0)


# ---------- Chat (streaming) ----------
class ChatSendRequest(BaseModel):
    """Send one user turn into an existing conversation."""

    conversation_id: str = Field(max_length=100)
    content: str = Field(min_length=1, max_length=32_000)
    model: Optional[str] = Field(default=None, max_length=200)
    system_prompt: Optional[str] = Field(default=None, max_length=8_000)
    temperature: Optional[float] = Field(default=None, ge=0.0, le=2.0)


# ---------- Import (migration from localStorage) ----------
class ImportMessage(BaseModel):
    role: Literal["system", "user", "assistant"]
    content: str = Field(max_length=32_000)


class ImportConversation(BaseModel):
    title: str = Field(default="Conversation importée", max_length=200)
    model: str = Field(default="openai/gpt-4o-mini", max_length=200)
    system_prompt: Optional[str] = None
    temperature: float = 0.7
    messages: List[ImportMessage] = []


class ImportRequest(BaseModel):
    conversations: List[ImportConversation] = Field(max_length=500)


class ImportResponse(BaseModel):
    imported: int
