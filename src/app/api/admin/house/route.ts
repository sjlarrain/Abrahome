import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { createHouseSchema } from '@/lib/validations/house'

async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, id')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') return null
  return profile
}

export async function GET() {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const adminClient = createAdminClient()
  const { data: house } = await adminClient
    .from('houses')
    .select('*, house_settings(*), modules(*, rooms(*, beds(*)))')
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  return NextResponse.json({ house: house ?? null })
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const parsed = createHouseSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', fields: parsed.error.flatten().fieldErrors },
      { status: 422 },
    )
  }

  const adminClient = createAdminClient()

  // Only one house is supported in MVP
  const { data: existing } = await adminClient
    .from('houses')
    .select('id')
    .limit(1)
    .single()

  if (existing) {
    return NextResponse.json({ error: 'House already exists' }, { status: 409 })
  }

  const { data: house, error: houseError } = await adminClient
    .from('houses')
    .insert({
      name: parsed.data.name,
      timezone: parsed.data.timezone,
      description: parsed.data.description ?? null,
      location: parsed.data.location ?? null,
      created_by: admin.id,
    })
    .select('id, name, timezone')
    .single()

  if (houseError || !house) {
    console.error('[admin/house] create error:', houseError)
    return NextResponse.json({ error: 'Failed to create house' }, { status: 500 })
  }

  await adminClient.from('house_settings').insert({ house_id: house.id })

  return NextResponse.json({ house }, { status: 201 })
}
