import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { availabilityQuerySchema } from '@/lib/validations/booking'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const parsed = availabilityQuerySchema.safeParse({
    checkInDate: searchParams.get('checkInDate'),
    checkOutDate: searchParams.get('checkOutDate'),
  })

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid date range', fields: parsed.error.flatten().fieldErrors },
      { status: 400 },
    )
  }

  const { checkInDate, checkOutDate } = parsed.data
  const adminClient = createAdminClient()

  // Get the house (MVP: one house)
  const { data: house } = await adminClient
    .from('houses')
    .select('id')
    .limit(1)
    .maybeSingle()

  if (!house) return NextResponse.json({ error: 'No house configured' }, { status: 404 })

  // Total active beds
  const { count: totalBeds } = await adminClient
    .from('beds')
    .select('*', { count: 'exact', head: true })
    .eq('house_id', house.id)
    .eq('is_active', true)

  // Held beds: sum of attendee_count for pending/confirmed requests that overlap
  // the query window. Uses the same half-open interval: reqIn < qOut AND reqOut > qIn
  const { data: overlapping } = await adminClient
    .from('booking_requests')
    .select('attendee_count')
    .eq('house_id', house.id)
    .in('status', ['pending', 'confirmed'])
    .lt('check_in_date', checkOutDate)
    .gt('check_out_date', checkInDate)

  const heldBeds = (overlapping ?? []).reduce(
    (sum, r) => sum + (r.attendee_count as number),
    0,
  )

  const total = totalBeds ?? 0
  const available = Math.max(0, total - heldBeds)

  return NextResponse.json({
    totalBeds: total,
    heldBeds,
    availableBeds: available,
    checkInDate,
    checkOutDate,
  })
}
