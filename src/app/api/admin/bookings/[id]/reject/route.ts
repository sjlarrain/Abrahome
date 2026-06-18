import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendBookingStatusUpdate } from '@/lib/email'
import { env } from '@/lib/env'
import { z } from 'zod'

const bodySchema = z.object({
  reason: z.string().min(1).max(500),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json().catch(() => null)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Reason is required' }, { status: 400 })
  const { reason } = parsed.data

  const admin = createAdminClient()

  const { data: booking, error: fetchErr } = await admin
    .from('booking_requests')
    .select('id, status, check_in_date, check_out_date, family_id, house_id, houses(name)')
    .eq('id', id)
    .single()

  if (fetchErr || !booking) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (booking.status !== 'pending') {
    return NextResponse.json({ error: 'Booking is not pending' }, { status: 422 })
  }

  await admin
    .from('booking_requests')
    .update({ status: 'rejected', rejection_reason: reason })
    .eq('id', id)

  await admin.from('booking_events').insert({
    booking_request_id: id,
    house_id: booking.house_id,
    actor_id: user.id,
    event_type: 'rejected',
    new_value: { reason },
  })

  // Fire-and-forget email.
  const houseRaw = booking.houses
  const houseName = Array.isArray(houseRaw)
    ? (houseRaw[0] as { name: string } | undefined)?.name ?? 'the house'
    : (houseRaw as { name: string } | null)?.name ?? 'the house'

  void (async () => {
    try {
      const { data: heads } = await admin
        .from('user_profiles')
        .select('email')
        .eq('family_id', booking.family_id)
      const emails = (heads ?? []).map((h) => h.email).filter(Boolean)
      await Promise.all(
        emails.map((to) =>
          sendBookingStatusUpdate({
            to, houseName,
            checkInDate: booking.check_in_date,
            checkOutDate: booking.check_out_date,
            bookingId: id,
            appUrl: env.NEXT_PUBLIC_APP_URL,
            status: 'rejected',
            reason,
          }).catch(() => {})
        )
      )
    } catch { /* fire-and-forget */ }
  })()

  return NextResponse.json({ ok: true })
}
