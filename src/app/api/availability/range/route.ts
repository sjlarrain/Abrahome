import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { heldBedsByDay, enumerateDays, type HeldRequest } from '@/lib/availability'

const isoDate = z.string().date()

const rangeQuerySchema = z
  .object({ startDate: isoDate, endDate: isoDate })
  .refine((v) => v.endDate >= v.startDate, {
    message: 'endDate must be on or after startDate',
    path: ['endDate'],
  })

// Cap the window so a malformed request can't enumerate an unbounded range.
const MAX_RANGE_DAYS = 92

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const parsed = rangeQuerySchema.safeParse({
    startDate: searchParams.get('startDate'),
    endDate: searchParams.get('endDate'),
  })

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid date range', fields: parsed.error.flatten().fieldErrors },
      { status: 400 },
    )
  }

  const { startDate, endDate } = parsed.data
  const days = enumerateDays(startDate, endDate)
  if (days.length > MAX_RANGE_DAYS) {
    return NextResponse.json(
      { error: `Range cannot exceed ${MAX_RANGE_DAYS} days` },
      { status: 400 },
    )
  }

  const adminClient = createAdminClient()

  const { data: house } = await adminClient
    .from('houses')
    .select('id')
    .limit(1)
    .maybeSingle()

  if (!house) return NextResponse.json({ error: 'No house configured' }, { status: 404 })

  const { count: totalBeds } = await adminClient
    .from('beds')
    .select('*', { count: 'exact', head: true })
    .eq('house_id', house.id)
    .eq('is_active', true)

  // One query for every request overlapping the window, then bucket per day.
  const { data: overlapping } = await adminClient
    .from('booking_requests')
    .select('check_in_date, check_out_date, attendee_count')
    .eq('house_id', house.id)
    .in('status', ['pending', 'confirmed'])
    .lte('check_in_date', endDate)
    .gt('check_out_date', startDate)

  const heldByDay = heldBedsByDay((overlapping ?? []) as HeldRequest[], days)

  return NextResponse.json({ totalBeds: totalBeds ?? 0, days: heldByDay })
}
