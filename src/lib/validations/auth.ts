import { z } from 'zod'

export const roleSchema = z.enum(['admin', 'family_head', 'family_member', 'solo_user'])
export type Role = z.infer<typeof roleSchema>

export const registerSchema = z.object({
  fullName: z.string().min(1, 'Full name is required').max(120),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  phone: z.string().max(30).optional(),
})
export type RegisterInput = z.infer<typeof registerSchema>

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})
export type LoginInput = z.infer<typeof loginSchema>

export const approveUserSchema = z.object({
  role: roleSchema.exclude(['admin']),
})
export type ApproveUserInput = z.infer<typeof approveUserSchema>
