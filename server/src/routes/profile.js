import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { profileController } from '../controllers/profileController.js'
import { profileSchema } from '../schemas/profile.js'

export const profileRouter = Router()

profileRouter.get('/profile', requireAuth, asyncHandler(profileController.get))

// PUT has upsert semantics: it creates the profile if absent (spec 6.2).
profileRouter.put(
  '/profile',
  requireAuth,
  validate({ body: profileSchema }),
  asyncHandler(profileController.save)
)
