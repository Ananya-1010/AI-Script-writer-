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
}
