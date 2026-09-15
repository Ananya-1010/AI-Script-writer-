"""Internal API. Private network only, service token required.

Typed request and response models on both sides of the boundary, because the
Node-to-Python hop is exactly where a silent failure would otherwise hide
(spec 3.7).
"""

from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field

from ..config import settings
from ..deps import get_llm, get_retriever
from ..generation.pipeline import GenerationOutcome, GenerationPipeline
from ..generation.schema import ContentType, Platform
from ..security import require_service_token

router = APIRouter(
    prefix="/internal",
    dependencies=[Depends(require_service_token)],
)


class Brief(BaseModel):
    idea: str = Field(min_length=1, max_length=5000)
    platform: Platform
    contentType: ContentType
    audience: str = Field(max_length=500)
    objective: str = Field(min_length=1, max_length=500)
    durationSeconds: int = Field(ge=5, le=7200)


class GenerateRequest(BaseModel):
    correlationId: str = ""
    userId: str | None = None  # a retrieval scope, never a credential
    brief: Brief
    profile: dict | None = None  # null is valid: generation must still work
    temperature: float | None = Field(default=None, ge=0.0, le=2.0)


class ImproveRequest(BaseModel):
    correlationId: str = ""
    userId: str | None = None
    brief: Brief
    script: dict
    profile: dict | None = None
    type: Literal["improve_hook", "change_tone", "shorten", "expand"]
    instruction: str | None = Field(default=None, max_length=1000)


class VariationsRequest(BaseModel):
    correlationId: str = ""
    userId: str | None = None
    brief: Brief
    profile: dict | None = None
    # Capped: each variation is a full completion, so this is a direct multiplier
    # on both latency and spend.
    count: int = Field(default=3, ge=2, le=4)


def _pipeline() -> GenerationPipeline:
    return GenerationPipeline(get_llm(), get_retriever())


def _present(outcome: GenerationOutcome) -> dict:
    """The response shape. Note what is absent: no prompt, no template, no
    provider payload. Prompts do not cross this boundary (spec 6.8)."""
    return {
        "script": outcome.script.model_dump(by_alias=True, mode="json"),
        "retrieval": {
            "usedCreatorKnowledge": outcome.retrieval.used_creator_knowledge,
            "chunkCount": len(outcome.retrieval.chunks),
            "chunkIds": outcome.retrieval.chunk_ids,
            "scores": outcome.retrieval.scores,
            "enabled": settings.retrieval_enabled,
        },
        "checks": outcome.checks,
        "usage": {
            "promptTokens": outcome.usage.prompt_tokens,
            "completionTokens": outcome.usage.completion_tokens,
            "costUsd": outcome.usage.cost_usd,
        },
        "model": outcome.usage.model,
        "latencyMs": outcome.usage.latency_ms,
        "phases": outcome.phases,
        "repaired": outcome.repaired,
    }


@router.post("/generate")
async def generate(body: GenerateRequest, request: Request) -> dict:
    outcome = await _pipeline().generate(
        brief=body.brief.model_dump(mode="json"),
        profile=body.profile,
        user_id=body.userId,
        correlation_id=body.correlationId or request.headers.get("X-Correlation-Id", ""),
        temperature=body.temperature,
    )
    return _present(outcome)


@router.post("/improve")
async def improve(body: ImproveRequest, request: Request) -> dict:
    outcome = await _pipeline().improve(
        brief=body.brief.model_dump(mode="json"),
        script=body.script,
        profile=body.profile,
        improvement_type=body.type,
        instruction=body.instruction,
        correlation_id=body.correlationId or request.headers.get("X-Correlation-Id", ""),
    )
    presented = _present(outcome)
    presented["changed"] = _changed_sections(body.type)
    # Reported explicitly so Node can assert it rather than assume it.
    presented["preserved"] = {"objective": True, "sectionOrder": body.type != "expand"}
    return presented


@router.post("/variations")
async def variations(body: VariationsRequest, request: Request) -> dict:
    outcomes = await _pipeline().variations(
        brief=body.brief.model_dump(mode="json"),
        profile=body.profile,
        user_id=body.userId,
        correlation_id=body.correlationId or request.headers.get("X-Correlation-Id", ""),
        count=body.count,
    )

    return {
        "variations": [
            {"variationId": f"v_{index + 1}", **_present(outcome)}
            for index, outcome in enumerate(outcomes)
        ],
        "usage": {
            "promptTokens": sum(o.usage.prompt_tokens for o in outcomes),
            "completionTokens": sum(o.usage.completion_tokens for o in outcomes),
            "costUsd": round(sum(o.usage.cost_usd for o in outcomes), 6),
        },
    }


def _changed_sections(improvement_type: str) -> list[str]:
    return {
        "improve_hook": ["hook"],
        "change_tone": ["all"],
        "shorten": ["all"],
        "expand": ["all"],
    }[improvement_type]
