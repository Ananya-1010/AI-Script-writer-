"""Provider-agnostic LLM interface.

The product's value sits in context assembly and workflow, not in the foundation
model, so the model is a swappable dependency behind one interface (spec 3.7).
Changing provider touches this file and nothing else.

Every provider returns the same Completion, including token counts and cost, so
cost accounting does not care which provider produced the text (spec 12.6).
"""

from __future__ import annotations

import asyncio
import json
import logging
import random
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


# USD per 1M tokens, (input, output). Cost is recorded even on a free tier,
# because "what would this have cost" is what tells us the design is affordable
# before an invoice does.
#
# ⚠️ Introductory rates. Google has said Standard pricing roughly doubles on
# 2027-01-01 (3.6-flash to 1.50 / 7.50). Revisit this table then rather than
# discovering it from a bill.
PRICING: dict[str, tuple[float, float]] = {
    "gemini-3.6-flash": (0.75, 3.75),
    "gemini-3.5-flash": (0.75, 3.75),
    "gemini-2.5-flash": (0.30, 2.50),
    "gemini-2.5-flash-lite": (0.10, 0.40),
}

_unpriced_warned: set[str] = set()


def price(model: str, prompt_tokens: int, completion_tokens: int) -> float:
    rates = PRICING.get(model)

    if rates is None:
        # Returning a silent 0.0 for an unknown model is how a cost dashboard
        # reads healthy while spend climbs. Token counts stay accurate either
        # way; only the money is unknown, and that is worth saying out loud.
        if model not in _unpriced_warned:
            _unpriced_warned.add(model)
            log.warning("model_not_in_pricing_table", extra={"model": model})
        return 0.0

    inp, out = rates
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

    # A free tier is a shared tier: 429 (our rate) and 503 (their load) are
    # ordinary weather, not exceptional failures. Retrying a couple of times
    # with backoff is the difference between a product that works and one that
    # asks the creator to press the button again.
    TRANSIENT_STATUSES = {429, 500, 502, 503, 504, 529}
    MAX_ATTEMPTS = 3
    BACKOFF_BASE_S = 1.5

    def __init__(self, api_key: str, model: str, timeout_s: float) -> None:
        if not api_key:
            raise ServiceError("INTERNAL_ERROR", "LLM provider is not configured.")
        self._api_key = api_key
        self._model = model
        self._timeout = timeout_s

    async def _post_with_retry(self, url: str, body: dict) -> httpx.Response:
        """Bounded retry with jittered exponential backoff on transient failures.

        Jitter matters: without it, several generations that fail together
        retry together, and the retries collide exactly as the originals did.

        A timeout is *not* retried. The request may well have been served and
        billed; re-sending doubles the cost to answer a question the creator can
        answer faster by pressing retry themselves.
        """
        last_status: int | None = None

        for attempt in range(1, self.MAX_ATTEMPTS + 1):
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

            if response.status_code < 400:
                if attempt > 1:
                    log.info("llm_retry_succeeded", extra={"attempt": attempt})
                return response

            last_status = response.status_code

            if response.status_code not in self.TRANSIENT_STATUSES:
                # Provider payloads never reach the caller: they can echo prompt
                # text. The status is enough to act on.
                log.warning("llm_http_error", extra={"status": response.status_code})
                raise ServiceError(
                    "GENERATION_FAILED", "The script could not be generated. Please try again."
                )

            if attempt < self.MAX_ATTEMPTS:
                delay = self.BACKOFF_BASE_S * (2 ** (attempt - 1)) + random.uniform(0, 0.5)
                log.info(
                    "llm_transient_error_retrying",
                    extra={"status": response.status_code, "attempt": attempt, "delayMs": int(delay * 1000)},
                )
                await asyncio.sleep(delay)

        log.warning("llm_transient_exhausted", extra={"status": last_status, "attempts": self.MAX_ATTEMPTS})

        if last_status == 429:
            raise ServiceError(
                "LLM_RATE_LIMITED",
                "You have hit the model's rate limit. Please wait a moment and try again.",
            )
        raise ServiceError(
            "LLM_RATE_LIMITED",
            "The model is busy right now. Please try again in a moment.",
        )

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

        response = await self._post_with_retry(url, body)
        latency_ms = int((time.perf_counter() - started) * 1000)

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
