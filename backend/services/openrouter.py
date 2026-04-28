"""Async client for the OpenRouter chat-completions API.

Streams Server-Sent Events back to the caller. We do not transform the
underlying chunks — the FastAPI route just forwards them so the browser
can use the same parsing it would for a direct OpenAI-compatible stream.
"""
from __future__ import annotations

import os
from typing import Any, AsyncGenerator, Dict, List

import httpx


class OpenRouterError(RuntimeError):
    """Raised when OpenRouter returns a non-2xx response."""


class OpenRouterClient:
    def __init__(self) -> None:
        self.api_key = os.getenv("OPENROUTER_API_KEY")
        self.base_url = os.getenv(
            "OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1"
        ).rstrip("/")
        self.app_name = os.getenv("APP_NAME", "Chatbot")
        self.referer = os.getenv("HTTP_REFERER", "http://localhost:5173")
        if not self.api_key:
            raise RuntimeError(
                "OPENROUTER_API_KEY is not set. Copy .env.example to .env "
                "and fill in your key."
            )

    @property
    def _headers(self) -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            # OpenRouter recommends these for proper attribution.
            "HTTP-Referer": self.referer,
            "X-Title": self.app_name,
        }

    async def list_models(self) -> List[Dict[str, Any]]:
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.get(f"{self.base_url}/models", headers=self._headers)
            if r.status_code >= 400:
                raise OpenRouterError(f"models list failed: {r.status_code} {r.text}")
            return r.json().get("data", [])

    async def stream_chat(self, payload: Dict[str, Any]) -> AsyncGenerator[str, None]:
        """Stream chat completion as SSE lines.

        Yields strings already formatted as ``data: {...}\\n\\n`` so the
        FastAPI ``StreamingResponse`` can pass them straight to the client.
        """
        url = f"{self.base_url}/chat/completions"
        body = {**payload, "stream": True}

        async with httpx.AsyncClient(timeout=None) as client:
            async with client.stream(
                "POST", url, headers=self._headers, json=body
            ) as r:
                if r.status_code >= 400:
                    # Drain the body so we can include it in the error.
                    detail = await r.aread()
                    raise OpenRouterError(
                        f"chat stream failed: {r.status_code} {detail.decode(errors='replace')}"
                    )

                async for raw_line in r.aiter_lines():
                    if not raw_line:
                        continue
                    if raw_line.startswith(":"):
                        # Comment / keep-alive line — forward as-is.
                        yield f"{raw_line}\n\n"
                        continue
                    if raw_line.startswith("data: "):
                        data = raw_line[6:]
                        if data.strip() == "[DONE]":
                            yield "data: [DONE]\n\n"
                            return
                        yield f"data: {data}\n\n"
