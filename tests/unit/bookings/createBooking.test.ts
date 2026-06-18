import { describe, it, expect } from 'vitest'
import { createBookingSchema } from '@/lib/validations/booking'

const VALID_MEMBER_ID = '11111111-0000-4000-8000-000000000001'

describe('createBookingSchema', () => {
  it('accepts a valid booking payload', () => {
    const result = createBookingSchema.safeParse({
      checkInDate: '2026-08-01',
      checkOutDate: '2026-08-08',
      attendeeMemberIds: [VALID_MEMBER_ID],
    })
    expect(result.success).toBe(true)
  })

  it('accepts optional modulePreferenceId and notes', () => {
    const result = createBookingSchema.safeParse({
      checkInDate: '2026-08-01',
      checkOutDate: '2026-08-08',
      attendeeMemberIds: [VALID_MEMBER_ID],
      modulePreferenceId: '22222222-0000-4000-8000-000000000002',
      notes: 'We prefer the quiet side.',
    })
    expect(result.success).toBe(true)
  })

  it('rejects check-out on the same day as check-in', () => {
    const result = createBookingSchema.safeParse({
      checkInDate: '2026-08-01',
      checkOutDate: '2026-08-01',
      attendeeMemberIds: [VALID_MEMBER_ID],
    })
    expect(result.success).toBe(false)
  })

  it('rejects check-out before check-in', () => {
    const result = createBookingSchema.safeParse({
      checkInDate: '2026-08-08',
      checkOutDate: '2026-08-01',
      attendeeMemberIds: [VALID_MEMBER_ID],
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty attendeeMemberIds', () => {
    const result = createBookingSchema.safeParse({
      checkInDate: '2026-08-01',
      checkOutDate: '2026-08-08',
      attendeeMemberIds: [],
    })
    expect(result.success).toBe(false)
  })

  it('rejects non-uuid in attendeeMemberIds', () => {
    const result = createBookingSchema.safeParse({
      checkInDate: '2026-08-01',
      checkOutDate: '2026-08-08',
      attendeeMemberIds: ['not-a-uuid'],
    })
    expect(result.success).toBe(false)
  })

  it('rejects notes longer than 1000 characters', () => {
    const result = createBookingSchema.safeParse({
      checkInDate: '2026-08-01',
      checkOutDate: '2026-08-08',
      attendeeMemberIds: [VALID_MEMBER_ID],
      notes: 'x'.repeat(1001),
    })
    expect(result.success).toBe(false)
  })
})

describe('min_advance_days enforcement (pure date logic)', () => {
  function isCheckInTooSoon(checkInDate: string, todayDate: string, minDays: number): boolean {
    const checkIn = new Date(checkInDate + 'T00:00:00')
    const today = new Date(todayDate + 'T00:00:00')
    const diffMs = checkIn.getTime() - today.getTime()
    const diffDays = diffMs / (1000 * 60 * 60 * 24)
    return diffDays < minDays
  }

  it('allows check-in exactly at min_advance_days', () => {
    expect(isCheckInTooSoon('2026-08-08', '2026-08-01', 7)).toBe(false)
  })

  it('blocks check-in one day before min_advance_days', () => {
    expect(isCheckInTooSoon('2026-08-07', '2026-08-01', 7)).toBe(true)
  })

  it('allows check-in further than min_advance_days', () => {
    expect(isCheckInTooSoon('2026-09-01', '2026-08-01', 7)).toBe(false)
  })
})
