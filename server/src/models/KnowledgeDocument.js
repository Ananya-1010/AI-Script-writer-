import mongoose from 'mongoose'
import { randomUUID } from 'node:crypto'
import { KNOWLEDGE_CATEGORIES, KNOWLEDGE_STATUS } from './constants.js'

const knowledgeDocumentSchema = new mongoose.Schema({
  documentId: { type: String, required: true, unique: true, default: () => `k_${randomUUID().slice(0, 8)}` },
  // null means curated: the shared corpus, which contains no creator content
  // by construction and is the only knowledge every creator can retrieve.
  userId: { type: String, default: null, index: true },
  title: { type: String, required: true, trim: true },
  category: { type: String, enum: KNOWLEDGE_CATEGORIES.concat('curated'), required: true },
  content: { type: String, required: true },
  source: { type: String, default: 'manual' },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  chunkIds: { type: [String], default: [] },
  // DELETE_PENDING exists so a failed chunk deletion is retried rather than
  // leaving orphaned embeddings that stay retrievable (spec 6.5).
  status: { type: String, enum: KNOWLEDGE_STATUS, default: 'PENDING' }
}, { timestamps: true })

knowledgeDocumentSchema.index({ userId: 1, category: 1 })

export const KnowledgeDocument = mongoose.model('KnowledgeDocument', knowledgeDocumentSchema)
