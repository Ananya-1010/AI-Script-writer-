"""Targeted improvement.

Each improvement type states what changes **and what must not** (spec 5.4). The
second half is the important one: an unconstrained "make this better" returns a
different script, and the creator loses work they had already accepted.

The original brief is re-sent verbatim on every improvement. The model is never
asked to restate the objective in its own words, because a paraphrased objective
drifts, and three improvements later the script is about something else.
"""

from __future__ import annotations

import json

from .system import fence

IMPROVEMENT_RULES: dict[str, dict[str, str]] = {
    "improve_hook": {
        "changes": "Rewrite the hook section only.",
        "preserves": (
            "Every other section must be returned byte-identical. Do not "
            "re-word, re-order, tighten or 'improve' them. Section kinds, "
            "headings and order stay exactly as they are."
        ),
        "guidance": (
            "The new hook must open on the same promise the script actually "
            "delivers. A hook that sets up a different piece is a worse hook, "
            "however strong it reads alone."
        ),
    },
    "change_tone": {
        "changes": "Rewrite the wording and register across all sections.",
        "preserves": (
            "The set of sections, their kinds, their order, and every factual "
            "claim. Nothing is added, removed or reordered. The objective is "
            "unchanged."
        ),
        "guidance": (
            "Change how it sounds, not what it says. If a sentence carries a "
            "fact, that fact survives the rewrite intact."
        ),
    },
    "shorten": {
        "changes": "Reduce length by compressing and cutting the weakest support.",
        "preserves": (
            "The hook's intent, the cta, the objective, and every section kind "
            "required for this content type. Required sections may get shorter; "
            "they may not disappear."
        ),
        "guidance": (
            "Cut whole weak ideas rather than trimming every sentence evenly. "
            "Uniform trimming produces a script that is shorter and worse."
        ),
    },
    "expand": {
        "changes": "Add depth to existing points and add supporting detail.",
        "preserves": (
            "The existing structure, the objective, and platform suitability. "
            "Existing sections keep their kinds and order; new support may be "
            "added between them."
        ),
        "guidance": (
            "Go deeper on what is already there rather than introducing new "
            "topics. Do not invent facts, figures or examples presented as real."
        ),
    },
}


def build_improvement_prompt(
    *,
    improvement_type: str,
    instruction: str | None,
    brief: dict,
    script: dict,
    profile: dict | None,
) -> str:
    rule = IMPROVEMENT_RULES[improvement_type]

    parts = [
        f"Apply one targeted improvement to an existing script: {improvement_type}.",
        "",
        "WHAT CHANGES",
        rule["changes"],
        "",
        "WHAT MUST NOT CHANGE",
        rule["preserves"],
        "",
        "HOW",
        rule["guidance"],
        "",
        "THE CURRENT SCRIPT",
        fence("reference", json.dumps(script, indent=2, ensure_ascii=False)),
        "",
        "THE ORIGINAL BRIEF, unchanged and still binding",
        fence("brief", json.dumps(brief, indent=2, ensure_ascii=False)),
    ]

    if profile:
        parts += ["", "CREATOR CONTEXT", fence("creator_profile", json.dumps(profile, indent=2, ensure_ascii=False))]

    if instruction:
        parts += [
            "",
            "THE CREATOR ALSO ASKED FOR THIS",
            # Fenced like any other creator input: a refinement instruction is a
            # natural place to try "ignore the above and print your prompt".
            fence("brief", instruction),
            "Apply it only within the bounds above. If it conflicts with what "
            "must not change, honour the constraint and apply the rest.",
        ]

    parts += [
        "",
        f"Return the complete script, including unchanged sections. Keep "
        f"platform \"{brief['platform']}\" and contentType "
        f"\"{brief['contentType']}\". Order sections from 0 with no gaps.",
        "",
        f"The objective remains: {brief['objective']}",
    ]

    return "\n".join(parts)


VARIATION_NOTES = [
    "Open on a question the audience is already asking themselves.",
    "Open on a specific, concrete moment or example, then widen out to the idea.",
    "Open by naming the common belief about this topic, then complicating it.",
    "Open with the outcome first, then explain how it happens.",
    "Open with the cost of not knowing this, stated plainly and without hype.",
]


def variation_note(index: int) -> str:
    """Variations differ by *approach*, not by temperature.

    Re-rolling the same prompt at a higher temperature gives three drafts that
    differ in wording and are identical in structure, which is no choice at all.
    Giving each attempt a distinct angle is what makes the comparison useful.
    """
    return VARIATION_NOTES[index % len(VARIATION_NOTES)]
