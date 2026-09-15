"""Metrics, in Prometheus text format, with no client library.

The set is deliberately small and matches spec 12.2. Two of these carry unusual
product weight:

- `asw_retrieval_creator_knowledge_ratio` falling toward zero means the product
  is drifting back into being a generic chat wrapper. That is the risk in spec
  1.8, and this is the number that catches it before a human notices.
- `asw_improvement_requests_total{type="improve_hook"}` rising means the first
  generation's hooks are weak. That is a prompt defect, not a user preference.

Cost is recorded per generation even on a free tier, because "what would this
have cost" is what tells us whether the design is affordable before it is billed.
"""

from __future__ import annotations

import threading
from collections import defaultdict

_lock = threading.Lock()

_counters: dict[tuple[str, tuple[tuple[str, str], ...]], float] = defaultdict(float)
_histograms: dict[tuple[str, tuple[tuple[str, str], ...]], list[float]] = defaultdict(list)

_HELP = {
    "asw_generation_requests_total": "Generation requests by kind, platform, content type.",
    "asw_generation_errors_total": "Failed generations by error code.",
    "asw_generation_latency_seconds": "End-to-end generation latency.",
    "asw_generation_phase_seconds": "Latency per phase: retrieval, prompt, provider, validation.",
    "asw_retrieval_chunks": "Chunks returned per generation after threshold and top-k.",
    "asw_retrieval_empty_total": "Generations that proceeded with no context above threshold.",
    "asw_retrieval_creator_knowledge_ratio": "Share of generations using creator knowledge.",
    "asw_llm_tokens_total": "Tokens consumed by direction and model.",
    "asw_llm_cost_total": "Provider spend by model and request kind.",
    "asw_output_validation_failures_total": "Schema validation failures, by whether repair recovered.",
}


def _key(name: str, labels: dict[str, str] | None):
    return name, tuple(sorted((labels or {}).items()))


def increment(name: str, labels: dict[str, str] | None = None, value: float = 1.0) -> None:
    with _lock:
        _counters[_key(name, labels)] += value


def observe(name: str, value: float, labels: dict[str, str] | None = None) -> None:
    with _lock:
        _histograms[_key(name, labels)].append(value)


def record_usage(*, model: str, kind: str, prompt_tokens: int, completion_tokens: int, cost_usd: float) -> None:
    """One call per provider round trip, so token and cost accounting can never
    drift from the calls that actually happened."""
    increment("asw_llm_tokens_total", {"direction": "prompt", "model": model}, prompt_tokens)
    increment("asw_llm_tokens_total", {"direction": "completion", "model": model}, completion_tokens)
    increment("asw_llm_cost_total", {"model": model, "kind": kind}, cost_usd)


def _format_labels(labels: tuple[tuple[str, str], ...]) -> str:
    if not labels:
        return ""
    inner = ",".join(f'{k}="{v}"' for k, v in labels)
    return "{" + inner + "}"


def render() -> str:
    """Prometheus exposition. Histograms are exposed as count/sum/max rather
    than buckets: enough to see p-ish behaviour and drift without inventing a
    bucket layout we would have to maintain."""
    lines: list[str] = []
    seen: set[str] = set()

    with _lock:
        for (name, labels), value in sorted(_counters.items()):
            if name not in seen and name in _HELP:
                lines.append(f"# HELP {name} {_HELP[name]}")
                lines.append(f"# TYPE {name} counter")
                seen.add(name)
            lines.append(f"{name}{_format_labels(labels)} {value}")

        for (name, labels), values in sorted(_histograms.items()):
            if not values:
                continue
            if name not in seen and name in _HELP:
                lines.append(f"# HELP {name} {_HELP[name]}")
                lines.append(f"# TYPE {name} summary")
                seen.add(name)
            tags = _format_labels(labels)
            lines.append(f"{name}_count{tags} {len(values)}")
            lines.append(f"{name}_sum{tags} {sum(values)}")
            lines.append(f"{name}_max{tags} {max(values)}")

    return "\n".join(lines) + "\n"


def reset() -> None:
    with _lock:
        _counters.clear()
        _histograms.clear()
