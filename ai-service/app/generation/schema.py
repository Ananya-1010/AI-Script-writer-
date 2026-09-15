"""The output contract.

Every LLM response is validated against StructuredScript before it can reach the
client. Raw model text is never presented to the creator as a draft (spec 5.7).
These enums mirror server/src/models/constants.js — change both together.
"""

from enum import StrEnum

from pydantic import BaseModel, Field, field_validator


class Platform(StrEnum):
    youtube = "youtube"
    reels = "reels"
    tiktok = "tiktok"
    linkedin = "linkedin"
    shorts = "shorts"
    podcast = "podcast"


class ContentType(StrEnum):
    educational = "educational"
    promotional = "promotional"
    storytelling = "storytelling"
    product_brand = "product_brand"
    short_form = "short_form"
    # Escape hatch: the creator describes the kind of piece themselves and that
    # description becomes the structure spec. A closed list of five cannot cover
    # interviews, reactions, tutorials, devlogs, or whatever comes next.
    custom = "custom"


class SectionKind(StrEnum):
    hook = "hook"
    intro = "intro"
    point = "point"
    story = "story"
    support = "support"
    transition = "transition"
    cta = "cta"
    visual_cue = "visual_cue"


class ScriptSection(BaseModel):
    kind: SectionKind
    heading: str = ""
    body: str = Field(min_length=1)
    order: int = Field(ge=0)


class StructuredScript(BaseModel):
    title: str = Field(min_length=1)
    sections: list[ScriptSection] = Field(min_length=1)
    estimated_duration_seconds: int = Field(ge=0, alias="estimatedDurationSeconds")
    platform: Platform
    content_type: ContentType = Field(alias="contentType")

    model_config = {"populate_by_name": True}

    @field_validator("sections")
    @classmethod
    def order_must_be_a_clean_sequence(cls, sections: list[ScriptSection]):
        """Order is meaningful and is what the editor renders by, so it has to be
        a gap-free 0..n-1 sequence. A model that emits 0,1,2,5 would leave the
        editor guessing what belongs in the gap."""
        orders = sorted(s.order for s in sections)
        if orders != list(range(len(sections))):
            raise ValueError("section order must be a contiguous sequence starting at 0")
        return sections


# Hand-written rather than derived from the Pydantic model. Gemini's
# responseSchema accepts a restricted OpenAPI subset: no $ref, no $defs, no
# anyOf. model_json_schema() emits all three for nested models, and the request
# is rejected. Keeping it explicit also keeps the field order stable, which the
# model follows when composing its output.
#
# This is a *request* schema, a hint. StructuredScript is still the authority —
# validator.py re-validates everything that comes back.
RESPONSE_SCHEMA: dict = {
    "type": "object",
    "properties": {
        "title": {"type": "string"},
        "sections": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "kind": {"type": "string", "enum": [k.value for k in SectionKind]},
                    "heading": {"type": "string"},
                    "body": {"type": "string"},
                    "order": {"type": "integer"},
                },
                "required": ["kind", "heading", "body", "order"],
            },
        },
        "estimatedDurationSeconds": {"type": "integer"},
        "platform": {"type": "string", "enum": [p.value for p in Platform]},
        "contentType": {"type": "string", "enum": [c.value for c in ContentType]},
    },
    "required": ["title", "sections", "estimatedDurationSeconds", "platform", "contentType"],
}


# Which kinds are *required* varies by content type; the permitted set does not.
# This is what the automated structural checks assert against (spec 10.3).
REQUIRED_SECTIONS: dict[ContentType, dict] = {
    ContentType.short_form: {"kinds": {SectionKind.hook, SectionKind.cta}, "min_points": 0},
    ContentType.educational: {
        "kinds": {SectionKind.hook, SectionKind.intro, SectionKind.point,
                  SectionKind.transition, SectionKind.cta},
        "min_points": 2,
    },
    ContentType.promotional: {
        "kinds": {SectionKind.hook, SectionKind.point, SectionKind.cta}, "min_points": 1
    },
    ContentType.storytelling: {
        "kinds": {SectionKind.hook, SectionKind.story, SectionKind.cta}, "min_points": 0
    },
    ContentType.product_brand: {
        "kinds": {SectionKind.hook, SectionKind.point, SectionKind.cta}, "min_points": 1
    },
    # Deliberately the loosest contract we still call a script. We do not know
    # the shape the creator described, so asserting a structure we invented
    # would fail valid work. An opening and an ending is the floor.
    ContentType.custom: {
        "kinds": {SectionKind.hook, SectionKind.cta}, "min_points": 0
    },
}
