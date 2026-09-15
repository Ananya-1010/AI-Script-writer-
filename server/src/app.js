import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { config } from './config/index.js'
import { requestId } from './middleware/requestId.js'
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'
import { apiRouter } from './routes/index.js'

export function createApp () {
  const app = express()

  app.use(helmet())
  app.use(cors({ origin: config.clientOrigin, credentials: true }))
  // Brief and knowledge sizes are capped again at the schema layer; this is the
  // outer bound so an oversized payload is rejected before it is parsed.
  app.use(express.json({ limit: '1mb' }))
  app.use(requestId)

  app.use('/api/v1', apiRouter)

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
