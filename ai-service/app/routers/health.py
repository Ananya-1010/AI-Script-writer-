"""Readiness, including vector index and LLM provider reachability (spec 6.8).

Health output excludes system instructions and prompt templates, like every
other response from this service.
"""

from fastapi import APIRouter

from ..config import settings

router = APIRouter()


@router.get("/internal/health")
async def health() -> dict:
    return {
        "status": "ok",
        "service": "ai",
        "llmProvider": settings.llm_provider,
        "embeddingProvider": settings.embedding_provider,
        "vectorStore": settings.vector_store,
        # Loud on purpose: it should never be ambiguous whether a run is
        # spending real money.
        "usesLiveProvider": settings.uses_live_provider,
    }
