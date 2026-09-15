"""Provider-agnostic LLM interface.

The product's value sits in context assembly and workflow, not in the foundation
model, so the model is a swappable dependency behind one interface (spec 3.7).
Changing provider touches this file and nothing else.

Every provider returns the same Completion, including token counts and cost, so
cost accounting does not care which provider produced the text (spec 12.6).
"""

from __future__ import annotations

import json
import logging
import time
from dataclasses import dataclass
from typing import Any, Protocol

import httpx

from ..config import settings
from ..errors import ServiceError

log = logging.getLogger("ai-service.llm")


@dataclass(frozen=True)
class Completion:
    text: str
    model: str
    prompt_tokens: int
    completion_tokens: int
    cost_usd: float
    latency_ms: int


class LLMProvider(Protocol):
    name: str

    async def complete(
        self,
        *,
        system: str,
        user: str,
        response_schema: dict[str, Any] | None = None,
        temperature: float | None = None,
    ) -> Completion: ...


# USD per 1M tokens. Used to record cost even when the call is on a free tier,
# because "what would this have cost" is the number that tells us whether the
# design is affordable before it is ever billed.
PRICING: dict[str, tuple[float, float]] = {
    "gemini-2.5-flash": (0.30, 2.50),
    "gemini-2.5-flash-lite": (0.10, 0.40),
}


def price(model: str, prompt_tokens: int, completion_tokens: int) -> float:
    inp, out = PRICING.get(model, (0.0, 0.0))
    return round((prompt_tokens * inp + completion_tokens * out) / 1_000_000, 6)


class StubLLM:
    """Deterministic, offline, free.

    This is the default provider for development and the only one CI ever sees
    (spec 13.1). It returns a schema-valid structured script so the whole
    pipeline — retrieval, prompt assembly, validation, persistence — can be
    exercised end to end without a single paid call.
    """

    name = "stub"

    async def complete(
        self,
        *,
        system: str,
        user: str,
        response_schema: dict[str, Any] | None = None,
        temperature: float | None = None,
    ) -> Completion:
        started = time.perf_counter()

        payload = {
            "title": "Stubbed script",
            "sections": [
                {"kind": "hook", "heading": "Open", "body": "Stub hook.", "order": 0},
                {"kind": "point", "heading": "Point 1", "body": "Stub point.", "order": 1},
                {"kind": "cta", "heading": "Close", "body": "Stub call to action.", "order": 2},
            ],
            "estimatedDurationSeconds": 60,
            "platform": "youtube",
            "contentType": "educational",
        }

        # Token counts are approximated so cost dashboards and prompt-size
        # assertions have something real to read in development.
        approx_prompt = (len(system) + len(user)) // 4
        return Completion(
            text=json.dumps(payload),
            model="stub",
            prompt_tokens=approx_prompt,
            completion_tokens=len(json.dumps(payload)) // 4,
            cost_usd=0.0,
            latency_ms=int((time.perf_counter() - started) * 1000),
        )


class GeminiLLM:
    """Google Gemini via the Generative Language API.

    Chosen because its free tier is a real free tier: no card, no expiry, and
    enough requests per day to build and demo on. Structured output is requested
    natively (responseMimeType + responseSchema) rather than by asking the model
    to "reply in JSON", which removes most of the malformed-output class of
    failure before the validator has to catch it.
    """

    name = "gemini"
    BASE = "https://generativelanguage.googleapis.com/v1beta"

    def __init__(self, api_key: str, model: str, timeout_s: float) -> None:
        if not api_key:
            raise ServiceError("INTERNAL_ERROR", "LLM provider is not configured.")
        self._api_key = api_key
        self._model = model
        self._timeout = timeout_s

    async def complete(
        self,
        *,
        system: str,
        user: str,
        response_schema: dict[str, Any] | None = None,
        temperature: float | None = None,
    ) -> Completion:
        body: dict[str, Any] = {
            "systemInstruction": {"parts": [{"text": system}]},
            "contents": [{"role": "user", "parts": [{"text": user}]}],
            "generationConfig": {
                "temperature": settings.llm_temperature if temperature is None else temperature,
                "maxOutputTokens": settings.llm_max_output_tokens,
            },
        }

        if response_schema is not None:
            body["generationConfig"]["responseMimeType"] = "application/json"
            body["generationConfig"]["responseSchema"] = response_schema

        started = time.perf_counter()
        url = f"{self.BASE}/models/{self._model}:generateContent"

        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                response = await client.post(
                    url, json=body, headers={"x-goog-api-key": self._api_key}
                )
        except httpx.TimeoutException as exc:
            raise ServiceError(
                "LLM_TIMEOUT", "The script took too long to generate. Please try again."
            ) from exc
        except httpx.HTTPError as exc:
            raise ServiceError(
                "GENERATION_FAILED", "The script could not be generated. Please try again."
            ) from exc

        latency_ms = int((time.perf_counter() - started) * 1000)

        if response.status_code == 429:
            # The free tier is 10 RPM / 500 RPD. Hitting it is expected, not
            # exceptional, so it is a typed retryable error rather than a crash.
            raise ServiceError(
                "LLM_RATE_LIMITED", "The model is busy right now. Please try again shortly."
            )
        if response.status_code >= 400:
            # Provider payloads never reach the caller: they can echo prompt text.
            log.warning("llm_http_error", extra={"status": response.status_code})
            raise ServiceError(
                "GENERATION_FAILED", "The script could not be generated. Please try again."
            )

        data = response.json()

        try:
            text = data["candidates"][0]["content"]["parts"][0]["text"]
        except (KeyError, IndexError):
            # A blocked or empty candidate is malformed output as far as the
            # pipeline is concerned; the validator's repair retry handles it.
            raise ServiceError(
                "MALFORMED_LLM_OUTPUT", "The generated script could not be read. Please try again."
            ) from None

        usage = data.get("usageMetadata", {})
        prompt_tokens = int(usage.get("promptTokenCount", 0))
        completion_tokens = int(usage.get("candidatesTokenCount", 0))

        return Completion(
            text=text,
            model=self._model,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            cost_usd=price(self._model, prompt_tokens, completion_tokens),
            latency_ms=latency_ms,
        )


def build_llm() -> LLMProvider:
    if settings.llm_provider == "stub":
        return StubLLM()
    if settings.llm_provider == "gemini":
        return GeminiLLM(
            api_key=settings.llm_api_key,
            model=settings.llm_model or "gemini-2.5-flash",
            timeout_s=settings.llm_timeout_s,
        )
    raise ServiceError("INTERNAL_ERROR", "LLM provider is not configured.")
