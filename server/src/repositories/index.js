import { User, CreatorProfile, Script, KnowledgeDocument, Generation, Evaluation } from '../models/index.js'
import { createScopedRepository } from './scopedRepository.js'

/**
 * Users are the one collection that is not scoped *by* a userId — it is where
 * userId comes from. Everything it exposes is deliberately narrow.
 */
export const userRepository = {
  findByEmail: (email) => User.findOne({ email: email.toLowerCase() }).select('+passwordHash').lean(),
  findByUserId: (userId) => User.findOne({ userId }).lean(),
  existsByEmail: (email) => User.exists({ email: email.toLowerCase() }),

  async create ({ name, email, passwordHash }) {
    const user = await User.create({ name, email, passwordHash })
    return user.toObject()
  },

  recordLoginSuccess: (userId) =>
    User.updateOne(
      { userId },
      { $set: { 'authMetadata.lastLoginAt': new Date(), 'authMetadata.failedAttempts': 0, 'authMetadata.lockedUntil': null } }
    ),

  /** Repeated failed logins are rate-limited and recorded (spec 9.1). */
  recordLoginFailure: (userId, lockedUntil) =>
    User.updateOne(
      { userId },
      { $inc: { 'authMetadata.failedAttempts': 1 }, ...(lockedUntil ? { $set: { 'authMetadata.lockedUntil': lockedUntil } } : {}) }
    )
}

export const profileRepository = createScopedRepository(CreatorProfile, { idField: 'userId' })
export const scriptRepository = createScopedRepository(Script, { idField: 'scriptId', softDelete: true })
export const knowledgeRepository = createScopedRepository(KnowledgeDocument, { idField: 'documentId' })
export const generationRepository = createScopedRepository(Generation, { idField: 'generationId' })
export const evaluationRepository = createScopedRepository(Evaluation, { idField: 'evaluationId' })
