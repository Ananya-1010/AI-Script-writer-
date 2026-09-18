import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import path from 'node:path'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { config } from './config/index.js'
import { requestId } from './middleware/requestId.js'
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'
import { apiRouter } from './routes/index.js'

const here = path.dirname(fileURLToPath(import.meta.url))

/** Where the built client lands in the production image. */
const CLIENT_DIST = path.resolve(here, '../public')

export function createApp () {
  const app = express()

  app.use(helmet({
    // The client is same-origin with the API, so the default CSP is close to
    // right — but it blocks the inline theme script in index.html that runs
    // before first paint, and blocking that reintroduces the white flash.
    contentSecurityPolicy: false
  }))

  app.use(cors({ origin: config.clientOrigin, credentials: true }))
  // Brief and knowledge sizes are capped again at the schema layer; this is the
  // outer bound so an oversized payload is rejected before it is parsed.
  app.use(express.json({ limit: '1mb' }))
  app.use(requestId)

  app.use('/api/v1', apiRouter)

  /**
   * Serve the built client from this same service.
   *
   * One origin means no CORS, no VITE_API_BASE_URL to keep in sync with a
   * second host, and one fewer platform account to hold. In development the
   * folder does not exist and Vite serves the client instead, so this is
   * skipped rather than guarded by NODE_ENV — the filesystem is the honest
   * signal about whether there is anything to serve.
   */
  if (existsSync(CLIENT_DIST)) {
    // Fingerprinted assets are immutable; index.html must never be cached or a
    // deploy leaves clients pinned to a stale bundle.
    app.use('/assets', express.static(path.join(CLIENT_DIST, 'assets'), {
      immutable: true,
      maxAge: '1y'
    }))
    app.use(express.static(CLIENT_DIST, { index: false, maxAge: '1h' }))

    /**
     * SPA fallback. A host asked for /workspace/s_4c19 would look for a file at
     * that path; this hands back the app instead, so deep links and refreshes
     * work.
     *
     * /api and /assets are excluded. An unmatched API route must keep returning
     * the typed error envelope rather than HTML, and a missing asset must 404
     * honestly — serving index.html for a missing .js is what produces the
     * baffling "Unexpected token '<'" instead of a plain 404.
     */
    app.get(/^(?!\/(api|assets)\/).*/, (req, res, next) => {
      if (req.method !== 'GET') return next()
      res.sendFile(path.join(CLIENT_DIST, 'index.html'))
    })
  }

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
