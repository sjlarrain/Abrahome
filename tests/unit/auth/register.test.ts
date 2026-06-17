import { describe, it, expect } from 'vitest'
import { registerSchema } from '@/lib/validations/auth'

describe('registerSchema', () => {
  it('accepts a valid payload', () => {
    const result = registerSchema.safeParse({
      fullName: 'Ana García',
      email: 'ana@example.com',
      password: 'password123',
    })
    expect(result.success).toBe(true)
  })

  it('accepts an optional phone number', () => {
    const result = registerSchema.safeParse({
      fullName: 'Ana García',
      email: 'ana@example.com',
      password: 'password123',
      phone: '+52 55 1234 5678',
    })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.phone).toBe('+52 55 1234 5678')
  })

  it('rejects missing fullName', () => {
    const result = registerSchema.safeParse({
      email: 'ana@example.com',
      password: 'password123',
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty fullName', () => {
    const result = registerSchema.safeParse({
      fullName: '',
      email: 'ana@example.com',
      password: 'password123',
    })
    expect(result.success).toBe(false)
  })

  it('rejects an invalid email', () => {
    const result = registerSchema.safeParse({
      fullName: 'Ana García',
      email: 'not-an-email',
      password: 'password123',
    })
    expect(result.success).toBe(false)
  })

  it('rejects a password shorter than 8 characters', () => {
    const result = registerSchema.safeParse({
      fullName: 'Ana García',
      email: 'ana@example.com',
      password: 'short',
    })
    expect(result.success).toBe(false)
  })

  it('rejects a phone longer than 30 characters', () => {
    const result = registerSchema.safeParse({
      fullName: 'Ana García',
      email: 'ana@example.com',
      password: 'password123',
      phone: '1'.repeat(31),
    })
    expect(result.success).toBe(false)
  })
})
