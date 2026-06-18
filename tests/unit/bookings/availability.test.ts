import { describe, it, expect } from 'vitest'
import { availabilityQuerySchema } from '@/lib/validations/booking'

describe('availabilityQuerySchema', () => {
  it('accepts valid date range', () => {
    const result = availabilityQuerySchema.safeParse({
      checkInDate: '2026-07-01',
      checkOutDate: '2026-07-08',
    })
    expect(result.success).toBe(true)
  })

  it('rejects check-out on same day as check-in', () => {
    const result = availabilityQuerySchema.safeParse({
      checkInDate: '2026-07-01',
      checkOutDate: '2026-07-01',
    })
    expect(result.success).toBe(false)
  })

  it('rejects check-out before check-in', () => {
    const result = availabilityQuerySchema.safeParse({
      checkInDate: '2026-07-08',
      checkOutDate: '2026-07-01',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid date format', () => {
    const result = availabilityQuerySchema.safeParse({
      checkInDate: '07/01/2026',
      checkOutDate: '07/08/2026',
    })
    expect(result.success).toBe(false)
  })
})

describe('date overlap logic', () => {
  // Helper that mirrors the DB half-open interval overlap check:
  // request overlaps query if request.checkIn < queryOut AND request.checkOut > queryIn
  function overlaps(
    reqIn: string, reqOut: string,
    qIn: string, qOut: string,
  ): boolean {
    return reqIn < qOut && reqOut > qIn
  }

  it('detects a request fully inside the query window', () => {
    expect(overlaps('2026-07-03', '2026-07-05', '2026-07-01', '2026-07-08')).toBe(true)
  })

  it('detects a request that straddles the start of the query window', () => {
    expect(overlaps('2026-06-28', '2026-07-03', '2026-07-01', '2026-07-08')).toBe(true)
  })

  it('detects a request that straddles the end of the query window', () => {
    expect(overlaps('2026-07-05', '2026-07-12', '2026-07-01', '2026-07-08')).toBe(true)
  })

  it('detects a request that fully wraps the query window', () => {
    expect(overlaps('2026-06-25', '2026-07-15', '2026-07-01', '2026-07-08')).toBe(true)
  })

  it('does NOT detect a request that ends exactly on query start (half-open)', () => {
    expect(overlaps('2026-06-25', '2026-07-01', '2026-07-01', '2026-07-08')).toBe(false)
  })

  it('does NOT detect a request that starts exactly on query end (half-open)', () => {
    expect(overlaps('2026-07-08', '2026-07-15', '2026-07-01', '2026-07-08')).toBe(false)
  })

  it('does NOT detect a non-overlapping request before the window', () => {
    expect(overlaps('2026-06-01', '2026-06-20', '2026-07-01', '2026-07-08')).toBe(false)
  })
})
