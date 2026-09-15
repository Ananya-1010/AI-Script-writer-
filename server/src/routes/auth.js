import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { validate } from '../middleware/validate.js'
import { requireAuth } from '../middleware/auth.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { authController } from '../controllers/authController.js'
import { registerSchema, loginSchema } from '../schemas/auth.js'

export const authRouter = Router()

/**
 * Per-IP throttle on the credential endpoints. The per-account lockout in
 * authService stops one account being ground down; this stops one source
 * spraying one password across many accounts, which the lockout cannot see.
 */
const credentialLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'QUOTA_EXCEEDED',
      message: 'Too many attempts. Please wait a few minutes and try again.',
      retryable: false
    }
  }
})

authRouter.post(
  '/auth/register',
  credentialLimiter,
  validate({ body: registerSchema }),
  asyncHandler(authController.register)
)

authRouter.post(
  '/auth/login',
  credentialLimiter,
  validate({ body: loginSchema }),
  asyncHandler(authController.login)
)

authRouter.get('/auth/me', requireAuth, asyncHandler(authController.me))
