import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const isoDate = z.string().date()

const waitlistSchema = z
  .object({
    checkInDate: isoDate,
    checkOutDate: isoDate,
    attendeeCount: z.number().int().min(1),
    notes: z.string().max(1000).optional(),
  })
  .refine((v) => v.checkOutDate > v.checkInDate, {
    message: 'Check-out must be after check-in',
    path: ['checkOutDate'],
  })

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const parsed = waitlistSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', fields: parsed.error.flatten().fieldErrors },
      { status: 422 },
    )
  }

  const { checkInDate, checkOutDate, attendeeCount, notes } = parsed.data
  const adminClient = createAdminClient()

  const { data: membership } = await adminClient
    .from('family_members')
    .select('family_id, house_id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle()

  if (!membership) {
    return NextResponse.json(
      { error: 'You must be part of an active family to join the waitlist' },
      { status: 400 },
    )
  }

  const { data: entry, error } = await adminClient
    .from('waitlist_requests')
    .insert({
      house_id: membership.house_id,
      family_id: membership.family_id,
      check_in_date: checkInDate,
      check_out_date: checkOutDate,
      attendee_count: attendeeCount,
      notes: notes ?? null,
      status: 'waiting',
    })
    .select('id')
    .single()

  if (error || !entry) {
    console.error('[waitlist] create error:', error)
    return NextResponse.json({ error: 'Failed to join waitlist' }, { status: 500 })
  }

  return NextResponse.json({ waitlistId: entry.id }, { status: 201 })
}
