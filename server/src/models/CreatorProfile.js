import mongoose from 'mongoose'
import { PLATFORMS } from './constants.js'

/**
 * The creator's context, serialised straight into prompt construction. Every
 * field here has to measurably change generated output (spec 8.3) — a field
 * whose effect cannot be explained does not belong on this model.
 */
const creatorProfileSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true, index: true },
  niche: { type: String, trim: true, default: '' },
  audience: { type: String, trim: true, default: '' },
  tone: { type: [String], default: [] },
  preferredPlatforms: { type: [String], enum: PLATFORMS, default: [] },
  stylePreferences: {
    prefer: { type: [String], default: [] },
    avoid: { type: [String], default: [] }
  },
  // A style reference, never content to be reused verbatim (spec 8.3).
  sampleContent: { type: [String], default: [] }
}, { timestamps: true })

export const CreatorProfile = mongoose.model('CreatorProfile', creatorProfileSchema)
