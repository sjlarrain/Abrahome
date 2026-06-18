import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const createSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().min(1).max(200),
  moduleId: z.string().uuid().optional(),
  roomId: z.string().uuid().optional(),
})

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') return null
  return user
}

export async function GET() {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = createAdminClient()
  const { data } = await admin
    .from('blackout_dates')
    .select('id, start_date, end_date, reason, module_id, room_id, modules(name), rooms(name)')
    .order('start_date', { ascending: true })

  return NextResponse.json({ blackouts: data ?? [] })
}

export async function POST(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json().catch(() => null)
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  const { startDate, endDate, reason, moduleId, roomId } = parsed.data

  if (endDate < startDate) {
    return NextResponse.json({ error: 'endDate must be >= startDate' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: house } = await admin.from('houses').select('id').limit(1).single()
  if (!house) return NextResponse.json({ error: 'No house configured' }, { status: 422 })

  const { data, error } = await admin.from('blackout_dates').insert({
    house_id: house.id,
    start_date: startDate,
    end_date: endDate,
    reason,
    module_id: moduleId ?? null,
    room_id: roomId ?? null,
    created_by: user.id,
  }).select('id').single()

  if (error) return NextResponse.json({ error: 'Failed to create' }, { status: 500 })
  return NextResponse.json({ id: data.id }, { status: 201 })
}
