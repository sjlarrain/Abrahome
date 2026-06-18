import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'My bookings — Abrahome' }

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-600',
}

export default async function MyBookingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: membership } = await supabase
    .from('family_members_safe')
    .select('family_id')
    .eq('user_id', user!.id)
    .eq('is_active', true)
    .maybeSingle()

  if (!membership) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My bookings</h1>
        <p className="mt-4 text-sm text-gray-500">
          You are not part of a family yet.{' '}
          <Link href="/dashboard/family/new" className="text-blue-600 hover:underline">
            Create one
          </Link>
        </p>
      </div>
    )
  }

  const { data: bookings } = await supabase
    .from('booking_requests')
    .select('id, check_in_date, check_out_date, attendee_count, status, created_at')
    .eq('family_id', membership.family_id)
    .order('check_in_date', { ascending: false })

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">My bookings</h1>
        <Link
          href="/dashboard/bookings/new"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          New request
        </Link>
      </div>

      {(bookings ?? []).length === 0 ? (
        <p className="text-sm text-gray-400">No booking requests yet.</p>
      ) : (
        <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3">Check-in</th>
                <th className="px-4 py-3">Check-out</th>
                <th className="px-4 py-3">Attendees</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(bookings ?? []).map((b) => (
                <tr key={b.id}>
                  <td className="px-4 py-3 font-medium text-gray-900">{b.check_in_date}</td>
                  <td className="px-4 py-3 text-gray-500">{b.check_out_date}</td>
                  <td className="px-4 py-3 text-gray-500">{b.attendee_count}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_BADGE[b.status] ?? ''}`}
                    >
                      {b.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/dashboard/bookings/${b.id}`}
                      className="text-blue-600 hover:underline text-xs"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
