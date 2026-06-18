import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const patchSchema = z.object({
  minAdvanceDays: z.number().int().min(0).max(365).optional(),
  cancellationDeadlineDays: z.number().int().min(0).max(365).optional(),
  maxStayNights: z.number().int().min(1).max(365).optional(),
  maxAttendees: z.number().int().min(1).max(500).optional(),
}).refine((d) => Object.keys(d).length > 0, { message: 'At least one field required' })

export async function PATCH(req: NextRequest) {
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
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid body' }, { status: 400 })

  const admin = createAdminClient()
  const { data: house } = await admin.from('houses').select('id').limit(1).single()
  if (!house) return NextResponse.json({ error: 'No house configured' }, { status: 422 })

  const updates: Record<string, number> = {}
  if (parsed.data.minAdvanceDays !== undefined) updates.min_advance_days = parsed.data.minAdvanceDays
  if (parsed.data.cancellationDeadlineDays !== undefined) updates.cancellation_deadline_days = parsed.data.cancellationDeadlineDays
  if (parsed.data.maxStayNights !== undefined) updates.max_stay_nights = parsed.data.maxStayNights
  if (parsed.data.maxAttendees !== undefined) updates.max_attendees = parsed.data.maxAttendees

  const { error } = await admin
    .from('house_settings')
    .update(updates)
    .eq('house_id', house.id)

  if (error) return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
