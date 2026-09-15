"""Retrieval.

Retrieval exists to answer one question: *what useful context should the model
know before writing this particular script?* It is not there to satisfy a
technical checkbox, and it is not there to make the prompt bigger (spec 5.2).

Four rules, all of them load-bearing:

1. **Empty context is a valid outcome.** If nothing clears the threshold we
   generate without retrieved context rather than injecting weak matches.
   Generation must never depend on retrieval succeeding.
2. **The creator filter is inside the query**, never applied afterwards.
3. **Every retrieval is traced.** Chunk IDs and scores are recorded so a bad
   script is diagnosable — prompt, retrieval, or model. Without the trace,
   quality debugging is guesswork.
4. **Context is capped by token budget, not just by k.** Six long chunks can
   cost more than the brief itself.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field

from .chunking import estimate_tokens
from .embeddings import EmbeddingProvider
from .vector_store import RetrievedChunk, VectorStore

log = logging.getLogger("ai-service.retriever")


@dataclass(frozen=True)
class RetrievalResult:
    chunks: list[RetrievedChunk] = field(default_factory=list)
    used_creator_knowledge: bool = False
    # Kept for the trace: how many cleared the threshold before the token cap
    # trimmed the set. A large gap here means the cap, not relevance, is what is
    # shaping the prompt — worth knowing before blaming the retriever.
    considered: int = 0
    dropped_below_threshold: int = 0
    dropped_by_token_cap: int = 0

    @property
    def is_empty(self) -> bool:
        return not self.chunks

    @property
    def chunk_ids(self) -> list[str]:
        return [chunk.chunk_id for chunk in self.chunks]

    @property
    def scores(self) -> list[float]:
        return [round(chunk.score, 4) for chunk in self.chunks]


def build_retrieval_query(brief: dict) -> str:
    """The query is the brief's *intent*, not its raw text.

    Searching with the idea alone finds documents about the topic. Adding
    platform, content type and objective is what surfaces the scripting
    knowledge — hook patterns, structures, CTA patterns — which is the whole
    reason the curated knowledge base exists.
    """
    parts = [
        brief.get("idea", ""),
        brief.get("contentType", ""),
        brief.get("platform", ""),
        brief.get("objective", ""),
    ]
    return " ".join(part for part in parts if part).strip()


class Retriever:
    def __init__(
        self,
        embeddings: EmbeddingProvider,
        store: VectorStore,
        *,
        top_k: int,
        min_score: float,
        token_budget: int,
    ) -> None:
        self._embeddings = embeddings
        self._store = store
        self._top_k = top_k
        self._min_score = min_score
        self._token_budget = token_budget

    async def retrieve(
        self, query: str, *, user_id: str | None = None, correlation_id: str = ""
    ) -> RetrievalResult:
        if not query.strip():
            return RetrievalResult()

        # Embedded as a query, not as a document — the provider treats the two
        # differently on purpose.
        vectors = await self._embeddings.embed([query], task="query")

        # Over-fetch, because the threshold is applied after the store returns.
        # Asking for exactly top_k and then filtering would routinely yield
        # fewer than k chunks even when good ones existed just outside the window.
        candidates = await self._store.search(
            vectors[0], user_id=user_id, top_k=self._top_k * 3
        )

        above = [chunk for chunk in candidates if chunk.score >= self._min_score]
        dropped_weak = len(candidates) - len(above)

        # Threshold first, then k. Ordering matters: k-then-threshold would let
        # a weak chunk occupy a slot a strong one could have used.
        above = above[: self._top_k]

        selected: list[RetrievedChunk] = []
        spent = 0
        for chunk in above:
            cost = estimate_tokens(chunk.text)
            if spent + cost > self._token_budget:
                continue
            selected.append(chunk)
            spent += cost

        result = RetrievalResult(
            chunks=selected,
            used_creator_knowledge=any(chunk.source == "creator" for chunk in selected),
            considered=len(candidates),
            dropped_below_threshold=dropped_weak,
            dropped_by_token_cap=len(above) - len(selected),
        )

        log.info(
            "retrieval_complete",
            extra={
                "correlationId": correlation_id,
                "considered": result.considered,
                "selected": len(selected),
                "droppedWeak": result.dropped_below_threshold,
                "droppedByBudget": result.dropped_by_token_cap,
                "usedCreatorKnowledge": result.used_creator_knowledge,
                "contextTokens": spent,
                "chunkIds": result.chunk_ids,
                "scores": result.scores,
            },
        )

        if result.is_empty:
            # Not an error. Logged loudly because a *persistently* empty
            # retrieval means the threshold is miscalibrated or the index is
            # empty, and that is the failure that turns this product back into a
            # generic chat wrapper without anything breaking.
            log.info(
                "retrieval_empty",
                extra={"correlationId": correlation_id, "minScore": self._min_score},
            )

        return result
