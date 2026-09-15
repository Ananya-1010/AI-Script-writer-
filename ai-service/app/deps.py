"""Dependency wiring.

Providers are constructed once, here, and injected everywhere else (spec 5.6).
The point is testability: a test swaps in a stub LLM or a fixed-vector embedder
and exercises the real retrieval and generation code paths with **zero API
calls**. If routers constructed their own providers, every test would either hit
a network or need monkeypatching.

Construction is lazy so that importing this module never requires a key — which
is what lets the test suite and CI import the app with an empty environment.
"""

from __future__ import annotations

from functools import lru_cache

from .config import settings
from .generation.llm import LLMProvider, build_llm
from .rag.embeddings import EmbeddingProvider, build_embeddings
from .rag.retriever import Retriever
from .rag.vector_store import VectorStore, build_vector_store


@lru_cache(maxsize=1)
def get_llm() -> LLMProvider:
    return build_llm()


@lru_cache(maxsize=1)
def get_embeddings() -> EmbeddingProvider:
    return build_embeddings()


@lru_cache(maxsize=1)
def get_vector_store() -> VectorStore:
    return build_vector_store()


@lru_cache(maxsize=1)
def get_retriever() -> Retriever:
    return Retriever(
        embeddings=get_embeddings(),
        store=get_vector_store(),
        top_k=settings.retrieval_top_k,
        min_score=settings.retrieval_min_score,
        # The context set gets roughly half the prompt budget. The rest belongs
        # to the system prompt, the creator profile, the brief and the structure
        # spec — retrieved context is an input to the prompt, not the prompt.
        token_budget=settings.prompt_token_cap // 2,
    )


def reset() -> None:
    """Drop cached providers. Used by tests that need a different configuration
    within one process."""
    for cached in (get_llm, get_embeddings, get_vector_store, get_retriever):
        cached.cache_clear()
