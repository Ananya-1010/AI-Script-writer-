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
  /**
   * A Mongoose ValidationError means the *request* was bad, not the server.
   * Letting it fall through as a 500 tells the client "retry, this is our
   * fault" when retrying will fail identically forever. Route schemas should
   * catch these first; this is the backstop for when the two disagree.
   */
  const schemaRejected = err?.name === 'ValidationError' && err?.errors

  const known = err instanceof AppError
  const code = known ? err.code : schemaRejected ? 'VALIDATION_ERROR' : 'INTERNAL_ERROR'
  const status = known ? err.status : schemaRejected ? 400 : 500

  logger.error('request_failed', {
    requestId: req.requestId,
    correlationId: req.correlationId,
    userId: req.userId,
    route: `${req.method} ${req.originalUrl}`,
    errorCode: code,
    // message only, never the stack, in structured output
    reason: err.message
  })

  if (!known && !schemaRejected && process.env.NODE_ENV !== 'production') {
    // Unexpected errors still need to be debuggable locally.
    console.error(err)
  }

  const message = known
    ? err.message
    : schemaRejected
      ? Object.values(err.errors).map((e) => e.message).join('; ')
      : 'Something went wrong. Please try again.'

  res.status(status).json({
    error: {
      code,
      message,
      requestId: req.requestId,
      correlationId: req.correlationId,
      retryable: known ? err.retryable : schemaRejected ? false : ERROR_CODES.INTERNAL_ERROR.retryable
    }
  })
}
