import { AppError, ERROR_CODES } from '../errors.js'
import { logger } from '../utils/logger.js'

/** 404 for any route that does not exist. */
export function notFoundHandler (req, res, next) {
  next(new AppError('NOT_FOUND', 'Not found.'))
}

/**
 * The only place an error becomes a response. Internal detail is logged, never
 * serialised to the client: no stack traces, no prompts, no provider payloads
 * (spec 5.7, 9.4).
 */
export function errorHandler (err, req, res, _next) {
  const known = err instanceof AppError
  const code = known ? err.code : 'INTERNAL_ERROR'
  const status = known ? err.status : 500

  logger.error('request_failed', {
    requestId: req.requestId,
    correlationId: req.correlationId,
    userId: req.userId,
    route: `${req.method} ${req.originalUrl}`,
    errorCode: code,
    // message only, never the stack, in structured output
    reason: err.message
  })

  if (!known && process.env.NODE_ENV !== 'production') {
    // Unexpected errors still need to be debuggable locally.
    console.error(err)
  }

  res.status(status).json({
    error: {
      code,
      message: known ? err.message : 'Something went wrong. Please try again.',
      requestId: req.requestId,
      correlationId: req.correlationId,
      retryable: known ? err.retryable : ERROR_CODES.INTERNAL_ERROR.retryable
    }
  })
}
