import { z } from 'zod'
import {
  PLATFORMS, CONTENT_TYPES, SECTION_KINDS, IMPROVEMENT_TYPES,
  PLATFORM_DURATION_SECONDS, SCRIPT_STATUS
} from '../models/constants.js'

/**
 * The brief. Validated here before anything is created, because the objective
 * captured at this moment becomes an invariant for the life of the script.
 */
export const briefSchema = z.object({
  idea: z.string().trim().min(10, 'needs at least a sentence').max(5000),
  platform: z.enum(PLATFORMS),
  contentType: z.enum(CONTENT_TYPES),
  audience: z.string().trim().max(500).default(''),
  objective: z.string().trim().min(3, 'is required').max(500),
  durationSeconds: z.number().int().positive()
}).superRefine((brief, ctx) => {
  // Duration is bounded by platform, so an impossible brief cannot be submitted
  // (spec 8.3) — a 40-minute Reel is not a generation the model should be asked
  // to attempt, and failing here costs nothing.
  const bounds = PLATFORM_DURATION_SECONDS[brief.platform]
  if (!bounds) return

  if (brief.durationSeconds < bounds.min || brief.durationSeconds > bounds.max) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['durationSeconds'],
      message: `for ${brief.platform} must be between ${bounds.min} and ${bounds.max} seconds`
    })
  }
})

export const createScriptSchema = z.object({
  title: z.string().trim().min(1).max(200)
}).and(briefSchema)

/** Sections the creator edited. Marked user-authored on save. */
const sectionPatchSchema = z.object({
  order: z.number().int().min(0),
  kind: z.enum(SECTION_KINDS).optional(),
  heading: z.string().max(200).optional(),
  body: z.string().max(20000).optional()
})

export const updateScriptSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  sections: z.array(sectionPatchSchema).max(40).optional(),
  status: z.enum(SCRIPT_STATUS).optional(),
  /**
   * The version the creator edited from.
   *
   * Spec 6.3 has no version field in the PUT body, yet 6.9 promises a 409
   * VERSION_CONFLICT and TEST-016 requires concurrent saves to conflict. Neither
   * is possible without knowing what the client started from — so it is added
   * here. Optional, because a client that does not care about conflicts should
   * not be forced to track it.
   */
  version: z.number().int().min(0).optional()
})

export const listScriptsSchema = z.object({
  q: z.string().trim().max(200).optional(),
  platform: z.enum(PLATFORMS).optional(),
  contentType: z.enum(CONTENT_TYPES).optional(),
  status: z.enum(SCRIPT_STATUS).optional(),
  sort: z.enum(['-updatedAt', 'updatedAt', '-createdAt', 'createdAt']).default('-updatedAt'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
})

export const generateSchema = z.object({
  options: z.object({
    temperature: z.number().min(0).max(2).optional()
  }).optional()
})

export const improveSchema = z.object({
  type: z.enum(IMPROVEMENT_TYPES),
  instruction: z.string().trim().max(1000).optional()
})

export const variationsSchema = z.object({
  count: z.number().int().min(2).max(4).default(3)
})

export const evaluationSchema = z.object({
  generationId: z.string().min(1),
  scores: z.object({
    relevance: z.number().int().min(1).max(5),
    structure: z.number().int().min(1).max(5),
    platformSuitability: z.number().int().min(1).max(5),
    audienceFit: z.number().int().min(1).max(5),
    voiceConsistency: z.number().int().min(1).max(5),
    usefulness: z.number().int().min(1).max(5)
  }),
  humanRating: z.number().int().min(1).max(5),
  feedback: z.string().trim().max(2000).default('')
})
