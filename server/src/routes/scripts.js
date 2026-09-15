import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { requireAuth } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { scriptController } from '../controllers/scriptController.js'
import { config } from '../config/index.js'
import {
  createScriptSchema, updateScriptSchema, listScriptsSchema,
  generateSchema, improveSchema, variationsSchema, evaluationSchema
} from '../schemas/script.js'

export const scriptRouter = Router()

/**
 * Generation is rate-limited per creator, not per IP: every call costs real
 * money and takes seconds of provider time, so the bound has to follow the
 * account (spec 9.4). The daily quota lives in generationService; this is the
 * burst guard.
 */
const generationLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: config.quota.perMinute,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.userId ?? req.ip,
  message: {
    error: {
      code: 'QUOTA_EXCEEDED',
      message: 'Too many generations at once. Give it a minute.',
      retryable: false
    }
  }
})

scriptRouter.use('/scripts', requireAuth)

scriptRouter.post('/scripts', validate({ body: createScriptSchema }), asyncHandler(scriptController.create))
scriptRouter.get('/scripts', validate({ query: listScriptsSchema }), asyncHandler(scriptController.list))
scriptRouter.get('/scripts/:id', asyncHandler(scriptController.get))
scriptRouter.put('/scripts/:id', validate({ body: updateScriptSchema }), asyncHandler(scriptController.update))
scriptRouter.delete('/scripts/:id', asyncHandler(scriptController.remove))

scriptRouter.post('/scripts/:id/generate', generationLimiter, validate({ body: generateSchema }), asyncHandler(scriptController.generate))
scriptRouter.post('/scripts/:id/regenerate', generationLimiter, validate({ body: generateSchema }), asyncHandler(scriptController.regenerate))
scriptRouter.post('/scripts/:id/improve', generationLimiter, validate({ body: improveSchema }), asyncHandler(scriptController.improve))
scriptRouter.post('/scripts/:id/variations', generationLimiter, validate({ body: variationsSchema }), asyncHandler(scriptController.variations))

scriptRouter.post('/scripts/:id/evaluation', validate({ body: evaluationSchema }), asyncHandler(scriptController.saveEvaluation))
scriptRouter.get('/scripts/:id/evaluation', asyncHandler(scriptController.listEvaluations))
