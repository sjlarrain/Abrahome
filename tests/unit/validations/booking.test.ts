import { describe, it, expect } from 'vitest'
import { createBookingSchema } from '@/lib/validations/booking'

const base = {
  checkInDate: '2026-07-01',
  checkOutDate: '2026-07-05',
  attendeeMemberIds: ['a0000000-0000-4000-8000-000000000001'],
}

describe('createBookingSchema', () => {
  it('accepts a valid booking request', () => {
    expect(createBookingSchema.safeParse(base).success).toBe(true)
  })

  it('rejects check-out on or before check-in (mirrors valid_dates DB constraint)', () => {
    const r = createBookingSchema.safeParse({ ...base, checkOutDate: '2026-07-01' })
    expect(r.success).toBe(false)
    if (!r.success) {
      expect(r.error.issues.some((i) => i.path.includes('checkOutDate'))).toBe(true)
    }
  })

  it('rejects an empty attendee list (at least one attendee required)', () => {
    const r = createBookingSchema.safeParse({ ...base, attendeeMemberIds: [] })
    expect(r.success).toBe(false)
  })

  it('rejects a non-uuid attendee id', () => {
    const r = createBookingSchema.safeParse({ ...base, attendeeMemberIds: ['nope'] })
    expect(r.success).toBe(false)
  })
})
