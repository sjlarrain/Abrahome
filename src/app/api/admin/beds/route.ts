import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { bedSchema } from '@/lib/validations/house'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from('user_profiles').select('role, id').eq('id', user.id).single()
  if (profile?.role !== 'admin') return null
  return profile
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const parsed = bedSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', fields: parsed.error.flatten().fieldErrors },
      { status: 422 },
    )
  }

  const adminClient = createAdminClient()

  // Resolve house_id from the room
  const { data: room } = await adminClient
    .from('rooms').select('house_id').eq('id', parsed.data.roomId).single()
  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })

  const { data: bed, error } = await adminClient
    .from('beds')
    .insert({
      room_id: parsed.data.roomId,
      house_id: room.house_id,
      name: parsed.data.name,
      bed_type: parsed.data.bedType,
    })
    .select('id, name, bed_type')
    .single()

  if (error) {
    console.error('[admin/beds] create error:', error)
    return NextResponse.json({ error: 'Failed to create bed' }, { status: 500 })
  }

  return NextResponse.json({ bed }, { status: 201 })
}
