import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { roomSchema } from '@/lib/validations/house'

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

  const parsed = roomSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', fields: parsed.error.flatten().fieldErrors },
      { status: 422 },
    )
  }

  const adminClient = createAdminClient()

  // Resolve house_id from the module
  const { data: mod } = await adminClient
    .from('modules').select('house_id').eq('id', parsed.data.moduleId).single()
  if (!mod) return NextResponse.json({ error: 'Module not found' }, { status: 404 })

  const { data: room, error } = await adminClient
    .from('rooms')
    .insert({
      module_id: parsed.data.moduleId,
      house_id: mod.house_id,
      name: parsed.data.name,
      room_type: parsed.data.roomType,
      bathroom_type: parsed.data.bathroomType,
      sort_order: parsed.data.sortOrder,
    })
    .select('id, name, room_type, bathroom_type')
    .single()

  if (error) {
    console.error('[admin/rooms] create error:', error)
    return NextResponse.json({ error: 'Failed to create room' }, { status: 500 })
  }

  return NextResponse.json({ room }, { status: 201 })
}
