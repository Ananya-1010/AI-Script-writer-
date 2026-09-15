import { z } from 'zod'

/**
 * Validation happens at the route boundary, before a controller sees the
 * request (spec 5.7). Bounds are as tight as the product allows — an oversized
 * field should fail here, not somewhere downstream.
 */

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('must be a valid email address')
  .max(254)

export const registerSchema = z.object({
  name: z.string().trim().min(1, 'is required').max(80),
  email: emailSchema,
  // Length is the requirement that actually correlates with strength. A
  // composition rule (one symbol, one digit) mostly produces "Password1!".
  password: z.string().min(10, 'must be at least 10 characters').max(200)
})

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'is required').max(200)
})
