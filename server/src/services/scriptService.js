import { AppError, notFound } from '../errors.js'
import { scriptRepository } from '../repositories/index.js'
import { Script } from '../models/index.js'

const present = (script) => ({
  scriptId: script.scriptId,
  title: script.title,
  brief: script.brief,
  script: script.generatedContent,
  status: script.status,
  version: script.version,
  lastGenerationId: script.lastGenerationId,
  createdAt: script.createdAt,
  updatedAt: script.updatedAt
})

const summarise = (script) => ({
  scriptId: script.scriptId,
  title: script.title,
  platform: script.brief.platform,
  contentType: script.brief.contentType,
  status: script.status,
  version: script.version,
  sectionCount: script.generatedContent?.sections?.length ?? 0,
  updatedAt: script.updatedAt
})

export const scriptService = {
  async create (userId, { title, ...brief }) {
    // No generation happens here. The script exists in DRAFT with its brief, so
    // a failed generation later has something to attach to and retry against.
    const script = await scriptRepository.create(userId, { title, brief, status: 'DRAFT' })
    return present(script)
  },

  async get (userId, scriptId) {
    return present(await scriptRepository.findByIdOrFail(userId, scriptId))
  },

  async list (userId, { q, platform, contentType, status, sort, page, limit }) {
    const filter = {}
    if (platform) filter['brief.platform'] = platform
    if (contentType) filter['brief.contentType'] = contentType
    if (status) filter.status = status
    // Regex rather than $text: it matches partial words, which is what a
    // creator typing "sal" into a search box expects. The text index stays for
    // when the library outgrows this.
    if (q) {
      const safe = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      filter.$or = [
        { title: { $regex: safe, $options: 'i' } },
        { 'brief.idea': { $regex: safe, $options: 'i' } }
      ]
    }

    const direction = sort.startsWith('-') ? -1 : 1
    const field = sort.replace('-', '')

    const result = await scriptRepository.list(userId, {
      filter, sort: { [field]: direction }, page, limit
    })

    return { ...result, items: result.items.map(summarise) }
  },

  /**
   * Saving marks edited sections as user-authored, so the UI can keep showing
   * which text the model wrote and which the creator wrote (spec 9.8). That
   * distinction is the product rule, not a nicety.
   */
  async update (userId, scriptId, patch) {
    const existing = await scriptRepository.findByIdOrFail(userId, scriptId)

    if (patch.version !== undefined && patch.version !== existing.version) {
      throw new AppError(
        'VERSION_CONFLICT',
        'This script changed since you opened it. Reload and reapply your edits.'
      )
    }

    const update = { $inc: { version: 1 } }
    const set = {}

    if (patch.title) set.title = patch.title
    if (patch.status) set.status = patch.status

    if (patch.sections) {
      const sections = [...(existing.generatedContent?.sections ?? [])]

      for (const edit of patch.sections) {
        const index = sections.findIndex((s) => s.order === edit.order)
        if (index === -1) continue

        const changed =
          (edit.body !== undefined && edit.body !== sections[index].body) ||
          (edit.heading !== undefined && edit.heading !== sections[index].heading)

        sections[index] = {
          ...sections[index],
          ...(edit.heading !== undefined ? { heading: edit.heading } : {}),
          ...(edit.body !== undefined ? { body: edit.body } : {}),
          // Only a real change flips authorship. Re-saving untouched text must
          // not quietly claim the model's words as the creator's.
          authoredBy: changed ? 'creator' : sections[index].authoredBy
        }
      }

      set['generatedContent.sections'] = sections
    }

    if (Object.keys(set).length > 0) update.$set = set

    // Conditional on the version we read, so two concurrent saves cannot both
    // succeed even if they pass the check above at the same moment.
    const saved = await Script.findOneAndUpdate(
      { scriptId, userId, deletedAt: null, version: existing.version },
      update,
      { new: true }
    ).lean()

    if (!saved) {
      throw new AppError(
        'VERSION_CONFLICT',
        'This script changed while you were saving. Reload and reapply your edits.'
      )
    }

    return present(saved)
  },

  async remove (userId, scriptId) {
    // Soft delete: generations and evaluations survive, so removing one bad
    // script does not punch a hole in the evaluation dataset.
    await scriptRepository.remove(userId, scriptId)
  },

  async applyGeneration (userId, scriptId, { script, generationId }) {
    const saved = await Script.findOneAndUpdate(
      { scriptId, userId, deletedAt: null },
      {
        $set: {
          generatedContent: {
            title: script.title,
            estimatedDurationSeconds: script.estimatedDurationSeconds,
            sections: script.sections.map((section) => ({ ...section, authoredBy: 'ai' }))
          },
          status: 'SCRIPT_READY',
          lastGenerationId: generationId
        }
      },
      { new: true }
    ).lean()

    if (!saved) throw notFound('Not found.')
    return present(saved)
  }
}
