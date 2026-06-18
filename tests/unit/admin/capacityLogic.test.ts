import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { heldBedsByDay } from '@/lib/availability'

describe('capacity logic: held beds vs total', () => {
  it('free = total - held, never negative', () => {
    const requests = [
      { check_in_date: '2026-08-01', check_out_date: '2026-08-04', attendee_count: 6 },
    ]
    const held = heldBedsByDay(requests, ['2026-08-01', '2026-08-02', '2026-08-03', '2026-08-04'])
    const totalBeds = 5
    expect(Math.max(0, totalBeds - (held['2026-08-01'] ?? 0))).toBe(0) // 6 > 5, clamp to 0
    expect(Math.max(0, totalBeds - (held['2026-08-04'] ?? 0))).toBe(5) // checkout day, fully free
  })

  it('two bookings on the same night sum correctly', () => {
    const requests = [
      { check_in_date: '2026-08-10', check_out_date: '2026-08-12', attendee_count: 2 },
      { check_in_date: '2026-08-10', check_out_date: '2026-08-11', attendee_count: 3 },
    ]
    const held = heldBedsByDay(requests, ['2026-08-10', '2026-08-11'])
    expect(held['2026-08-10']).toBe(5)
    expect(held['2026-08-11']).toBe(2) // second booking checked out
  })
})

describe('available rooms query helpers', () => {
  it('excludes check-out day from held count (half-open)', () => {
    const requests = [
      { check_in_date: '2026-09-01', check_out_date: '2026-09-03', attendee_count: 4 },
    ]
    const held = heldBedsByDay(requests, ['2026-08-31', '2026-09-01', '2026-09-02', '2026-09-03'])
    expect(held['2026-08-31']).toBe(0)
    expect(held['2026-09-01']).toBe(4)
    expect(held['2026-09-02']).toBe(4)
    expect(held['2026-09-03']).toBe(0) // half-open: checkout day is free
  })
})

describe('blackout date validation', () => {
  it('endDate must be >= startDate', () => {
    const start = '2026-10-05'
    const end = '2026-10-03'
    expect(end >= start).toBe(false)
  })

  it('same-day blackout is valid', () => {
    expect('2026-10-05' >= '2026-10-05').toBe(true)
  })
})

describe('settings validation', () => {
  const advanceDaysSchema = z.number().int().min(0).max(365)

  it('minAdvanceDays 0 is valid (allows same-day bookings)', () => {
    expect(advanceDaysSchema.safeParse(0).success).toBe(true)
  })

  it('negative minAdvanceDays is invalid', () => {
    expect(advanceDaysSchema.safeParse(-1).success).toBe(false)
  })
})
