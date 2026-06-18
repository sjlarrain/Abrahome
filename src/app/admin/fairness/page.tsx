import type { Metadata } from 'next'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'

export const metadata: Metadata = { title: 'Fairness — Abrahome Admin' }

export default async function FairnessPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>
}) {
  const sp = await searchParams
  const currentYear = new Date().getFullYear()
  const year = parseInt(sp.year ?? String(currentYear), 10)

  const startDate = `${year}-01-01`
  const endDate = `${year}-12-31`

  const admin = createAdminClient()
  const { data: bookings } = await admin
    .from('booking_requests')
    .select('family_id, check_in_date, check_out_date, attendee_count, families(name)')
    .eq('status', 'confirmed')
    .gte('check_in_date', startDate)
    .lte('check_in_date', endDate)

  // Aggregate per family
  const familyMap = new Map<string, {
    name: string
    bookings: number
    nights: number
    attendeeNights: number
  }>()

  for (const b of bookings ?? []) {
    const familyRaw = b.families
    const familyName = Array.isArray(familyRaw)
      ? (familyRaw[0] as { name: string } | undefined)?.name ?? '?'
      : (familyRaw as { name: string } | null)?.name ?? '?'

    const nights =
      (new Date(b.check_out_date).getTime() - new Date(b.check_in_date).getTime()) / 86_400_000

    const existing = familyMap.get(b.family_id)
    if (existing) {
      existing.bookings++
      existing.nights += nights
      existing.attendeeNights += nights * b.attendee_count
    } else {
      familyMap.set(b.family_id, {
        name: familyName,
        bookings: 1,
        nights,
        attendeeNights: nights * b.attendee_count,
      })
    }
  }

  const rows = Array.from(familyMap.entries())
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => b.nights - a.nights)

  const years = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1, currentYear + 2]

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Fairness</h1>
        <div className="flex gap-2">
          {years.map((y) => (
            <Link
              key={y}
              href={`?year=${y}`}
              className={`rounded px-3 py-1 text-sm font-medium ${
                y === year ? 'bg-blue-600 text-white' : 'bg-white ring-1 ring-gray-200 text-gray-600 hover:ring-blue-400'
              }`}
            >
              {y}
            </Link>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
        {rows.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-gray-400">No confirmed bookings for {year}.</p>
        ) : (
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Family</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Bookings</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Nights</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Attendee-nights</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{r.name}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{r.bookings}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{r.nights}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{r.attendeeNights}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
