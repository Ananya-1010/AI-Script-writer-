/**
 * One typed error envelope for both services (spec 6.9).
 *
 *   { error: { code, message, requestId, correlationId, retryable } }
 *
 * Error messages never expose prompts, stack traces, or provider payloads.
 */

export const ERROR_CODES = {
  VALIDATION_ERROR: { status: 400, retryable: false },
  AUTH_ERROR: { status: 401, retryable: false },
  AUTHORIZATION_ERROR: { status: 403, retryable: false },
  NOT_FOUND: { status: 404, retryable: false },
  // Split from VERSION_CONFLICT on purpose: spec 6.1 calls a duplicate email
  // "409 CONFLICT" while the 6.9 table reuses VERSION_CONFLICT for it. Two
  // unrelated failures should not share one code — a client cannot act on it.
  EMAIL_EXISTS: { status: 409, retryable: false },
  VERSION_CONFLICT: { status: 409, retryable: false },
  QUOTA_EXCEEDED: { status: 429, retryable: false },
  RETRIEVAL_FAILED: { status: 500, retryable: true },
  MALFORMED_LLM_OUTPUT: { status: 500, retryable: true },
  INGESTION_FAILED: { status: 500, retryable: true },
  LLM_TIMEOUT: { status: 503, retryable: true },
  LLM_RATE_LIMITED: { status: 503, retryable: true },
  GENERATION_FAILED: { status: 503, retryable: true },
  INTERNAL_ERROR: { status: 500, retryable: false }
}

export class AppError extends Error {
  constructor (code, message, { cause } = {}) {
    super(message)
    const known = ERROR_CODES[code] ?? ERROR_CODES.INTERNAL_ERROR
    this.name = 'AppError'
    this.code = ERROR_CODES[code] ? code : 'INTERNAL_ERROR'
    this.status = known.status
    this.retryable = known.retryable
    this.cause = cause
  }
}

export const badRequest = (m = 'The request could not be validated.') => new AppError('VALIDATION_ERROR', m)
export const unauthorized = (m = 'Authentication failed.') => new AppError('AUTH_ERROR', m)
/** Cross-tenant access answers 404, never 403 — existence is not disclosed (spec 9.2). */
export const notFound = (m = 'Not found.') => new AppError('NOT_FOUND', m)
