import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const bodySchema = z.object({
  reassignments: z.array(z.object({
    assignmentBedId: z.string().uuid(),
    newBedId: z.string().uuid(),
  })).default([]),
  cancelBookingIds: z.array(z.string().uuid()).default([]),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json().catch(() => null)
  const parsed = bodySchema.safeParse(body ?? {})
  if (!parsed.success) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  const { reassignments, cancelBookingIds } = parsed.data

  const admin = createAdminClient()

  // Reassign beds.
  for (const r of reassignments) {
    await admin
      .from('assignment_beds')
      .update({ bed_id: r.newBedId })
      .eq('id', r.assignmentBedId)
  }

  // Cancel bookings (reuse cancel logic: update request + deactivate assignment beds).
  for (const bookingId of cancelBookingIds) {
    await admin.from('booking_requests').update({ status: 'cancelled' }).eq('id', bookingId)
    const { data: assignments } = await admin
      .from('booking_assignments')
      .select('id')
      .eq('booking_request_id', bookingId)
      .eq('status', 'confirmed')
    if (assignments && assignments.length > 0) {
      const assignIds = assignments.map((a) => a.id)
      await admin.from('booking_assignments').update({ status: 'cancelled' }).in('id', assignIds)
      await admin.from('assignment_beds').update({ is_active: false }).in('booking_assignment_id', assignIds)
    }
    await admin.from('booking_events').insert({
      booking_request_id: bookingId,
      house_id: (await admin.from('booking_requests').select('house_id').eq('id', bookingId).single()).data?.house_id,
      actor_id: user.id,
      event_type: 'cancelled',
      new_value: { reason: 'Bed retired' },
    })
  }

  // Verify no remaining active future assignments for this bed.
  const today = new Date().toISOString().slice(0, 10)
  const { data: remaining } = await admin
    .from('assignment_beds')
    .select('id')
    .eq('bed_id', id)
    .eq('is_active', true)
    .gt('check_out_date', today)
    .limit(1)

  if (remaining && remaining.length > 0) {
    return NextResponse.json(
      { error: 'Bed still has future assignments. Reassign or cancel all before retiring.' },
      { status: 422 }
    )
  }

  // Soft-retire the bed.
  await admin.from('beds').update({ is_active: false }).eq('id', id)
  return NextResponse.json({ ok: true })
}
