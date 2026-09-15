/** Shared vocabulary. The Python service mirrors these in generation/schema.py. */

export const PLATFORMS = ['youtube', 'reels', 'tiktok', 'linkedin', 'shorts', 'podcast']

export const CONTENT_TYPES = [
  'educational',
  'promotional',
  'storytelling',
  'product_brand',
  'short_form'
]

/** The permitted set is fixed; which kinds are *required* varies by content type. */
export const SECTION_KINDS = [
  'hook', 'intro', 'point', 'story', 'support', 'transition', 'cta', 'visual_cue'
]

/**
 * The output contract the automated structural checks assert against (spec 10.3).
 * A 30s Reel needs a hook and a CTA. A long-form educational YouTube script also
 * needs an intro, at least two points, and a transition.
 */
export const REQUIRED_SECTIONS = {
  short_form: { kinds: ['hook', 'cta'], minPoints: 0 },
  educational: { kinds: ['hook', 'intro', 'point', 'transition', 'cta'], minPoints: 2 },
  promotional: { kinds: ['hook', 'point', 'cta'], minPoints: 1 },
  storytelling: { kinds: ['hook', 'story', 'cta'], minPoints: 0 },
  product_brand: { kinds: ['hook', 'point', 'cta'], minPoints: 1 }
}

/** Duration bounds per platform, so an impossible brief cannot be submitted (spec 8.3). */
export const PLATFORM_DURATION_SECONDS = {
  reels: { min: 15, max: 90 },
  tiktok: { min: 15, max: 180 },
  shorts: { min: 15, max: 60 },
  youtube: { min: 60, max: 3600 },
  linkedin: { min: 30, max: 600 },
  podcast: { min: 300, max: 7200 }
}

export const SCRIPT_STATUS = ['DRAFT', 'SCRIPT_READY', 'SAVED']
export const GENERATION_KINDS = ['generate', 'regenerate', 'improve', 'variation']
export const IMPROVEMENT_TYPES = ['improve_hook', 'change_tone', 'shorten', 'expand']
export const GENERATION_STATUS = ['PENDING', 'SUCCESS', 'FAILED']
export const KNOWLEDGE_CATEGORIES = [
  'previous_script', 'brand', 'product', 'style_guidelines', 'content_guidelines'
]
export const KNOWLEDGE_STATUS = ['PENDING', 'INDEXED', 'FAILED', 'DELETE_PENDING']

export const EVALUATION_CRITERIA = [
  'relevance', 'structure', 'platformSuitability', 'audienceFit', 'voiceConsistency', 'usefulness'
]
