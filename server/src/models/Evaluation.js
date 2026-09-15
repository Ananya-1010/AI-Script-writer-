import mongoose from 'mongoose'
import { randomUUID } from 'node:crypto'

const score = { type: Number, required: true, min: 1, max: 5 }

/**
 * Pinned to a specific generationId, not to the script in general — a reviewer
 * is scoring one attempt, and the script will have several (spec 6.6).
 *
 * All six criteria are required. Partial evaluations are rejected so the
 * dataset stays comparable across generations.
 */
const evaluationSchema = new mongoose.Schema({
  evaluationId: { type: String, required: true, unique: true, default: () => `e_${randomUUID().slice(0, 8)}` },
  userId: { type: String, required: true, index: true },
  scriptId: { type: String, required: true, index: true },
  generationId: { type: String, required: true, index: true },

  relevance: score,
  structure: score,
  platformSuitability: score,
  audienceFit: score,
  // The criterion that matters most: the only one a general-purpose chatbot
  // cannot score well on. If it stays low, the product has no differentiator.
  voiceConsistency: score,
  usefulness: score,

  humanRating: { type: Number, required: true, min: 1, max: 5 },
  feedback: { type: String, default: '' }
}, { timestamps: { createdAt: 'createdAt', updatedAt: false } })

// Quality trend over time: the W9 baseline against W11.
evaluationSchema.index({ createdAt: -1 })

export const Evaluation = mongoose.model('Evaluation', evaluationSchema)
