/**
 * Pure availability helpers shared by the API route and its tests.
 *
 * Dates are ISO `yyyy-mm-dd` strings; lexicographic comparison equals
 * chronological comparison for this format, so no Date objects are needed.
 */

export type HeldRequest = {
  check_in_date: string
  check_out_date: string
  attendee_count: number
}

/**
 * For each requested night, sum the attendee_count of every booking request
 * that covers that night. A request covers night D under the half-open
 * interval [check_in, check_out): check_in <= D < check_out — the same rule
 * the DB EXCLUDE constraint uses.
 */
export function heldBedsByDay(
  requests: HeldRequest[],
  days: string[],
): Record<string, number> {
  const result: Record<string, number> = {}
  for (const day of days) {
    let sum = 0
    for (const r of requests) {
      if (r.check_in_date <= day && day < r.check_out_date) {
        sum += r.attendee_count
      }
    }
    result[day] = sum
  }
  return result
}

/** Inclusive list of `yyyy-mm-dd` dates from start to end (UTC-safe). */
export function enumerateDays(startDate: string, endDate: string): string[] {
  const days: string[] = []
  const cur = new Date(startDate + 'T00:00:00Z')
  const end = new Date(endDate + 'T00:00:00Z')
  while (cur <= end) {
    days.push(cur.toISOString().slice(0, 10))
    cur.setUTCDate(cur.getUTCDate() + 1)
  }
  return days
}
