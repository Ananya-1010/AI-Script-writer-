import { Router } from 'express'
import { healthRouter } from './health.js'
import { authRouter } from './auth.js'
import { profileRouter } from './profile.js'

/**
 * Public application API. Base path /api/v1 (spec 6).
 * Routes land here as each week's slice is built:
 *   W2 auth + profile ✓ · W3 knowledge · W4-5 generation · W6 scripts · W8 dashboard · W9 evaluation
 */
export const apiRouter = Router()

apiRouter.use(healthRouter)
apiRouter.use(authRouter)
apiRouter.use(profileRouter)
