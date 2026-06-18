import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendBookingStatusUpdate } from '@/lib/email'
import { env } from '@/lib/env'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const adminClient = createAdminClient()

  const { data: booking } = await adminClient
    .from('booking_requests')
    .select('id, family_id, house_id, status, check_in_date, check_out_date')
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

  if (booking.status === 'cancelled' || booking.status === 'rejected') {
    return NextResponse.json({ error: 'Booking is already cancelled or rejected' }, { status: 400 })
  }

  // Check cancellation deadline
  const { data: settings } = await adminClient
    .from('house_settings')
    .select('cancellation_deadline_days')
    .eq('house_id', booking.house_id)
    .single()

  const { data: house } = await adminClient
    .from('houses')
    .select('timezone, name')
    .eq('id', booking.house_id)
    .single()

  const tz = house?.timezone ?? 'UTC'
  const deadlineDays = settings?.cancellation_deadline_days ?? 1
  const todayInTz = new Date().toLocaleDateString('en-CA', { timeZone: tz })
  const daysUntilCheckIn =
    (new Date(booking.check_in_date + 'T00:00:00').getTime() -
      new Date(todayInTz + 'T00:00:00').getTime()) /
    86_400_000

  if (daysUntilCheckIn <= deadlineDays) {
    return NextResponse.json(
      { error: `Cancellations must be made more than ${deadlineDays} day(s) before check-in` },
      { status: 400 },
    )
  }

  const { error } = await adminClient
    .from('booking_requests')
    .update({ status: 'cancelled' })
    .eq('id', id)

  if (error) {
    console.error('[bookings/cancel] update error:', error)
    return NextResponse.json({ error: 'Failed to cancel booking' }, { status: 500 })
  }

  await adminClient.from('booking_events').insert({
    booking_request_id: id,
    house_id: booking.house_id,
    actor_id: user.id,
    event_type: 'cancelled',
  })

  // Fire-and-forget email
  const { data: profile } = await adminClient
    .from('user_profiles')
    .select('email')
    .eq('id', user.id)
    .single()

  if (profile && house) {
    sendBookingStatusUpdate({
      to: profile.email,
      houseName: house.name,
      checkInDate: booking.check_in_date,
      checkOutDate: booking.check_out_date,
      bookingId: id,
      appUrl: env.NEXT_PUBLIC_APP_URL,
      status: 'cancelled',
    }).catch(() => {})
  }

  return NextResponse.json({ ok: true })
}
