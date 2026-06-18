import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { modifyAttendeesSchema } from '@/lib/validations/booking'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const parsed = modifyAttendeesSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', fields: parsed.error.flatten().fieldErrors },
      { status: 422 },
    )
  }

  const { attendeeMemberIds } = parsed.data
  const adminClient = createAdminClient()

  const { data: booking } = await adminClient
    .from('booking_requests')
    .select('id, family_id, house_id, status, attendee_count')
    .eq('id', id)
    .maybeSingle()

  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

  // Verify caller is in this family
  const { data: membership } = await adminClient
    .from('family_members')
    .select('id')
    .eq('family_id', booking.family_id)
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle()

  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (booking.status !== 'confirmed') {
    return NextResponse.json(
      { error: 'Attendees can only be modified on confirmed bookings' },
      { status: 400 },
    )
  }

  // Verify all attendees belong to this family
  const { data: validMembers } = await adminClient
    .from('family_members')
    .select('id')
    .eq('family_id', booking.family_id)
    .eq('is_active', true)
    .in('id', attendeeMemberIds)

  if ((validMembers ?? []).length !== attendeeMemberIds.length) {
    return NextResponse.json(
      { error: 'One or more attendees do not belong to your family' },
      { status: 400 },
    )
  }

  // Fetch old attendees for the event log
  const { data: oldAttendees } = await adminClient
    .from('booking_attendees')
    .select('family_member_id')
    .eq('booking_request_id', id)

  const oldIds = (oldAttendees ?? []).map((a) => a.family_member_id)

  // Replace attendees: delete all then re-insert
  await adminClient.from('booking_attendees').delete().eq('booking_request_id', id)
  await adminClient.from('booking_attendees').insert(
    attendeeMemberIds.map((memberId) => ({
      booking_request_id: id,
      family_member_id: memberId,
    })),
  )

  // Re-sync attendee_count on the request
  await adminClient
    .from('booking_requests')
    .update({ attendee_count: attendeeMemberIds.length })
    .eq('id', id)

  // Also sync count on the assignment if one exists
  await adminClient
    .from('booking_assignments')
    .update({ attendee_count: attendeeMemberIds.length })
    .eq('booking_request_id', id)

  await adminClient.from('booking_events').insert({
    booking_request_id: id,
    house_id: booking.house_id,
    actor_id: user.id,
    event_type: 'attendees_modified',
    old_value: { attendeeMemberIds: oldIds },
    new_value: { attendeeMemberIds },
  })

  return NextResponse.json({ ok: true })
}
