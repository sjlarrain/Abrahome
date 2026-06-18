import type { Metadata } from 'next'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'

export const metadata: Metadata = { title: 'Calendar — Abrahome Admin' }

const PALETTE = [
  'bg-blue-100 text-blue-800',
  'bg-green-100 text-green-800',
  'bg-purple-100 text-purple-800',
  'bg-orange-100 text-orange-800',
  'bg-pink-100 text-pink-800',
  'bg-teal-100 text-teal-800',
  'bg-yellow-100 text-yellow-800',
  'bg-red-100 text-red-800',
]

function familyColour(familyId: string): string {
  let hash = 0
  for (let i = 0; i < familyId.length; i++) hash = (hash * 31 + familyId.charCodeAt(i)) | 0
  return PALETTE[Math.abs(hash) % PALETTE.length]
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

export default async function AdminCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>
}) {
  const sp = await searchParams
  const now = new Date()
  const year = parseInt(sp.year ?? String(now.getFullYear()), 10)
  const month = parseInt(sp.month ?? String(now.getMonth()), 10) // 0-indexed

  const firstDay = `${year}-${String(month + 1).padStart(2, '0')}-01`
  const lastDay = `${year}-${String(month + 1).padStart(2, '0')}-${String(daysInMonth(year, month)).padStart(2, '0')}`

  const admin = createAdminClient()
  const { data: bookings } = await admin
    .from('booking_requests')
    .select('id, check_in_date, check_out_date, status, family_id, families(name)')
    .in('status', ['pending', 'confirmed'])
    .lt('check_in_date', lastDay)
    .gt('check_out_date', firstDay)

  // Build a map: date string → list of {familyName, status, id, familyId}
  const dayMap: Record<string, { id: string; familyName: string; status: string; familyId: string }[]> = {}

  for (let d = 1; d <= daysInMonth(year, month); d++) {
    const ymd = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    dayMap[ymd] = []
  }

  for (const b of bookings ?? []) {
    const familyRaw = b.families
    const familyName = Array.isArray(familyRaw)
      ? (familyRaw[0] as { name: string } | undefined)?.name ?? '?'
      : (familyRaw as { name: string } | null)?.name ?? '?'

    for (let d = 1; d <= daysInMonth(year, month); d++) {
      const ymd = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      // half-open: check_in <= day < check_out
      if (ymd >= b.check_in_date && ymd < b.check_out_date) {
        dayMap[ymd].push({ id: b.id, familyName, status: b.status, familyId: b.family_id })
      }
    }
  }

  const prevMonth = month === 0 ? `?year=${year - 1}&month=11` : `?year=${year}&month=${month - 1}`
  const nextMonth = month === 11 ? `?year=${year + 1}&month=0` : `?year=${year}&month=${month + 1}`
  const monthName = new Date(year, month).toLocaleString('default', { month: 'long', year: 'numeric' })
  const firstDayOfWeek = new Date(year, month, 1).getDay()
  const total = daysInMonth(year, month)

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
        <div className="flex items-center gap-4">
          <Link href={prevMonth} className="rounded px-2 py-1 text-sm text-gray-500 hover:bg-gray-100">‹ Prev</Link>
          <span className="text-sm font-semibold text-gray-700">{monthName}</span>
          <Link href={nextMonth} className="rounded px-2 py-1 text-sm text-gray-500 hover:bg-gray-100">Next ›</Link>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
        <div className="grid grid-cols-7 divide-x divide-gray-100 border-b border-gray-200 bg-gray-50">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d} className="py-2 text-center text-xs font-medium text-gray-500">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 divide-x divide-y divide-gray-100">
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`e-${i}`} className="min-h-20 bg-gray-50" />
          ))}
          {Array.from({ length: total }).map((_, i) => {
            const day = i + 1
            const ymd = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const entries = dayMap[ymd] ?? []
            return (
              <div key={ymd} className="min-h-20 p-1.5">
                <p className="mb-1 text-xs font-medium text-gray-400">{day}</p>
                <div className="space-y-0.5">
                  {entries.map((e) => (
                    <Link
                      key={e.id}
                      href={`/admin/bookings/${e.id}`}
                      className={`block truncate rounded px-1 py-0.5 text-xs font-medium ${familyColour(e.familyId)}`}
                    >
                      {e.familyName}
                      {e.status === 'pending' && <span className="ml-1 opacity-60">·</span>}
                    </Link>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="mt-4 flex gap-4 text-xs text-gray-500">
        <span>Solid = confirmed</span>
        <span>· dot = pending</span>
      </div>
    </div>
  )
}
