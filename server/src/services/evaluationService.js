import { EVALUATION_CRITERIA } from '../models/constants.js'
import { evaluationRepository, scriptRepository, generationRepository } from '../repositories/index.js'
import { notFound } from '../errors.js'

const average = (values) =>
  values.length ? Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(2)) : null

export const evaluationService = {
  /**
   * An evaluation is pinned to a specific generationId, not to the script.
   * A script accumulates several generations, and scoring "the script" would
   * make the dataset uninterpretable the moment it is regenerated.
   */
  async create (userId, scriptId, { generationId, scores, humanRating, feedback }) {
    await scriptRepository.findByIdOrFail(userId, scriptId)

    const generation = await generationRepository.findById(userId, generationId)
    if (!generation || generation.scriptId !== scriptId) {
      throw notFound('That generation does not belong to this script.')
    }

    const evaluation = await evaluationRepository.create(userId, {
      scriptId, generationId, ...scores, humanRating, feedback
    })

    return { evaluationId: evaluation.evaluationId, createdAt: evaluation.createdAt }
  },

  async list (userId, scriptId) {
    await scriptRepository.findByIdOrFail(userId, scriptId)

    const { items } = await evaluationRepository.list(userId, {
      filter: { scriptId }, sort: { createdAt: -1 }, limit: 100
    })

    const averages = Object.fromEntries(
      EVALUATION_CRITERIA.map((criterion) => [criterion, average(items.map((i) => i[criterion]))])
    )

    return {
      items: items.map((item) => ({
        evaluationId: item.evaluationId,
        generationId: item.generationId,
        scores: Object.fromEntries(EVALUATION_CRITERIA.map((c) => [c, item[c]])),
        humanRating: item.humanRating,
        feedback: item.feedback,
        createdAt: item.createdAt
      })),
      averages: { ...averages, humanRating: average(items.map((i) => i.humanRating)) }
    }
  }
}
