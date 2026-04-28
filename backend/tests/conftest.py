"""Shared fixtures.

We set DATABASE_URL *before* importing any project module so that
db/database.py picks up the SQLite URL when it creates the engine at
module level.  load_dotenv() in main.py doesn't override existing env
vars, so the real .env is ignored during tests.
"""
import os

os.environ["OPENROUTER_API_KEY"] = "test-key-placeholder"
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///:memory:"
os.environ["JWT_SECRET"] = "test-secret-for-unit-tests-only"
os.environ["ALLOW_REGISTRATION"] = "true"

import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

# Import db.database first so we can replace its engine before main.py
# imports the routes (which bind SessionLocal at import time).
import db.database as _db

_TEST_ENGINE = create_async_engine(
    "sqlite+aiosqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
_TEST_SESSION = async_sessionmaker(
    bind=_TEST_ENGINE, expire_on_commit=False, class_=AsyncSession
)
_db.engine = _TEST_ENGINE
_db.SessionLocal = _TEST_SESSION

# Now safe to import the app — routes bind from db.database which is patched.
from main import app  # noqa: E402
from db.database import Base  # noqa: E402


@pytest_asyncio.fixture
async def client():
    """HTTP client wired to the FastAPI app with a fresh in-memory DB."""
    from db import models as _  # noqa: registers ORM models on Base.metadata

    async with _TEST_ENGINE.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as c:
        yield c

    async with _TEST_ENGINE.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def auth_client(client: AsyncClient):
    """client already authenticated as test@example.com."""
    await client.post(
        "/api/auth/register",
        json={"email": "test@example.com", "password": "password123", "name": "Tester"},
    )
    r = await client.post(
        "/api/auth/login",
        json={"email": "test@example.com", "password": "password123"},
    )
    client.headers["Authorization"] = f"Bearer {r.json()['access_token']}"
    return client
