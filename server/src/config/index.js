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

const num = (value, fallback) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export const config = {
  env: process.env.NODE_ENV ?? 'development',
  port: num(process.env.PORT, 4000),
  clientOrigin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',

  mongoUri: process.env.MONGODB_URI,

  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: num(process.env.JWT_EXPIRES_IN, 86400),

  aiService: {
    url: process.env.AI_SERVICE_URL,
    token: process.env.AI_SERVICE_TOKEN,
    timeoutMs: num(process.env.AI_SERVICE_TIMEOUT_MS, 45000)
  },

  quota: {
    perMinute: num(process.env.GENERATION_RATE_LIMIT_PER_MIN, 5),
    perDay: num(process.env.GENERATION_QUOTA_PER_DAY, 50)
  }
}

export function assertConfig () {
  const missing = required.filter((key) => !process.env[key])
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}. ` +
      'Copy .env.example to .env and fill them in.'
    )
  }
}
