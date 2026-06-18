import { describe, it, expect } from 'vitest'
import { z } from 'zod'

// Inline the confirm schema to test validation independently of the route.
const confirmSchema = z.object({
  bedIds: z.array(z.string().uuid()).min(1),
  notes: z.string().max(500).optional(),
})

const rejectSchema = z.object({
  reason: z.string().min(1).max(500),
})

const cancelSchema = z.object({
  reason: z.string().max(500).optional(),
})

describe('confirm booking schema', () => {
  it('accepts valid bedIds', () => {
    const r = confirmSchema.safeParse({
      bedIds: ['10000000-0000-4000-8000-000000000001'],
    })
    expect(r.success).toBe(true)
  })

  it('rejects empty bedIds array', () => {
    const r = confirmSchema.safeParse({ bedIds: [] })
    expect(r.success).toBe(false)
  })

  it('rejects non-uuid in bedIds', () => {
    const r = confirmSchema.safeParse({ bedIds: ['not-a-uuid'] })
    expect(r.success).toBe(false)
  })

  it('accepts optional notes up to 500 chars', () => {
    const r = confirmSchema.safeParse({
      bedIds: ['10000000-0000-4000-8000-000000000001'],
      notes: 'a'.repeat(500),
    })
    expect(r.success).toBe(true)
  })

  it('rejects notes longer than 500 chars', () => {
    const r = confirmSchema.safeParse({
      bedIds: ['10000000-0000-4000-8000-000000000001'],
      notes: 'a'.repeat(501),
    })
    expect(r.success).toBe(false)
  })
})

describe('reject booking schema', () => {
  it('accepts a valid reason', () => {
    expect(rejectSchema.safeParse({ reason: 'House full' }).success).toBe(true)
  })

  it('rejects empty reason', () => {
    expect(rejectSchema.safeParse({ reason: '' }).success).toBe(false)
  })

  it('rejects missing reason', () => {
    expect(rejectSchema.safeParse({}).success).toBe(false)
  })
})

describe('cancel booking schema', () => {
  it('accepts no body', () => {
    expect(cancelSchema.safeParse({}).success).toBe(true)
  })

  it('accepts optional reason', () => {
    expect(cancelSchema.safeParse({ reason: 'Changing plans' }).success).toBe(true)
  })
})
