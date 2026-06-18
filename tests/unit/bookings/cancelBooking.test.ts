import { describe, it, expect } from 'vitest'

// Pure date-logic helpers that mirror the API route's cancellation deadline check
function daysUntilCheckIn(checkInDate: string, todayDate: string): number {
  return (
    (new Date(checkInDate + 'T00:00:00').getTime() -
      new Date(todayDate + 'T00:00:00').getTime()) /
    86_400_000
  )
}

function canCancel(
  status: string,
  checkInDate: string,
  todayDate: string,
  deadlineDays: number,
): boolean {
  if (status !== 'pending' && status !== 'confirmed') return false
  return daysUntilCheckIn(checkInDate, todayDate) > deadlineDays
}

describe('cancellation deadline logic', () => {
  const deadline = 1 // 1 day before check-in

  it('allows cancellation well before the deadline', () => {
    expect(canCancel('pending', '2026-08-10', '2026-08-01', deadline)).toBe(true)
  })

  it('allows cancellation exactly one day beyond the deadline', () => {
    // 2 days before check-in, deadline = 1 → allowed
    expect(canCancel('pending', '2026-08-03', '2026-08-01', deadline)).toBe(true)
  })

  it('blocks cancellation exactly on the deadline day', () => {
    // 1 day before check-in, deadline = 1 → NOT allowed (must be > deadlineDays)
    expect(canCancel('pending', '2026-08-02', '2026-08-01', deadline)).toBe(false)
  })

  it('blocks cancellation after the deadline', () => {
    expect(canCancel('confirmed', '2026-08-01', '2026-08-01', deadline)).toBe(false)
  })

  it('does not allow cancellation of a rejected booking', () => {
    expect(canCancel('rejected', '2026-08-10', '2026-08-01', deadline)).toBe(false)
  })

  it('does not allow cancellation of an already-cancelled booking', () => {
    expect(canCancel('cancelled', '2026-08-10', '2026-08-01', deadline)).toBe(false)
  })
})

describe('modifyAttendeesSchema', () => {
  it('is tested via the validation module', async () => {
    const { modifyAttendeesSchema } = await import('@/lib/validations/booking')

    const valid = modifyAttendeesSchema.safeParse({
      attendeeMemberIds: ['11111111-0000-4000-8000-000000000001'],
    })
    expect(valid.success).toBe(true)

    const empty = modifyAttendeesSchema.safeParse({ attendeeMemberIds: [] })
    expect(empty.success).toBe(false)
  })
})
