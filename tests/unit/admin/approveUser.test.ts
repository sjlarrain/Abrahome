import { describe, it, expect } from 'vitest'
import { approveUserSchema } from '@/lib/validations/auth'

describe('approveUserSchema', () => {
  it('accepts family_head role', () => {
    const result = approveUserSchema.safeParse({ role: 'family_head' })
    expect(result.success).toBe(true)
  })

  it('accepts family_member role', () => {
    const result = approveUserSchema.safeParse({ role: 'family_member' })
    expect(result.success).toBe(true)
  })

  it('accepts solo_user role', () => {
    const result = approveUserSchema.safeParse({ role: 'solo_user' })
    expect(result.success).toBe(true)
  })

  it('rejects admin role (cannot approve someone directly to admin via this endpoint)', () => {
    const result = approveUserSchema.safeParse({ role: 'admin' })
    expect(result.success).toBe(false)
  })

  it('rejects an unknown role', () => {
    const result = approveUserSchema.safeParse({ role: 'superuser' })
    expect(result.success).toBe(false)
  })

  it('rejects missing role', () => {
    const result = approveUserSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})
