import mongoose from 'mongoose'
import { randomUUID } from 'node:crypto'
import { PLATFORMS, CONTENT_TYPES, SECTION_KINDS, SCRIPT_STATUS } from './constants.js'

/**
 * authoredBy is what makes "the creator is the author" enforceable rather than
 * decorative (spec 9.8): the UI can always show which text the model wrote and
 * which the creator wrote.
 */
const sectionSchema = new mongoose.Schema({
  kind: { type: String, enum: SECTION_KINDS, required: true },
  heading: { type: String, default: '' },
  body: { type: String, default: '' },
  order: { type: Number, required: true },
  authoredBy: { type: String, enum: ['ai', 'creator'], default: 'ai' }
}, { _id: false })

/**
 * The brief is the objective-preservation invariant (spec 5.4). It is captured
 * once at CONTEXT_READY, stored here, and re-sent verbatim on every regenerate,
 * improve, and variation. Only the creator, through the brief form, may change it.
 */
const briefSchema = new mongoose.Schema({
  idea: { type: String, required: true },
  platform: { type: String, enum: PLATFORMS, required: true },
  contentType: { type: String, enum: CONTENT_TYPES, required: true },
  // Set only when contentType is 'custom' — the creator's own description of
  // the kind of piece, which becomes the structure spec for that generation.
  customContentType: { type: String, default: '' },
  // Optional by design. A creator who has not filled in an audience still gets
  // a script; the prompt says so explicitly rather than inventing a persona.
  // Requiring it here contradicted the zod schema, which defaults it to ''.
  audience: { type: String, default: '' },
  objective: { type: String, required: true },
  durationSeconds: { type: Number, required: true }
}, { _id: false })

const scriptSchema = new mongoose.Schema({
  scriptId: { type: String, required: true, unique: true, default: () => `s_${randomUUID().slice(0, 8)}` },
  userId: { type: String, required: true, index: true },
  title: { type: String, required: true, trim: true },
  brief: { type: briefSchema, required: true },
  generatedContent: {
    title: { type: String, default: '' },
    sections: { type: [sectionSchema], default: [] },
    estimatedDurationSeconds: { type: Number, default: 0 }
  },
  version: { type: Number, default: 0 },
  status: { type: String, enum: SCRIPT_STATUS, default: 'DRAFT' },
  lastGenerationId: { type: String, default: null },
  // Soft delete: removing a bad script must not punch a hole in the evaluation
  // dataset, so generations and evaluations survive it (spec 7.4).
  deletedAt: { type: Date, default: null }
}, { timestamps: true })

// Library list and the dashboard "recent" panel.
scriptSchema.index({ userId: 1, updatedAt: -1 })
// Dashboard breakdowns and library filters. Spec 7.3 writes these as top-level
// `platform`/`contentType`, but they live inside the brief — indexing the
// spec's paths literally would build an index on fields that do not exist.
scriptSchema.index({ userId: 1, 'brief.platform': 1, 'brief.contentType': 1 })
// Drafts vs saved counts.
scriptSchema.index({ userId: 1, status: 1 })
// Library search by title and idea.
scriptSchema.index({ title: 'text', 'brief.idea': 'text' })

export const Script = mongoose.model('Script', scriptSchema)
