import mongoose from 'mongoose'
import { randomUUID } from 'node:crypto'
import { GENERATION_KINDS, IMPROVEMENT_TYPES, GENERATION_STATUS } from './constants.js'

/**
 * Append-only. A regeneration never overwrites the record of the generation
 * before it, because this history *is* the quality dataset (spec 7.4).
 *
 * A record is written with status PENDING *before* the AI service is called, so
 * every failure is attributable and every retry is safe.
 */
const generationSchema = new mongoose.Schema({
  generationId: { type: String, required: true, unique: true, default: () => `g_${randomUUID().slice(0, 8)}` },
  userId: { type: String, required: true, index: true },
  scriptId: { type: String, required: true, index: true },
  correlationId: { type: String, required: true },
  kind: { type: String, enum: GENERATION_KINDS, required: true },
  improvementType: { type: String, enum: IMPROVEMENT_TYPES, default: null },

  // Brief plus a *snapshot* of the profile as it was at generation time. Without
  // the snapshot a script generated in W5 is unexplainable in W11, because the
  // profile that produced it no longer exists (spec 7.1).
  inputContext: { type: mongoose.Schema.Types.Mixed, default: {} },

  // The retrieval trace: what a bad script is diagnosed with. Tells you whether
  // the prompt, the retrieval, or the model was at fault.
  retrievedChunkIds: { type: [String], default: [] },
  retrievalScores: { type: [Number], default: [] },
  usedCreatorKnowledge: { type: Boolean, default: false },

  model: { type: String, default: null },
  promptTokens: { type: Number, default: 0 },
  completionTokens: { type: Number, default: 0 },
  costUsd: { type: Number, default: 0 },
  latencyMs: { type: Number, default: 0 },

  status: { type: String, enum: GENERATION_STATUS, default: 'PENDING' },
  errorCode: { type: String, default: null }
}, { timestamps: { createdAt: 'createdAt', updatedAt: false } })

// Generation history of one script.
generationSchema.index({ scriptId: 1, createdAt: -1 })
// Activity chart and success-rate aggregation.
generationSchema.index({ userId: 1, createdAt: -1 })
// Failure-rate alerting.
generationSchema.index({ status: 1, createdAt: -1 })

export const Generation = mongoose.model('Generation', generationSchema)
