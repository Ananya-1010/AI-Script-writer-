import { scriptService } from '../services/scriptService.js'
import { generationService } from '../services/generationService.js'
import { evaluationService } from '../services/evaluationService.js'

const ctx = (req) => ({ correlationId: req.correlationId, requestId: req.requestId })

export const scriptController = {
  async create (req, res) {
    res.status(201).json(await scriptService.create(req.userId, req.body))
  },

  async list (req, res) {
    res.json(await scriptService.list(req.userId, req.query))
  },

  async get (req, res) {
    res.json(await scriptService.get(req.userId, req.params.id))
  },

  async update (req, res) {
    res.json(await scriptService.update(req.userId, req.params.id, req.body))
  },

  async remove (req, res) {
    await scriptService.remove(req.userId, req.params.id)
    res.status(204).end()
  },

  async generate (req, res) {
    res.json(await generationService.generate(req.userId, req.params.id, req.body.options ?? {}, ctx(req)))
  },

  async regenerate (req, res) {
    res.json(await generationService.regenerate(req.userId, req.params.id, req.body.options ?? {}, ctx(req)))
  },

  async improve (req, res) {
    res.json(await generationService.improve(req.userId, req.params.id, req.body, ctx(req)))
  },

  async variations (req, res) {
    res.json(await generationService.variations(req.userId, req.params.id, req.body, ctx(req)))
  },

  async saveEvaluation (req, res) {
    res.status(201).json(await evaluationService.create(req.userId, req.params.id, req.body))
  },

  async listEvaluations (req, res) {
    res.json(await evaluationService.list(req.userId, req.params.id))
  }
}
