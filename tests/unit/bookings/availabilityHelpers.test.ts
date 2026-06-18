import { describe, it, expect } from 'vitest'
import { heldBedsByDay, enumerateDays, type HeldRequest } from '@/lib/availability'

describe('enumerateDays', () => {
  it('returns an inclusive range', () => {
    expect(enumerateDays('2026-07-01', '2026-07-03')).toEqual([
      '2026-07-01',
      '2026-07-02',
      '2026-07-03',
    ])
  })

  it('returns a single day when start equals end', () => {
    expect(enumerateDays('2026-07-01', '2026-07-01')).toEqual(['2026-07-01'])
  })

  it('crosses month boundaries correctly', () => {
    expect(enumerateDays('2026-07-30', '2026-08-02')).toEqual([
      '2026-07-30',
      '2026-07-31',
      '2026-08-01',
      '2026-08-02',
    ])
  })

  it('handles a leap-year February boundary', () => {
    expect(enumerateDays('2028-02-28', '2028-03-01')).toEqual([
      '2028-02-28',
      '2028-02-29',
      '2028-03-01',
    ])
  })
})

describe('heldBedsByDay', () => {
  const requests: HeldRequest[] = [
    { check_in_date: '2026-07-01', check_out_date: '2026-07-04', attendee_count: 3 },
    { check_in_date: '2026-07-03', check_out_date: '2026-07-05', attendee_count: 2 },
  ]

  it('sums attendees for nights covered by a request (half-open interval)', () => {
    const result = heldBedsByDay(requests, [
      '2026-06-30',
      '2026-07-01',
      '2026-07-02',
      '2026-07-03',
      '2026-07-04',
      '2026-07-05',
    ])
    expect(result['2026-06-30']).toBe(0) // before any request
    expect(result['2026-07-01']).toBe(3) // first request only
    expect(result['2026-07-02']).toBe(3) // first request only
    expect(result['2026-07-03']).toBe(5) // both requests overlap
    expect(result['2026-07-04']).toBe(2) // first request checked out (half-open), second still in
    expect(result['2026-07-05']).toBe(0) // both checked out
  })

  it('excludes the check-out day itself (half-open)', () => {
    const single: HeldRequest[] = [
      { check_in_date: '2026-07-10', check_out_date: '2026-07-11', attendee_count: 4 },
    ]
    const result = heldBedsByDay(single, ['2026-07-10', '2026-07-11'])
    expect(result['2026-07-10']).toBe(4)
    expect(result['2026-07-11']).toBe(0)
  })

  it('returns zero for every day when there are no requests', () => {
    const result = heldBedsByDay([], ['2026-07-01', '2026-07-02'])
    expect(result).toEqual({ '2026-07-01': 0, '2026-07-02': 0 })
  })
})
