"""AI service entrypoint.

Owns everything model-adjacent: knowledge ingestion, embedding, retrieval,
prompt construction, LLM invocation, structured-output validation. Owns no
application state — every persistence decision stays in Node, which is what
makes this service safe to redeploy mid-session and cheap to test in isolation.
"""

import logging

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from .config import settings
from .errors import ServiceError
from .observability.logging import configure_logging
from .routers import health, internal

configure_logging()
log = logging.getLogger("ai-service")

app = FastAPI(
    title="AI Script Writer — AI Service",
    version="0.1.0",
    # Not routed publicly, but there is no reason to serve a schema browser
    # from a service whose whole job is to keep prompts private.
    docs_url=None,
    redoc_url=None,
)

app.include_router(health.router)
app.include_router(internal.router)


@app.exception_handler(ServiceError)
async def service_error_handler(request: Request, exc: ServiceError) -> JSONResponse:
    request_id = request.headers.get("X-Request-Id", "")
    correlation_id = request.headers.get("X-Correlation-Id", "")

    log.warning(
        "request_failed",
        extra={"errorCode": exc.code, "correlationId": correlation_id, "requestId": request_id},
    )
    return JSONResponse(
        status_code=exc.status, content=exc.envelope(request_id, correlation_id)
    )


@app.exception_handler(Exception)
async def unhandled_error_handler(request: Request, exc: Exception) -> JSONResponse:
    """Nothing unexpected reaches the caller as a stack trace or a raw message."""
    log.exception("unhandled_error")
    fallback = ServiceError("INTERNAL_ERROR", "Something went wrong. Please try again.")
    return JSONResponse(
        status_code=fallback.status,
        content=fallback.envelope(
            request.headers.get("X-Request-Id", ""),
            request.headers.get("X-Correlation-Id", ""),
        ),
    )


@app.on_event("startup")
async def on_startup() -> None:
    log.info(
        "ai_service_started",
        extra={
            "llmProvider": settings.llm_provider,
            "embeddingProvider": settings.embedding_provider,
            "usesLiveProvider": settings.uses_live_provider,
        },
    )
