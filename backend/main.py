"""FastAPI entry point.

Run for development with hot reload, listening on every interface:
    uvicorn main:app --host 0.0.0.0 --port 8000 --reload

…or just run this file directly (which does the same thing):
    python main.py
"""
from __future__ import annotations

import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv

load_dotenv()  # must run before any code that reads OPENROUTER_API_KEY / DATABASE_URL

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from db.database import init_models
from routes import auth as auth_routes
from routes import chat as chat_routes
from routes import conversations as conv_routes


@asynccontextmanager
async def lifespan(_: FastAPI):
    # Auto-create tables on startup. For real migrations, swap this out
    # for Alembic later.
    await init_models()
    yield


app = FastAPI(title="Chatbot API", version="2.0.0", lifespan=lifespan)

# Rate limiting — 60 req/min per IP by default.
limiter = Limiter(key_func=get_remote_address, default_limits=["60/minute"])
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS — comma-separated origins from env. Use "*" to allow any origin
# (handy when you open the frontend from another LAN device and want to
# call the backend directly without going through the Vite proxy).
raw_origins = os.getenv(
    "FRONTEND_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
)
origins = [o.strip() for o in raw_origins.split(",") if o.strip()]
allow_all = origins == ["*"]

# An origin regex covers any LAN IP (192.168.x.x / 10.x.x.x / 172.16-31.x.x)
# on common dev ports without having to enumerate each one.
default_lan_regex = (
    r"^https?://"
    r"(localhost|127\.0\.0\.1|"
    r"10\.\d{1,3}\.\d{1,3}\.\d{1,3}|"
    r"192\.168\.\d{1,3}\.\d{1,3}|"
    r"172\.(1[6-9]|2[0-9]|3[0-1])\.\d{1,3}\.\d{1,3})"
    r"(:\d+)?$"
)
origin_regex = os.getenv("FRONTEND_ORIGIN_REGEX", default_lan_regex)

cors_kwargs = dict(
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
if allow_all:
    cors_kwargs["allow_origins"] = ["*"]
    cors_kwargs["allow_credentials"] = False
else:
    cors_kwargs["allow_origins"] = origins
    cors_kwargs["allow_origin_regex"] = origin_regex

app.add_middleware(CORSMiddleware, **cors_kwargs)


@app.exception_handler(Exception)
async def unhandled_exception(_: Request, exc: Exception):
    # Never return raw exception text — it leaks internal details.
    import logging
    logging.exception("Unhandled exception")
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


# All routers are mounted under /api so the Vite proxy can forward them.
app.include_router(auth_routes.router, prefix="/api")
app.include_router(conv_routes.router, prefix="/api")
app.include_router(chat_routes.router, prefix="/api")


@app.get("/")
async def root():
    return {"status": "ok", "service": "chatbot-api"}


@app.get("/health")
async def health():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", "8000")),
        reload=os.getenv("RELOAD", "1") == "1",
    )
