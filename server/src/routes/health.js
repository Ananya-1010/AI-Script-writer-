import { Router } from 'express'
import mongoose from 'mongoose'
import { aiClient } from '../services/aiClient.js'

export const healthRouter = Router()

const MONGO_STATE = ['disconnected', 'connected', 'connecting', 'disconnecting']

/** Liveness: is this process up. Cheap, no dependencies touched. */
healthRouter.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'application' })
})

/** Readiness: are our dependencies actually usable. */
healthRouter.get('/health/ready', async (req, res) => {
  const mongo = MONGO_STATE[mongoose.connection.readyState] ?? 'unknown'
  const ai = await aiClient.health()
  const ready = mongo === 'connected' && ai.reachable === true

  res.status(ready ? 200 : 503).json({
    status: ready ? 'ready' : 'degraded',
    dependencies: { mongodb: mongo, aiService: ai }
  })
})
