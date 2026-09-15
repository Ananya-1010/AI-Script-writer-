"""The generation pipeline: retrieve, prompt, generate, validate.

One place where the phases are ordered and timed, so a slow generation can be
attributed to a stage rather than guessed at (spec 12.1), and so the repair
retry exists exactly once rather than in each router.
"""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field

from ..config import settings
from ..errors import ServiceError
from ..observability import metrics
from ..prompts.improve_prompt import build_improvement_prompt, variation_note
from ..prompts.script_prompt import build_generation_prompt
from ..prompts.system import SYSTEM_PROMPT
from ..rag.retriever import RetrievalResult, build_retrieval_query
from .llm import Completion, LLMProvider
from .schema import RESPONSE_SCHEMA, StructuredScript
from .validator import parse_script, repair_instruction, run_structural_checks

log = logging.getLogger("ai-service.pipeline")


@dataclass
class GenerationOutcome:
    script: StructuredScript
    retrieval: RetrievalResult
    checks: dict
    usage: Completion
    repaired: bool = False
    phases: dict[str, int] = field(default_factory=dict)


class Phase:
    """Times a phase and records it, so latency is attributable per stage."""

    def __init__(self, phases: dict[str, int], name: str) -> None:
        self._phases = phases
        self._name = name

    def __enter__(self):
        self._started = time.perf_counter()
        return self

    def __exit__(self, *_):
        elapsed = time.perf_counter() - self._started
        self._phases[self._name] = int(elapsed * 1000)
        metrics.observe("asw_generation_phase_seconds", elapsed, {"phase": self._name})
        return False


class GenerationPipeline:
    def __init__(self, llm: LLMProvider, retriever) -> None:
        self._llm = llm
        self._retriever = retriever

    async def _complete_and_validate(
        self, *, system: str, user: str, temperature: float | None, phases: dict
    ) -> tuple[StructuredScript, Completion, bool]:
        """One completion, one bounded repair retry, then a typed error.

        The repair is bounded at exactly one on purpose. A model that has failed
        the schema twice is not converging, and a third attempt spends the
        creator's time and real money to arrive at the same failure.
        """
        with Phase(phases, "provider"):
            completion = await self._llm.complete(
                system=system, user=user, response_schema=RESPONSE_SCHEMA, temperature=temperature
            )

        with Phase(phases, "validation"):
            try:
                return parse_script(completion.text), completion, False
            except ServiceError:
                metrics.increment("asw_output_validation_failures_total", {"recovered": "pending"})

        log.info("output_repair_attempt")

        with Phase(phases, "provider_repair"):
            repair = await self._llm.complete(
                system=system,
                user=repair_instruction(completion.text),
                response_schema=RESPONSE_SCHEMA,
                temperature=0.0,  # deterministic: this is a formatting fix, not a rewrite
            )

        # Both calls cost money whether or not the second one worked.
        merged = Completion(
            text=repair.text,
            model=repair.model,
            prompt_tokens=completion.prompt_tokens + repair.prompt_tokens,
            completion_tokens=completion.completion_tokens + repair.completion_tokens,
            cost_usd=round(completion.cost_usd + repair.cost_usd, 6),
            latency_ms=completion.latency_ms + repair.latency_ms,
        )

        try:
            script = parse_script(repair.text)
        except ServiceError:
            metrics.increment("asw_output_validation_failures_total", {"recovered": "false"})
            raise

        metrics.increment("asw_output_validation_failures_total", {"recovered": "true"})
        return script, merged, True

    async def _retrieve(self, brief: dict, user_id: str | None, correlation_id: str, phases: dict) -> RetrievalResult:
        if not settings.retrieval_enabled:
            # The same empty-context path that runs when nothing clears the
            # threshold. Generation has never depended on retrieval succeeding,
            # so switching it off is a configuration change, not a code path.
            return RetrievalResult()

        with Phase(phases, "retrieval"):
            return await self._retriever.retrieve(
                build_retrieval_query(brief), user_id=user_id, correlation_id=correlation_id
            )

    def _finish(self, script, brief, retrieval, usage, repaired, phases, kind) -> GenerationOutcome:
        checks = run_structural_checks(script, brief)

        metrics.record_usage(
            model=usage.model,
            kind=kind,
            prompt_tokens=usage.prompt_tokens,
            completion_tokens=usage.completion_tokens,
            cost_usd=usage.cost_usd,
        )
        metrics.increment("asw_generation_requests_total", {
            "kind": kind, "platform": brief["platform"], "contentType": brief["contentType"]
        })
        metrics.observe("asw_retrieval_chunks", len(retrieval.chunks))
        if retrieval.is_empty:
            metrics.increment("asw_retrieval_empty_total")

        return GenerationOutcome(
            script=script, retrieval=retrieval, checks=checks,
            usage=usage, repaired=repaired, phases=phases
        )

    async def generate(
        self, *, brief: dict, profile: dict | None, user_id: str | None,
        correlation_id: str, temperature: float | None = None, kind: str = "generate"
    ) -> GenerationOutcome:
        phases: dict[str, int] = {}

        retrieval = await self._retrieve(brief, user_id, correlation_id, phases)

        with Phase(phases, "prompt"):
            user = build_generation_prompt(brief=brief, profile=profile, chunks=retrieval.chunks)

        script, usage, repaired = await self._complete_and_validate(
            system=SYSTEM_PROMPT, user=user, temperature=temperature, phases=phases
        )
        return self._finish(script, brief, retrieval, usage, repaired, phases, kind)

    async def improve(
        self, *, brief: dict, script: dict, profile: dict | None,
        improvement_type: str, instruction: str | None, correlation_id: str
    ) -> GenerationOutcome:
        phases: dict[str, int] = {}

        with Phase(phases, "prompt"):
            user = build_improvement_prompt(
                improvement_type=improvement_type, instruction=instruction,
                brief=brief, script=script, profile=profile
            )

        # Low temperature: an improvement is a scoped edit. Sampling freely is
        # how "improve the hook" comes back with four other sections rewritten.
        result, usage, repaired = await self._complete_and_validate(
            system=SYSTEM_PROMPT, user=user, temperature=0.3, phases=phases
        )
        return self._finish(result, brief, RetrievalResult(), usage, repaired, phases, "improve")

    async def variations(
        self, *, brief: dict, profile: dict | None, user_id: str | None,
        correlation_id: str, count: int
    ) -> list[GenerationOutcome]:
        """N completions from a *single* retrieval pass.

        Re-retrieving per variation would cost N times as much to produce the
        same context set, since the brief has not changed.
        """
        phases: dict[str, int] = {}
        retrieval = await self._retrieve(brief, user_id, correlation_id, phases)

        outcomes: list[GenerationOutcome] = []
        for index in range(count):
            with Phase(phases, "prompt"):
                user = build_generation_prompt(
                    brief=brief, profile=profile, chunks=retrieval.chunks,
                    variation_note=variation_note(index),
                )
            script, usage, repaired = await self._complete_and_validate(
                system=SYSTEM_PROMPT, user=user, temperature=0.9, phases=dict(phases)
            )
            outcomes.append(
                self._finish(script, brief, retrieval, usage, repaired, dict(phases), "variation")
            )

        return outcomes
