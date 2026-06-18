import type { Metadata } from 'next'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'

export const metadata: Metadata = { title: 'Pending Bookings — Abrahome Admin' }

export default async function AdminBookingsPage() {
  const admin = createAdminClient()
  const { data: bookings } = await admin
    .from('booking_requests')
    .select('id, check_in_date, check_out_date, attendee_count, created_at, module_preference, family_id, families(name)')
    .eq('status', 'pending')
    .order('check_in_date', { ascending: true })
    .order('created_at', { ascending: true })

  const now = new Date().getTime()

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Pending Bookings</h1>
      <p className="mt-1 text-sm text-gray-500">{bookings?.length ?? 0} request{bookings?.length !== 1 ? 's' : ''} awaiting assignment</p>

      <div className="mt-6 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
        {!bookings || bookings.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-gray-400">No pending requests.</p>
        ) : (
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Family</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Check-in</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Check-out</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Nights</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Attendees</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Module pref.</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Hold age</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {bookings.map((b) => {
                const nights =
                  (new Date(b.check_out_date).getTime() - new Date(b.check_in_date).getTime()) /
                  86_400_000
                const holdDays = Math.floor((now - new Date(b.created_at).getTime()) / 86_400_000)
                const stale = holdDays >= 7
                const familyRaw = b.families
                const familyName =
                  familyRaw == null
                    ? '—'
                    : Array.isArray(familyRaw)
                    ? (familyRaw[0] as { name: string } | undefined)?.name ?? '—'
                    : (familyRaw as { name: string }).name
                return (
                  <tr key={b.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{familyName}</td>
                    <td className="px-4 py-3 text-gray-700">{b.check_in_date}</td>
                    <td className="px-4 py-3 text-gray-700">{b.check_out_date}</td>
                    <td className="px-4 py-3 text-gray-700">{nights}</td>
                    <td className="px-4 py-3 text-gray-700">{b.attendee_count}</td>
                    <td className="px-4 py-3 text-gray-500">{b.module_preference ?? '—'}</td>
                    <td className={`px-4 py-3 font-medium ${stale ? 'text-red-600' : 'text-gray-500'}`}>
                      {holdDays}d{stale ? ' ⚠' : ''}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/bookings/${b.id}`}
                        className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700"
                      >
                        Review
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
