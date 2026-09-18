import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
// .env lives at the repo root so both services read one file.
dotenv.config({ path: path.resolve(here, '../../../.env') })

/**
 * Nothing is hard-coded (spec 13.3). Every endpoint, key, and threshold comes
 * from the environment. Required values are asserted at boot rather than
 * failing later inside a request.
 */
const required = ['MONGODB_URI', 'JWT_SECRET', 'AI_SERVICE_URL', 'AI_SERVICE_TOKEN']

/**
 * Every value is trimmed on the way in. A connection string pasted into a
 * hosting dashboard arrives with a trailing newline more often than not, and an
 * untrimmed one fails with a driver error that names no variable at all. The
 * Python service has always done this; this side had not.
 */
const read = (key) => {
  const value = process.env[key]
  return typeof value === 'string' ? value.trim() : value
}

const num = (value, fallback) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

/**
 * Enough of a value to recognise it, never enough to leak it. Boot errors are
 * written to logs the platform retains, so a secret must not appear there — but
 * "expected mongodb://, got AQ.Ab8RN…" identifies a mis-pasted field instantly,
 * which is the entire point of failing here rather than inside the driver.
 */
const hint = (value) => {
  if (!value) return '(empty)'
  const head = value.slice(0, 12).replace(/[\r\n]/g, '\\n')
  return value.length > 12 ? `"${head}…" (${value.length} chars)` : `"${head}"`
}

export const config = {
  env: process.env.NODE_ENV ?? 'development',
  port: num(process.env.PORT, 4000),
  clientOrigin: read('CLIENT_ORIGIN') ?? 'http://localhost:5173',

  mongoUri: read('MONGODB_URI'),

  jwtSecret: read('JWT_SECRET'),
  jwtExpiresIn: num(process.env.JWT_EXPIRES_IN, 86400),

  aiService: {
    url: read('AI_SERVICE_URL')?.replace(/\/+$/, ''),
    token: read('AI_SERVICE_TOKEN'),
    timeoutMs: num(process.env.AI_SERVICE_TIMEOUT_MS, 45000)
  },

  quota: {
    perMinute: num(process.env.GENERATION_RATE_LIMIT_PER_MIN, 5),
    perDay: num(process.env.GENERATION_QUOTA_PER_DAY, 50)
  }
}

/**
 * Shape, not just presence.
 *
 * A variable that is set but wrong is the more common failure, and it is the
 * one that used to produce a useless error: pasting a connection string into
 * the wrong field on a dashboard surfaced as the driver's "Invalid scheme",
 * which names neither the variable nor the service. Checking here means the
 * process dies naming the field a human has to go and fix.
 */
const shapes = [
  {
    key: 'MONGODB_URI',
    value: () => config.mongoUri,
    ok: (v) => /^mongodb(\+srv)?:\/\//.test(v),
    want: 'start with mongodb:// or mongodb+srv://'
  },
  {
    key: 'AI_SERVICE_URL',
    value: () => config.aiService.url,
    ok: (v) => /^https?:\/\//.test(v),
    want: 'start with http:// or https:// — the scheme is not optional'
  }
]

export function assertConfig () {
  const missing = required.filter((key) => !read(key))
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}. ` +
      'Copy .env.example to .env and fill them in.'
    )
  }

  for (const { key, value, ok, want } of shapes) {
    const actual = value()
    if (!ok(actual)) {
      throw new Error(`${key} must ${want}. Got ${hint(actual)}.`)
    }
  }
}
