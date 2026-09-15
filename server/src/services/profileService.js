import { notFound } from '../errors.js'
import { profileRepository } from '../repositories/index.js'

const present = (profile) => ({
  niche: profile.niche ?? '',
  audience: profile.audience ?? '',
  tone: profile.tone ?? [],
  preferredPlatforms: profile.preferredPlatforms ?? [],
  stylePreferences: {
    prefer: profile.stylePreferences?.prefer ?? [],
    avoid: profile.stylePreferences?.avoid ?? []
  },
  sampleContent: profile.sampleContent ?? [],
  updatedAt: profile.updatedAt
})

export const profileService = {
  async get (userId) {
    const profile = await profileRepository.findOne(userId)
    // 404 when absent rather than an empty object, so the client can tell
    // "never set up" from "set up and left blank" (spec 6.2).
    if (!profile) throw notFound('No creator profile yet.')
    return present(profile)
  },

  /**
   * Upsert semantics. Profile changes affect subsequent generations only — they
   * never rewrite an existing saved script, which is why generations store a
   * profile snapshot at the time they ran (spec 6.2, 7.1).
   */
  async save (userId, patch) {
    const profile = await profileRepository.upsert(userId, patch)
    return present(profile)
  },

  /**
   * The profile as the prompt builder consumes it. Kept here rather than in the
   * AI service because it is a product decision — which fields describe a
   * creator — not a prompting decision.
   *
   * Returns null when there is nothing meaningful to say. Null is a valid input
   * to generation: the product must work for a creator with no profile at all
   * (BR-012), and sending an object of empty strings would spend tokens telling
   * the model nothing.
   */
  async forPrompt (userId) {
    const profile = await profileRepository.findOne(userId)
    if (!profile) return null

    const serialised = {
      niche: profile.niche || null,
      audience: profile.audience || null,
      tone: profile.tone?.length ? profile.tone : null,
      prefer: profile.stylePreferences?.prefer?.length ? profile.stylePreferences.prefer : null,
      avoid: profile.stylePreferences?.avoid?.length ? profile.stylePreferences.avoid : null,
      styleExamples: profile.sampleContent?.length ? profile.sampleContent : null
    }

    const meaningful = Object.fromEntries(
      Object.entries(serialised).filter(([, value]) => value !== null)
    )
    return Object.keys(meaningful).length > 0 ? meaningful : null
  }
}
