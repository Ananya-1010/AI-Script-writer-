import { createHash } from 'node:crypto'

/**
 * Structured JSON logs (spec 12.1).
 *
 * Never logged: full prompt text, full script bodies, full knowledge documents,
 * JWTs, API keys, password hashes, provider payloads.
 * Logged instead: hashes, lengths, chunk IDs, phase timings, outcome.
 */

const DENY = /^(password|passwordHash|token|accessToken|jwt|apiKey|authorization|prompt|systemPrompt|body|content|sections)$/i

function scrub (value) {
  if (value === null || typeof value !== 'object') return value
  if (Array.isArray(value)) return value.map(scrub)
  return Object.fromEntries(
    Object.entries(value).map(([k, v]) => [k, DENY.test(k) ? '[redacted]' : scrub(v)])
  )
}

/** Log the shape of sensitive text, never the text. */
export function digest (text) {
  if (typeof text !== 'string') return null
  return {
    chars: text.length,
    sha256: createHash('sha256').update(text).digest('hex').slice(0, 16)
  }
}

function emit (level, event, fields = {}) {
  process.stdout.write(JSON.stringify({
    ts: new Date().toISOString(),
    level,
    event,
    service: 'application',
    ...scrub(fields)
  }) + '\n')
}

export const logger = {
  info: (event, fields) => emit('info', event, fields),
  warn: (event, fields) => emit('warn', event, fields),
  error: (event, fields) => emit('error', event, fields)
}
