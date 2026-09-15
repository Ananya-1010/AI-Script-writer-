import { AppError } from '../errors.js'
import { aiClient } from './aiClient.js'
import { scriptService } from './scriptService.js'
import { profileService } from './profileService.js'
import { scriptRepository, generationRepository } from '../repositories/index.js'
import { Generation } from '../models/index.js'
import { config } from '../config/index.js'
import { logger } from '../utils/logger.js'

/**
 * Orchestration only. Node decides *whether* to generate; Python decides *how*.
 *
 * The invariant this file exists to hold: a generation record is written before
 * the AI service is called and updated after, so every failure is attributable
 * and no failure can corrupt a saved script.
 */

async function enforceQuota (userId) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const today = await Generation.countDocuments({ userId, createdAt: { $gte: since } })

  if (today >= config.quota.perDay) {
    // Unbounded generation is both a denial-of-service surface and a direct
    // financial loss, since every call costs real money (spec 9.4).
    throw new AppError('QUOTA_EXCEEDED', 'You have reached today\'s generation limit. Try again tomorrow.')
  }
}

async function openRecord (userId, script, { kind, improvementType, correlationId, profile }) {
  return generationRepository.create(userId, {
    scriptId: script.scriptId,
    correlationId,
    kind,
    improvementType: improvementType ?? null,
    // A snapshot, not a reference. The profile can change; without this, a
    // script generated today is unexplainable in eight weeks (spec 7.1).
    inputContext: { brief: script.brief, profile },
    status: 'PENDING'
  })
}

async function closeRecord (generationId, result) {
  // A variations response carries aggregate usage at the top and per-variation
  // detail inside. One retrieval pass produced them all, so the first
  // variation's trace is the trace for the whole request.
  const head = result.variations?.[0] ?? result
  const usage = result.usage ?? head.usage ?? {}

  await Generation.updateOne({ generationId }, {
    $set: {
      status: 'SUCCESS',
      retrievedChunkIds: head.retrieval?.chunkIds ?? [],
      retrievalScores: head.retrieval?.scores ?? [],
      usedCreatorKnowledge: head.retrieval?.usedCreatorKnowledge ?? false,
      model: head.model ?? null,
      promptTokens: usage.promptTokens ?? 0,
      completionTokens: usage.completionTokens ?? 0,
      costUsd: usage.costUsd ?? 0,
      latencyMs: head.latencyMs ?? 0
    }
  })
}

async function failRecord (generationId, err) {
  // A FAILED record, and the previously saved script left exactly as it was.
  // Retry is always safe because of this (spec 5.7).
  await Generation.updateOne({ generationId }, {
    $set: { status: 'FAILED', errorCode: err.code ?? 'GENERATION_FAILED' }
  })
}

async function run (userId, scriptId, ctx, { kind, improvementType, call }) {
  await enforceQuota(userId)

  const script = await scriptRepository.findByIdOrFail(userId, scriptId)
  const profile = await profileService.forPrompt(userId)

  const record = await openRecord(userId, script, {
    kind, improvementType, correlationId: ctx.correlationId, profile
  })

  try {
    const result = await call({ script, profile })
    await closeRecord(record.generationId, result)

    logger.info('generation_succeeded', {
      correlationId: ctx.correlationId,
      generationId: record.generationId,
      scriptId,
      kind,
      costUsd: result.usage?.costUsd,
      latencyMs: result.latencyMs,
      repaired: result.repaired,
      retrievalEnabled: result.retrieval?.enabled
    })

    return { record, script, result }
  } catch (err) {
    await failRecord(record.generationId, err)
    logger.warn('generation_failed', {
      correlationId: ctx.correlationId,
      generationId: record.generationId,
      scriptId,
      kind,
      errorCode: err.code ?? 'GENERATION_FAILED'
    })
    throw err
  }
}

const briefFor = (script) => ({
  idea: script.brief.idea,
  platform: script.brief.platform,
  contentType: script.brief.contentType,
  audience: script.brief.audience ?? '',
  objective: script.brief.objective,
  durationSeconds: script.brief.durationSeconds
})

export const generationService = {
  async generate (userId, scriptId, { temperature }, ctx, { kind = 'generate' } = {}) {
    const { record, result } = await run(userId, scriptId, ctx, {
      kind,
      call: ({ script, profile }) => aiClient.generate({
        correlationId: ctx.correlationId,
        userId,
        brief: briefFor(script),
        profile,
        temperature
      }, ctx)
    })

    const saved = await scriptService.applyGeneration(userId, scriptId, {
      script: result.script,
      generationId: record.generationId
    })

    return {
      generationId: record.generationId,
      script: saved.script,
      version: saved.version,
      status: saved.status,
      retrieval: result.retrieval,
      checks: result.checks,
      usage: result.usage,
      latencyMs: result.latencyMs
    }
  },

  regenerate (userId, scriptId, options, ctx) {
    // Same path, same stored brief, re-sent unchanged. The objective is not
    // re-derived, re-phrased, or taken from anywhere but the script.
    return this.generate(userId, scriptId, options, ctx, { kind: 'regenerate' })
  },

  async improve (userId, scriptId, { type, instruction }, ctx) {
    const { record, result } = await run(userId, scriptId, ctx, {
      kind: 'improve',
      improvementType: type,
      call: ({ script, profile }) => aiClient.improve({
        correlationId: ctx.correlationId,
        userId,
        brief: briefFor(script),
        script: script.generatedContent,
        profile,
        type,
        instruction
      }, ctx)
    })

    const saved = await scriptService.applyGeneration(userId, scriptId, {
      script: result.script,
      generationId: record.generationId
    })

    return {
      generationId: record.generationId,
      script: saved.script,
      version: saved.version,
      changed: result.changed,
      preserved: result.preserved,
      checks: result.checks,
      usage: result.usage
    }
  },

  /**
   * Variations are not persisted. They are candidates, and an unadopted
   * variation must not linger as a phantom draft (spec 8.3) — the creator
   * adopts one with a normal save, and the rest are discarded.
   */
  async variations (userId, scriptId, { count }, ctx) {
    const { record, result } = await run(userId, scriptId, ctx, {
      kind: 'variation',
      call: ({ script, profile }) => aiClient.variations({
        correlationId: ctx.correlationId,
        userId,
        brief: briefFor(script),
        profile,
        count
      }, ctx)
    })

    return {
      generationId: record.generationId,
      variations: result.variations.map((v) => ({
        variationId: v.variationId,
        script: v.script,
        checks: v.checks
      })),
      usage: result.usage
    }
  }
}
