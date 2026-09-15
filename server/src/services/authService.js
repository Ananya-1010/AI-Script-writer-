import bcrypt from 'bcryptjs'
import { AppError, unauthorized } from '../errors.js'
import { userRepository, profileRepository } from '../repositories/index.js'
import { signAccessToken } from '../middleware/auth.js'
import { config } from '../config/index.js'
import { logger } from '../utils/logger.js'

// Deliberate work factor. 12 costs ~250ms per hash, which is the point: it is
// what makes an offline attack on a leaked dump expensive.
const WORK_FACTOR = 12

const MAX_FAILED_ATTEMPTS = 8
const LOCKOUT_MS = 15 * 60 * 1000

/**
 * A real bcrypt hash of a value nobody will ever submit.
 *
 * When a login arrives for an email that does not exist, we still run a compare
 * against this. Without it, "unknown email" returns in ~1ms and "wrong password"
 * in ~250ms, and that timing gap enumerates the whole user list regardless of
 * both paths returning an identical 401 (spec 9.1).
 */
const DECOY_HASH = bcrypt.hashSync('no-user-with-this-password', WORK_FACTOR)

export const authService = {
  async register ({ name, email, password }) {
    if (await userRepository.existsByEmail(email)) {
      // Registration necessarily discloses that an email is taken — there is no
      // way to offer "this email is already registered" without it. Login does
      // not, which is where enumeration actually matters.
      throw new AppError('EMAIL_EXISTS', 'An account with this email already exists.')
    }

    const passwordHash = await bcrypt.hash(password, WORK_FACTOR)
    const user = await userRepository.create({ name, email, passwordHash })

    logger.info('user_registered', { userId: user.userId })

    return {
      user: { userId: user.userId, name: user.name, email: user.email },
      accessToken: signAccessToken(user.userId),
      expiresIn: config.jwtExpiresIn
    }
  },

  async login ({ email, password }) {
    const user = await userRepository.findByEmail(email)

    if (!user) {
      await bcrypt.compare(password, DECOY_HASH)
      throw unauthorized('Invalid email or password.')
    }

    const lockedUntil = user.authMetadata?.lockedUntil
    if (lockedUntil && new Date(lockedUntil) > new Date()) {
      // Same message as a bad password: a distinct "account locked" reply tells
      // an attacker their guessing is having an effect.
      logger.warn('login_blocked_locked', { userId: user.userId })
      throw unauthorized('Invalid email or password.')
    }

    const ok = await bcrypt.compare(password, user.passwordHash)

    if (!ok) {
      const attempts = (user.authMetadata?.failedAttempts ?? 0) + 1
      const lockUntil = attempts >= MAX_FAILED_ATTEMPTS ? new Date(Date.now() + LOCKOUT_MS) : null
      await userRepository.recordLoginFailure(user.userId, lockUntil)

      logger.warn('login_failed', { userId: user.userId, attempts, locked: Boolean(lockUntil) })
      throw unauthorized('Invalid email or password.')
    }

    await userRepository.recordLoginSuccess(user.userId)
    logger.info('login_succeeded', { userId: user.userId })

    return {
      accessToken: signAccessToken(user.userId),
      expiresIn: config.jwtExpiresIn
    }
  },

  async me (userId) {
    const user = await userRepository.findByUserId(userId)
    if (!user) throw unauthorized('Account no longer exists.')

    const profile = await profileRepository.findOne(userId)

    return {
      userId: user.userId,
      name: user.name,
      email: user.email,
      hasProfile: Boolean(profile),
      createdAt: user.createdAt
    }
  }
}
