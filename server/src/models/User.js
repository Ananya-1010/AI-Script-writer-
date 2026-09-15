import mongoose from 'mongoose'
import { randomUUID } from 'node:crypto'

const userSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true, default: () => `u_${randomUUID().slice(0, 8)}` },
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
  authMetadata: {
    lastLoginAt: { type: Date, default: null },
    failedAttempts: { type: Number, default: 0 },
    lockedUntil: { type: Date, default: null }
  }
}, { timestamps: { createdAt: 'createdAt', updatedAt: false } })

// select:false above is the primary guard; this is the backstop, so the hash
// cannot leak through a res.json(user) anywhere (spec 9.1).
userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.passwordHash
    delete ret._id
    delete ret.__v
    return ret
  }
})

export const User = mongoose.model('User', userSchema)
