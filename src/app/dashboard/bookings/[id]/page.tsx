import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { CancelButton, ModifyAttendeesForm } from './BookingActions'

export const metadata: Metadata = { title: 'Booking — Abrahome' }

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-600',
}

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Use the user's client — RLS ensures they can only see their own family's bookings
  const { data: booking } = await supabase
    .from('booking_requests')
    .select(`
      id, check_in_date, check_out_date, attendee_count, status,
      rejection_reason, notes, created_at, family_id, house_id,
      module_preference
    `)
    .eq('id', id)
    .maybeSingle()

  if (!booking) notFound()

  const adminClient = createAdminClient()
  const [{ data: attendees }, { data: events }, { data: allMembers }, { data: settings }, { data: house }] =
    await Promise.all([
      adminClient
        .from('booking_attendees')
        .select('family_member_id, family_members_safe(full_name, relationship)')
        .eq('booking_request_id', id),
      adminClient
        .from('booking_events')
        .select('event_type, created_at, actor_id')
        .eq('booking_request_id', id)
        .order('created_at', { ascending: true }),
      adminClient
        .from('family_members')
        .select('id, full_name, relationship')
        .eq('family_id', booking.family_id)
        .eq('is_active', true),
      adminClient
        .from('house_settings')
        .select('cancellation_deadline_days')
        .eq('house_id', booking.house_id)
        .single(),
      adminClient
        .from('houses')
        .select('timezone')
        .eq('id', booking.house_id)
        .single(),
    ])

  // Can cancel if pending or confirmed, and within deadline
  const tz = house?.timezone ?? 'UTC'
  const deadlineDays = settings?.cancellation_deadline_days ?? 1
  const todayInTz = new Date().toLocaleDateString('en-CA', { timeZone: tz })
  const daysUntilCheckIn =
    (new Date(booking.check_in_date + 'T00:00:00').getTime() -
      new Date(todayInTz + 'T00:00:00').getTime()) /
    86_400_000
  const canCancel =
    (booking.status === 'pending' || booking.status === 'confirmed') &&
    daysUntilCheckIn > deadlineDays

  const currentAttendeeIds = (attendees ?? []).map((a) => a.family_member_id)

  return (
    <div className="max-w-2xl">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <Link href="/dashboard/bookings" className="text-xs text-gray-400 hover:text-gray-600">
            ← My bookings
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">
            {booking.check_in_date} → {booking.check_out_date}
          </h1>
        </div>
        <span
          className={`mt-1 inline-flex rounded-full px-3 py-1 text-xs font-medium capitalize ${STATUS_BADGE[booking.status] ?? ''}`}
        >
          {booking.status}
        </span>
      </div>

      <div className="space-y-6">
        {/* Details */}
        <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">Details</h2>
          <dl className="space-y-3 text-sm">
            <Row label="Check-in" value={booking.check_in_date} />
            <Row label="Check-out" value={booking.check_out_date} />
            <Row label="Attendees" value={String(booking.attendee_count)} />
            {booking.notes && <Row label="Notes" value={booking.notes} />}
            {booking.rejection_reason && (
              <Row label="Rejection reason" value={booking.rejection_reason} />
            )}
          </dl>
        </div>

        {/* Attendees */}
        <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">Attendees</h2>
          <ul className="space-y-2">
            {(attendees ?? []).map((a) => {
              const raw = a.family_members_safe
              const member = (Array.isArray(raw) ? raw[0] : raw) as { full_name: string; relationship: string } | null
              return (
                <li key={a.family_member_id} className="flex items-center gap-2 text-sm">
                  <span className="font-medium text-gray-900">{member?.full_name}</span>
                  <span className="text-xs capitalize text-gray-400">{member?.relationship}</span>
                </li>
              )
            })}
          </ul>
        </div>

        {/* Event log */}
        <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">History</h2>
          <ol className="space-y-3">
            {(events ?? []).map((e, i) => (
              <li key={i} className="flex gap-3 text-xs text-gray-500">
                <span className="shrink-0">{new Date(e.created_at).toLocaleString()}</span>
                <span className="capitalize text-gray-700">{e.event_type.replace(/_/g, ' ')}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Actions */}
        {(canCancel || booking.status === 'confirmed') && (
          <div className="flex flex-wrap gap-3">
            {canCancel && <CancelButton bookingId={booking.id} />}
            {booking.status === 'confirmed' && (
              <ModifyAttendeesForm
                bookingId={booking.id}
                members={allMembers ?? []}
                currentAttendeeIds={currentAttendeeIds}
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-4">
      <dt className="w-32 shrink-0 text-gray-500">{label}</dt>
      <dd className="text-gray-900">{value}</dd>
    </div>
  )
}
