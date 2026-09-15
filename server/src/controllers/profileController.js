import { profileService } from '../services/profileService.js'

export const profileController = {
  async get (req, res) {
    res.json({ profile: await profileService.get(req.userId) })
  },

  async save (req, res) {
    const profile = await profileService.save(req.userId, req.body)
    res.json({ profile, updatedAt: profile.updatedAt })
  }
}
