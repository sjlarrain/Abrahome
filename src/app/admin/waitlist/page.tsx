import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import WaitlistActions from './WaitlistActions'

export const metadata: Metadata = { title: 'Waitlist — Abrahome Admin' }

export default async function AdminWaitlistPage() {
  const admin = createAdminClient()
  const { data: requests } = await admin
    .from('waitlist_requests')
    .select('id, check_in_date, check_out_date, attendee_count, status, notes, created_at, families(name)')
    .in('status', ['waiting', 'offered'])
    .order('created_at', { ascending: true })

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Waitlist</h1>
      <p className="mt-1 text-sm text-gray-500">{requests?.length ?? 0} active request{requests?.length !== 1 ? 's' : ''}</p>

      <div className="mt-6 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
        {!requests || requests.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-gray-400">No waitlist requests.</p>
        ) : (
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Family</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Check-in</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Check-out</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Attendees</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Submitted</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {requests.map((r) => {
                const familyRaw = r.families
                const familyName = Array.isArray(familyRaw)
                  ? (familyRaw[0] as { name: string } | undefined)?.name ?? '—'
                  : (familyRaw as { name: string } | null)?.name ?? '—'
                return (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{familyName}</td>
                    <td className="px-4 py-3 text-gray-700">{r.check_in_date}</td>
                    <td className="px-4 py-3 text-gray-700">{r.check_out_date}</td>
                    <td className="px-4 py-3 text-gray-700">{r.attendee_count}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                        r.status === 'offered' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{new Date(r.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-right">
                      <WaitlistActions requestId={r.id} status={r.status} />
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
