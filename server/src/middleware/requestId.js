import { randomUUID } from 'node:crypto'

/**
 * Every request gets a requestId, and a correlationId that is minted here and
 * propagated into the AI service, the logs, the metrics, and the generation
 * record (spec 12.3). One creator action must read as one story across both
 * services, so the client may supply X-Request-Id and we echo it back.
 */
export function requestId (req, res, next) {
  req.requestId = req.get('X-Request-Id') || `req_${randomUUID().slice(0, 12)}`
  req.correlationId = req.get('X-Correlation-Id') || `cor_${randomUUID().slice(0, 12)}`
  res.set('X-Request-Id', req.requestId)
  res.set('X-Correlation-Id', req.correlationId)
  next()
}
