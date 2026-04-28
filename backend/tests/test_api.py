"""Integration tests for the main API endpoints.

Runs against an in-memory SQLite database — no MySQL required.
Run from the backend/ directory:

    pip install -r requirements-dev.txt
    pytest
"""
from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient


# ── Infrastructure ─────────────────────────────────────────────────────────────

async def test_root(client: AsyncClient):
    r = await client.get("/")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


async def test_health(client: AsyncClient):
    r = await client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "healthy"


# ── Auth ───────────────────────────────────────────────────────────────────────

async def test_auth_config_public(client: AsyncClient):
    r = await client.get("/api/auth/config")
    assert r.status_code == 200
    assert r.json()["registration_enabled"] is True


async def test_register(client: AsyncClient):
    r = await client.post(
        "/api/auth/register",
        json={"email": "alice@example.com", "password": "secret123"},
    )
    assert r.status_code == 201
    assert "access_token" in r.json()


async def test_register_duplicate_email_returns_409(client: AsyncClient):
    body = {"email": "bob@example.com", "password": "secret123"}
    await client.post("/api/auth/register", json=body)
    r = await client.post("/api/auth/register", json=body)
    assert r.status_code == 409


async def test_login_success(client: AsyncClient):
    await client.post(
        "/api/auth/register",
        json={"email": "carol@example.com", "password": "secret123"},
    )
    r = await client.post(
        "/api/auth/login",
        json={"email": "carol@example.com", "password": "secret123"},
    )
    assert r.status_code == 200
    assert "access_token" in r.json()


async def test_login_wrong_password_returns_401(client: AsyncClient):
    await client.post(
        "/api/auth/register",
        json={"email": "dave@example.com", "password": "secret123"},
    )
    r = await client.post(
        "/api/auth/login",
        json={"email": "dave@example.com", "password": "wrong"},
    )
    assert r.status_code == 401


async def test_me_no_token_returns_4xx(client: AsyncClient):
    r = await client.get("/api/auth/me")
    assert r.status_code in (401, 403)


async def test_me_with_valid_token(auth_client: AsyncClient):
    r = await auth_client.get("/api/auth/me")
    assert r.status_code == 200
    assert r.json()["email"] == "test@example.com"


# ── Conversations ──────────────────────────────────────────────────────────────

async def test_list_conversations_requires_auth(client: AsyncClient):
    r = await client.get("/api/conversations")
    assert r.status_code in (401, 403)


async def test_create_conversation(auth_client: AsyncClient):
    r = await auth_client.post(
        "/api/conversations",
        json={"title": "Hello world", "model": "openai/gpt-4o-mini"},
    )
    assert r.status_code == 201
    data = r.json()
    assert data["title"] == "Hello world"
    assert "id" in data
    assert data["messages"] == []


async def test_list_conversations(auth_client: AsyncClient):
    await auth_client.post("/api/conversations", json={"title": "Chat A"})
    await auth_client.post("/api/conversations", json={"title": "Chat B"})
    r = await auth_client.get("/api/conversations")
    assert r.status_code == 200
    titles = [c["title"] for c in r.json()]
    assert "Chat A" in titles
    assert "Chat B" in titles


async def test_get_conversation_detail(auth_client: AsyncClient):
    r = await auth_client.post("/api/conversations", json={"title": "Detail test"})
    cid = r.json()["id"]
    r = await auth_client.get(f"/api/conversations/{cid}")
    assert r.status_code == 200
    assert r.json()["id"] == cid


async def test_rename_conversation(auth_client: AsyncClient):
    r = await auth_client.post("/api/conversations", json={"title": "Old name"})
    cid = r.json()["id"]
    r = await auth_client.patch(f"/api/conversations/{cid}", json={"title": "New name"})
    assert r.status_code == 200
    assert r.json()["title"] == "New name"


async def test_delete_conversation(auth_client: AsyncClient):
    r = await auth_client.post("/api/conversations", json={"title": "To delete"})
    cid = r.json()["id"]
    r = await auth_client.delete(f"/api/conversations/{cid}")
    assert r.status_code == 204
    r = await auth_client.get(f"/api/conversations/{cid}")
    assert r.status_code == 404


async def test_cannot_access_other_users_conversation(client: AsyncClient):
    # Create user A and their conversation.
    await client.post(
        "/api/auth/register",
        json={"email": "usera@example.com", "password": "pass123"},
    )
    r = await client.post(
        "/api/auth/login",
        json={"email": "usera@example.com", "password": "pass123"},
    )
    token_a = r.json()["access_token"]
    r = await client.post(
        "/api/conversations",
        json={"title": "Private"},
        headers={"Authorization": f"Bearer {token_a}"},
    )
    cid = r.json()["id"]

    # Create user B and try to access user A's conversation.
    await client.post(
        "/api/auth/register",
        json={"email": "userb@example.com", "password": "pass123"},
    )
    r = await client.post(
        "/api/auth/login",
        json={"email": "userb@example.com", "password": "pass123"},
    )
    token_b = r.json()["access_token"]
    r = await client.get(
        f"/api/conversations/{cid}",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert r.status_code == 404


# ── Models endpoint ────────────────────────────────────────────────────────────

async def test_models_endpoint(client: AsyncClient):
    mock_models = [
        {
            "id": "openai/gpt-4o",
            "name": "GPT-4o",
            "context_length": 128000,
            "pricing": {"prompt": "0.000005", "completion": "0.000015"},
        }
    ]
    with patch("routes.chat.get_client") as mock_get_client:
        mock_instance = AsyncMock()
        mock_instance.list_models = AsyncMock(return_value=mock_models)
        mock_get_client.return_value = mock_instance
        r = await client.get("/api/models")

    assert r.status_code == 200
    data = r.json()
    assert "models" in data
    assert data["models"][0]["id"] == "openai/gpt-4o"


async def test_models_endpoint_upstream_error_returns_502(client: AsyncClient):
    from services.openrouter import OpenRouterError

    with patch("routes.chat.get_client") as mock_get_client:
        mock_instance = AsyncMock()
        mock_instance.list_models = AsyncMock(side_effect=OpenRouterError("upstream down"))
        mock_get_client.return_value = mock_instance
        r = await client.get("/api/models")

    assert r.status_code == 502
