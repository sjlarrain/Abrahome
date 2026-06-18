import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { moduleSchema } from '@/lib/validations/house'
import { z } from 'zod'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from('user_profiles').select('role, id').eq('id', user.id).single()
  if (profile?.role !== 'admin') return null
  return profile
}

const createModuleSchema = moduleSchema.extend({
  houseId: z.string().uuid(),
})

export async function POST(request: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const parsed = createModuleSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', fields: parsed.error.flatten().fieldErrors },
      { status: 422 },
    )
  }

  const adminClient = createAdminClient()
  const { data: module, error } = await adminClient
    .from('modules')
    .insert({
      house_id: parsed.data.houseId,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      sort_order: parsed.data.sortOrder,
    })
    .select('id, name, sort_order')
    .single()

  if (error) {
    console.error('[admin/modules] create error:', error)
    return NextResponse.json({ error: 'Failed to create module' }, { status: 500 })
  }

  return NextResponse.json({ module }, { status: 201 })
}
