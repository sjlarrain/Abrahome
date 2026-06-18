import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import AssignmentPanel from './AssignmentPanel'
import { RejectButton, AdminCancelButton } from './AdminBookingActions'

export const metadata: Metadata = { title: 'Booking Detail — Abrahome Admin' }

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-600',
}

export default async function AdminBookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const admin = createAdminClient()

  const { data: booking } = await admin
    .from('booking_requests')
    .select(`
      id, check_in_date, check_out_date, attendee_count, status,
      rejection_reason, notes, created_at, family_id, house_id,
      module_preference,
      families(name),
      houses(name, timezone)
    `)
    .eq('id', id)
    .maybeSingle()

  if (!booking) notFound()

  const [{ data: attendees }, { data: events }, { data: assignment }] = await Promise.all([
    admin
      .from('booking_attendees')
      .select('family_member_id, family_members(full_name, relationship)')
      .eq('booking_request_id', id),
    admin
      .from('booking_events')
      .select('event_type, created_at, actor_id')
      .eq('booking_request_id', id)
      .order('created_at', { ascending: true }),
    admin
      .from('booking_assignments')
      .select('id, status, assigned_at, notes, assignment_beds(bed_id, beds(name, rooms(name)))')
      .eq('booking_request_id', id)
      .maybeSingle(),
  ])

  const familyRaw = booking.families
  const familyName = Array.isArray(familyRaw)
    ? (familyRaw[0] as { name: string } | undefined)?.name ?? '—'
    : (familyRaw as { name: string } | null)?.name ?? '—'

  const houseRaw = booking.houses
  const houseName = Array.isArray(houseRaw)
    ? (houseRaw[0] as { name: string } | undefined)?.name ?? '—'
    : (houseRaw as { name: string } | null)?.name ?? '—'

  const isPending = booking.status === 'pending'
  const isActive = booking.status === 'pending' || booking.status === 'confirmed'

  return (
    <div className="max-w-3xl">
      <Link href="/admin/bookings" className="text-xs text-gray-400 hover:text-gray-600">
        ← Pending bookings
      </Link>

      <div className="mt-3 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {booking.check_in_date} → {booking.check_out_date}
          </h1>
          <p className="mt-1 text-sm text-gray-500">{familyName} · {houseName}</p>
        </div>
        <span
          className={`mt-1 inline-flex rounded-full px-3 py-1 text-xs font-medium capitalize ${STATUS_BADGE[booking.status] ?? ''}`}
        >
          {booking.status}
        </span>
      </div>

      <div className="mt-6 space-y-6">
        {/* Details */}
        <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">Details</h2>
          <dl className="space-y-3 text-sm">
            <Row label="Family" value={familyName} />
            <Row label="Check-in" value={booking.check_in_date} />
            <Row label="Check-out" value={booking.check_out_date} />
            <Row label="Attendees" value={String(booking.attendee_count)} />
            {booking.module_preference && <Row label="Module pref." value={booking.module_preference} />}
            {booking.notes && <Row label="Notes" value={booking.notes} />}
            {booking.rejection_reason && <Row label="Rejection reason" value={booking.rejection_reason} />}
          </dl>
        </div>

        {/* Attendees */}
        <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">Attendees</h2>
          <ul className="space-y-2">
            {(attendees ?? []).map((a) => {
              const raw = a.family_members
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

        {/* Current assignment (if confirmed) */}
        {assignment && (
          <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">Assignment</h2>
            <ul className="space-y-1 text-sm">
              {(assignment.assignment_beds ?? []).map((ab) => {
                const bedRaw = ab.beds
                const bed = (Array.isArray(bedRaw) ? bedRaw[0] : bedRaw) as { name: string; rooms: { name: string } | { name: string }[] | null } | null
                const roomRaw = bed?.rooms
                const roomName = roomRaw == null ? '' : Array.isArray(roomRaw) ? (roomRaw[0] as { name: string })?.name : (roomRaw as { name: string }).name
                return (
                  <li key={ab.bed_id} className="text-gray-700">
                    {roomName && <span className="text-gray-400">{roomName} · </span>}
                    {bed?.name}
                  </li>
                )
              })}
            </ul>
            {assignment.notes && <p className="mt-3 text-xs text-gray-500">{assignment.notes}</p>}
          </div>
        )}

        {/* Bed assignment UI (pending only) */}
        {isPending && (
          <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
              Assign Beds
            </h2>
            <AssignmentPanel
              bookingId={booking.id}
              checkIn={booking.check_in_date}
              checkOut={booking.check_out_date}
              attendeeCount={booking.attendee_count}
            />
          </div>
        )}

        {/* Admin actions */}
        {isActive && (
          <div className="flex flex-wrap gap-3">
            {isPending && <RejectButton bookingId={booking.id} />}
            <AdminCancelButton bookingId={booking.id} />
          </div>
        )}

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
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-4">
      <dt className="w-36 shrink-0 text-gray-500">{label}</dt>
      <dd className="text-gray-900">{value}</dd>
    </div>
  )
}
