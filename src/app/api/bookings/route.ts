import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createBookingSchema } from '@/lib/validations/booking'
import { sendBookingConfirmation } from '@/lib/email'
import { env } from '@/lib/env'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const parsed = createBookingSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', fields: parsed.error.flatten().fieldErrors },
      { status: 422 },
    )
  }

  const { checkInDate, checkOutDate, attendeeMemberIds, modulePreferenceId, notes } = parsed.data
  const adminClient = createAdminClient()

  // Resolve the caller's active family
  const { data: membership } = await adminClient
    .from('family_members')
    .select('family_id, house_id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle()

  if (!membership) {
    return NextResponse.json(
      { error: 'You must be part of an active family to make a booking' },
      { status: 400 },
    )
  }

  // Verify all attendees belong to this family
  const { data: members } = await adminClient
    .from('family_members')
    .select('id')
    .eq('family_id', membership.family_id)
    .eq('is_active', true)
    .in('id', attendeeMemberIds)

  if ((members ?? []).length !== attendeeMemberIds.length) {
    return NextResponse.json(
      { error: 'One or more attendees do not belong to your family' },
      { status: 400 },
    )
  }

  // Enforce min_advance_days in the house timezone
  const { data: settings } = await adminClient
    .from('house_settings')
    .select('min_advance_days')
    .eq('house_id', membership.house_id)
    .single()

  const { data: house } = await adminClient
    .from('houses')
    .select('timezone')
    .eq('id', membership.house_id)
    .single()

  const minDays = settings?.min_advance_days ?? 7
  const tz = house?.timezone ?? 'UTC'
  const todayInTz = new Date().toLocaleDateString('en-CA', { timeZone: tz }) // yyyy-mm-dd
  const diffDays =
    (new Date(checkInDate + 'T00:00:00').getTime() -
      new Date(todayInTz + 'T00:00:00').getTime()) /
    86_400_000

  if (diffDays < minDays) {
    return NextResponse.json(
      { error: `Check-in must be at least ${minDays} days from today` },
      { status: 400 },
    )
  }

  // Create the booking request
  const { data: booking, error: bookingError } = await adminClient
    .from('booking_requests')
    .insert({
      house_id: membership.house_id,
      family_id: membership.family_id,
      check_in_date: checkInDate,
      check_out_date: checkOutDate,
      attendee_count: attendeeMemberIds.length,
      module_preference: modulePreferenceId ?? null,
      notes: notes ?? null,
      status: 'pending',
    })
    .select('id')
    .single()

  if (bookingError || !booking) {
    console.error('[bookings] create error:', bookingError)
    return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 })
  }

  // Insert attendees
  const { error: attendeesError } = await adminClient
    .from('booking_attendees')
    .insert(
      attendeeMemberIds.map((memberId) => ({
        booking_request_id: booking.id,
        family_member_id: memberId,
      })),
    )

  if (attendeesError) {
    console.error('[bookings] attendees error:', attendeesError)
    await adminClient.from('booking_requests').delete().eq('id', booking.id)
    return NextResponse.json({ error: 'Failed to record attendees' }, { status: 500 })
  }

  // Append event log
  await adminClient.from('booking_events').insert({
    booking_request_id: booking.id,
    house_id: membership.house_id,
    actor_id: user.id,
    event_type: 'created',
    new_value: {
      checkInDate,
      checkOutDate,
      attendeeCount: attendeeMemberIds.length,
      status: 'pending',
    },
  })

  // Fire-and-forget confirmation email (failure does not roll back the booking)
  const { data: headProfile } = await adminClient
    .from('user_profiles')
    .select('email')
    .eq('id', user.id)
    .single()

  const { data: houseForEmail } = await adminClient
    .from('houses')
    .select('name')
    .eq('id', membership.house_id)
    .single()

  if (headProfile && houseForEmail) {
    sendBookingConfirmation({
      to: headProfile.email,
      houseName: houseForEmail.name,
      checkInDate,
      checkOutDate,
      attendeeCount: attendeeMemberIds.length,
      bookingId: booking.id,
      appUrl: env.NEXT_PUBLIC_APP_URL,
    }).catch(() => {})
  }

  return NextResponse.json({ bookingId: booking.id }, { status: 201 })
}
