import { Router } from 'express'
import { healthRouter } from './health.js'
import { authRouter } from './auth.js'
import { profileRouter } from './profile.js'
import { scriptRouter } from './scripts.js'
import { dashboardRouter } from './dashboard.js'

/**
 * Public application API, mounted at /api/v1 (spec 6).
 * Knowledge ingestion is the one route group still to come, in W3.
 */
export const apiRouter = Router()

apiRouter.use(healthRouter)
apiRouter.use(authRouter)
apiRouter.use(profileRouter)
apiRouter.use(scriptRouter)
apiRouter.use(dashboardRouter)
