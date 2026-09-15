"""Embedding providers, behind one interface.

Same strategy as the LLM: swapping provider is a config change. Two properties
matter more than which model is used.

1. The stub must be *deterministic*. Retrieval tests assert that the same query
   ranks the same chunks; a random stub makes those tests meaningless.
2. Documents and queries must be embedded by the same provider and model. Mixing
   them produces vectors in different spaces and similarity scores that look
   plausible and mean nothing — which is exactly the silent failure that makes
   RAG "work" while returning irrelevant context.
"""

from __future__ import annotations

import hashlib
import logging
import math
import struct
from typing import Literal, Protocol

import httpx

from ..config import settings
from ..errors import ServiceError

log = logging.getLogger("ai-service.embeddings")

TaskType = Literal["document", "query"]


class EmbeddingProvider(Protocol):
    name: str
    dimensions: int

    async def embed(self, texts: list[str], *, task: TaskType = "document") -> list[list[float]]: ...


def _l2_normalise(vector: list[float]) -> list[float]:
    norm = math.sqrt(sum(v * v for v in vector))
    return [v / norm for v in vector] if norm else vector


class StubEmbeddings:
    """Hash-derived, deterministic, offline, free.

    Not semantically meaningful — identical text gives identical vectors and
    different text gives unrelated ones. That is enough to test the plumbing
    (chunking, indexing, top-k, scoring, tenant filtering) with zero API calls,
    and it is honest about being nothing more than plumbing.
    """

    name = "stub"

    def __init__(self, dimensions: int = 256) -> None:
        self.dimensions = dimensions

    async def embed(self, texts: list[str], *, task: TaskType = "document") -> list[list[float]]:
        return [self._vector(text) for text in texts]

    def _vector(self, text: str) -> list[float]:
        # Stretch a digest to the required width, then read it as floats.
        raw = b""
        counter = 0
        needed = self.dimensions * 4
        while len(raw) < needed:
            raw += hashlib.sha256(f"{counter}:{text}".encode("utf-8")).digest()
            counter += 1

        values = [
            struct.unpack_from(">I", raw, i * 4)[0] / 0xFFFFFFFF - 0.5
            for i in range(self.dimensions)
        ]
        return _l2_normalise(values)


class GeminiEmbeddings:
    """Google's embedding endpoint, on the same free key as generation.

    task_type is set per call because Google embeds a query and a document
    differently on purpose; using one for both measurably degrades retrieval.
    """

    name = "gemini"
    BASE = "https://generativelanguage.googleapis.com/v1beta"

    _TASK = {
        "document": "RETRIEVAL_DOCUMENT",
        "query": "RETRIEVAL_QUERY",
    }

    def __init__(self, api_key: str, model: str, dimensions: int, timeout_s: float) -> None:
        if not api_key:
            raise ServiceError("INTERNAL_ERROR", "Embedding provider is not configured.")
        self._api_key = api_key
        self._model = model
        self.dimensions = dimensions
        self._timeout = timeout_s

    async def embed(self, texts: list[str], *, task: TaskType = "document") -> list[list[float]]:
        if not texts:
            return []

        # One batch request rather than N: the free tier is rate-limited per
        # request, so batching is what keeps ingestion inside the quota.
        body = {
            "requests": [
                {
                    "model": f"models/{self._model}",
                    "content": {"parts": [{"text": text}]},
                    "taskType": self._TASK[task],
                    "outputDimensionality": self.dimensions,
                }
                for text in texts
            ]
        }

        url = f"{self.BASE}/models/{self._model}:batchEmbedContents"

        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                response = await client.post(
                    url, json=body, headers={"x-goog-api-key": self._api_key}
                )
        except httpx.TimeoutException as exc:
            raise ServiceError("RETRIEVAL_FAILED", "Knowledge lookup timed out.") from exc
        except httpx.HTTPError as exc:
            raise ServiceError("RETRIEVAL_FAILED", "Knowledge lookup failed.") from exc

        if response.status_code == 429:
            raise ServiceError("LLM_RATE_LIMITED", "Knowledge lookup is busy. Try again shortly.")
        if response.status_code >= 400:
            log.warning("embedding_http_error", extra={"status": response.status_code})
            raise ServiceError("RETRIEVAL_FAILED", "Knowledge lookup failed.")

        embeddings = response.json().get("embeddings", [])
        if len(embeddings) != len(texts):
            raise ServiceError("RETRIEVAL_FAILED", "Knowledge lookup returned an unexpected result.")

        # Normalising here means cosine similarity is a plain dot product
        # everywhere downstream, and scores are comparable across providers.
        return [_l2_normalise(item["values"]) for item in embeddings]


def build_embeddings() -> EmbeddingProvider:
    if settings.embedding_provider == "stub":
        return StubEmbeddings()
    if settings.embedding_provider == "gemini":
        return GeminiEmbeddings(
            api_key=settings.embedding_api_key or settings.llm_api_key,
            model=settings.embedding_model or "gemini-embedding-001",
            dimensions=settings.embedding_dimensions,
            timeout_s=settings.llm_timeout_s,
        )
    raise ServiceError("INTERNAL_ERROR", "Embedding provider is not configured.")
