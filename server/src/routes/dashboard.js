import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { dashboardService } from '../services/dashboardService.js'

export const dashboardRouter = Router()

dashboardRouter.get('/dashboard', requireAuth, asyncHandler(async (req, res) => {
  res.json(await dashboardService.get(req.userId))
}))
