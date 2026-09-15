import { config } from '../config/index.js'
import { AppError } from '../errors.js'
import { logger } from '../utils/logger.js'

/**
 * The only path from Node into the Python AI service.
 *
 * - Authenticates with a service token. A creator JWT is never forwarded (spec 9.5).
 * - Sends userId purely as a retrieval scope.
 * - Carries an explicit timeout on every call, so a stalled provider surfaces as
 *   a typed LLM_TIMEOUT rather than a spinner that never resolves (spec 5.7).
 * - Maps the AI service's error envelope onto our own, unchanged.
 */
async function call (path, body, { correlationId, requestId, timeoutMs } = {}) {
  const controller = new AbortController()
  const limit = timeoutMs ?? config.aiService.timeoutMs
  const timer = setTimeout(() => controller.abort(), limit)
  const startedAt = Date.now()

  try {
    const response = await fetch(`${config.aiService.url}${path}`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.aiService.token}`,
        'X-Correlation-Id': correlationId ?? '',
        'X-Request-Id': requestId ?? ''
      },
      body: JSON.stringify(body)
    })

    const payload = await response.json().catch(() => null)

    if (!response.ok) {
      const code = payload?.error?.code ?? 'GENERATION_FAILED'
      const message = payload?.error?.message ?? 'The AI service could not complete the request.'
      throw new AppError(code, message)
    }

    logger.info('ai_service_call', {
      path, correlationId, requestId, latencyMs: Date.now() - startedAt, outcome: 'ok'
    })
    return payload
  } catch (err) {
    if (err instanceof AppError) throw err

    const timedOut = err.name === 'AbortError'
    logger.warn('ai_service_call', {
      path,
      correlationId,
      requestId,
      latencyMs: Date.now() - startedAt,
      outcome: timedOut ? 'timeout' : 'unreachable'
    })
    throw new AppError(
      timedOut ? 'LLM_TIMEOUT' : 'GENERATION_FAILED',
      timedOut
        ? 'The script took too long to generate. Please try again.'
        : 'The script could not be generated. Please try again.',
      { cause: err }
    )
  } finally {
    clearTimeout(timer)
  }
}

export const aiClient = {
  generate: (req, ctx) => call('/internal/generate', req, ctx),
  improve: (req, ctx) => call('/internal/improve', req, ctx),
  variations: (req, ctx) => call('/internal/variations', req, ctx),
  ingest: (req, ctx) => call('/internal/ingest', req, ctx),

  async health () {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 5000)
    try {
      const response = await fetch(`${config.aiService.url}/internal/health`, {
        signal: controller.signal,
        headers: { Authorization: `Bearer ${config.aiService.token}` }
      })
      if (!response.ok) return { reachable: false, status: response.status }
      return { reachable: true, ...(await response.json()) }
    } catch {
      return { reachable: false }
    } finally {
      clearTimeout(timer)
    }
  }
}
