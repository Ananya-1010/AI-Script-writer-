import { authService } from '../services/authService.js'

/** Controllers stay thin: validation happened at the boundary, policy lives in the service. */
export const authController = {
  async register (req, res) {
    const result = await authService.register(req.body)
    res.status(201).json(result)
  },

  async login (req, res) {
    const result = await authService.login(req.body)
    res.json(result)
  },

  async me (req, res) {
    res.json(await authService.me(req.userId))
  }
}
