import { z } from 'zod'
import { PLATFORMS } from '../models/constants.js'

const shortList = (max, itemMax) =>
  z.array(z.string().trim().min(1).max(itemMax)).max(max).default([])

/**
 * Every field here has to measurably change generated output (spec 8.3).
 *
 * Caps are not cosmetic: this object is serialised straight into the prompt, so
 * an unbounded profile is an unbounded prompt, and an unbounded prompt is an
 * unbounded bill. Prompt size is capped before any provider call (spec 9.4).
 */
export const profileSchema = z.object({
  niche: z.string().trim().max(200).default(''),
  audience: z.string().trim().max(300).default(''),
  tone: shortList(6, 40),
  preferredPlatforms: z.array(z.enum(PLATFORMS)).max(PLATFORMS.length).default([]),
  stylePreferences: z.object({
    prefer: shortList(10, 120),
    avoid: shortList(10, 120)
  }).default({ prefer: [], avoid: [] }),
  // A style reference, not content to be reused verbatim.
  sampleContent: z.array(z.string().trim().min(1).max(2000)).max(5).default([])
})
