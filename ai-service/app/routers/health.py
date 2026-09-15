"""Readiness and metrics (spec 6.8).

Health output excludes system instructions and prompt templates, like every
other response from this service.
"""

from fastapi import APIRouter, Depends, Response

from ..config import settings
from ..deps import get_vector_store
from ..observability import metrics
from ..security import require_service_token

router = APIRouter()


@router.get("/internal/health")
async def health() -> dict:
    store = get_vector_store()

    return {
        "status": "ok",
        "service": "ai",
        "llmProvider": settings.llm_provider,
        "embeddingProvider": settings.embedding_provider,
        "vectorStore": store.name,
        "vectorStoreReachable": await store.health(),
        # Loud on purpose: it should never be ambiguous whether a run is
        # spending real money.
        "usesLiveProvider": settings.uses_live_provider,
    }


@router.get("/internal/metrics", dependencies=[Depends(require_service_token)])
async def metrics_endpoint() -> Response:
    # Behind the service token: retrieval and cost metrics describe usage
    # patterns and belong on the private network only.
    return Response(content=metrics.render(), media_type="text/plain; version=0.0.4")
