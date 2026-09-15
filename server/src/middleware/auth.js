import jwt from 'jsonwebtoken'
import { config } from '../config/index.js'
import { unauthorized } from '../errors.js'

/**
 * Identity comes from the verified token and nowhere else — never from a body,
 * a query parameter, or a client-controlled header (spec 9.2).
 */
export function requireAuth (req, res, next) {
  const header = req.get('Authorization') ?? ''
  const [scheme, token] = header.split(' ')

  if (scheme !== 'Bearer' || !token) {
    return next(unauthorized('Missing or malformed access token.'))
  }

  try {
    const claims = jwt.verify(token, config.jwtSecret)
    req.userId = claims.sub
    next()
  } catch {
    // Expired and invalid are deliberately indistinguishable to the caller.
    next(unauthorized('Invalid or expired access token.'))
  }
}

export function signAccessToken (userId) {
  return jwt.sign({ sub: userId }, config.jwtSecret, { expiresIn: config.jwtExpiresIn })
}
