"""Output validation and the automated structural checks.

Two different questions, deliberately kept apart (spec 10):

- **Is it valid?** Does it parse, does it match the schema. Mechanical, and a
  failure here means the creator must not see it. Handled by `parse_script`.
- **Is it well formed for this brief?** Required sections present, length in
  range, platform reflected. These are *reported*, not enforced — a script
  missing a transition is still usable, and blocking it would trade a real draft
  for a typed error. Handled by `run_structural_checks`.

Conflating the two is how a project ends up either surfacing broken drafts or
rejecting usable ones.
"""

from __future__ import annotations

import json
import logging
import re

from pydantic import ValidationError

from ..errors import ServiceError
from ..prompts.script_prompt import WORDS_PER_MINUTE
from .schema import REQUIRED_SECTIONS, ContentType, SectionKind, StructuredScript

log = logging.getLogger("ai-service.validator")

# Models sometimes wrap JSON in a markdown fence despite being asked not to.
# Recovering from that here is cheaper and more reliable than spending a repair
# round trip on a response that is otherwise perfect.
_FENCE = re.compile(r"^\s*```(?:json)?\s*(.*?)\s*```\s*$", re.DOTALL)

# Fragments that would mean the system prompt leaked into the output.
_LEAK_MARKERS = (
    "WHAT YOU NEVER DO",
    "UNTRUSTED INPUT",
    "STRUCTURE FOR THIS CONTENT TYPE",
    "<brief>",
    "<creator_profile>",
    "<reference>",
)


def parse_script(raw: str) -> StructuredScript:
    """Raw model text to a validated script, or a typed error. Never both."""
    text = raw.strip()

    fenced = _FENCE.match(text)
    if fenced:
        text = fenced.group(1)

    try:
        payload = json.loads(text)
    except json.JSONDecodeError as exc:
        raise ServiceError(
            "MALFORMED_LLM_OUTPUT", "The generated script could not be read."
        ) from exc

    try:
        return StructuredScript.model_validate(payload)
    except ValidationError as exc:
        # The validation detail is logged, never returned: it can quote model
        # output, which can quote the prompt.
        log.info("schema_validation_failed", extra={"errors": exc.error_count()})
        raise ServiceError(
            "MALFORMED_LLM_OUTPUT", "The generated script was not in the expected format."
        ) from exc


def repair_instruction(previous: str) -> str:
    """The single bounded re-ask made when validation fails.

    Deliberately short and mechanical. Re-explaining the whole task invites a
    different script; this asks for the same content in the right shape.
    """
    return (
        "Your previous response was not valid JSON matching the required schema. "
        "Return the same script content again as a single JSON object and nothing "
        "else: no markdown fences, no commentary. Every section needs kind, "
        "heading, body and order. Order must start at 0 with no gaps.\n\n"
        "Your previous response was:\n" + previous[:2000]
    )


def run_structural_checks(script: StructuredScript, brief: dict) -> dict:
    """Runs on every generation, in production and against fixtures in CI.

    Checks validity for the brief, not quality. Quality is the six-criterion
    human evaluation, and no automated check substitutes for it.
    """
    kinds = [section.kind for section in script.sections]
    content_type = ContentType(brief["contentType"])
    required = REQUIRED_SECTIONS[content_type]

    missing = sorted(k.value for k in required["kinds"] if k not in kinds)
    point_count = kinds.count(SectionKind.point)

    requested = int(brief["durationSeconds"])
    words = sum(len(section.body.split()) for section in script.sections)
    actual_seconds = round(words / WORDS_PER_MINUTE * 60)

    # Generous band. Spoken pace varies by more than this between creators, so a
    # tighter tolerance would flag scripts that are perfectly usable.
    within_duration = 0.5 * requested <= actual_seconds <= 1.5 * requested

    body = " ".join(section.body for section in script.sections)
    leaked = [marker for marker in _LEAK_MARKERS if marker in body]

    checks = {
        "requiredSectionsPresent": not missing and point_count >= required["min_points"],
        "missingSections": missing,
        "notEmpty": all(section.body.strip() for section in script.sections) and bool(script.title.strip()),
        "withinDurationTolerance": within_duration,
        "estimatedWords": words,
        "estimatedSeconds": actual_seconds,
        "platformReflected": script.platform.value == brief["platform"],
        "contentTypeReflected": script.content_type.value == brief["contentType"],
        "noPromptLeakage": not leaked,
    }

    if leaked:
        # A leak is a prompt defect and a security signal, not a content problem.
        log.warning("prompt_leakage_detected", extra={"markers": len(leaked)})

    return checks
