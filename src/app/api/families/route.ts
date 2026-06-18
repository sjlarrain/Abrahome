import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { createFamilySchema } from '@/lib/validations/family'
import { z } from 'zod'

const createFamilyRequestSchema = createFamilySchema.extend({
  houseId: z.string().uuid(),
})

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id, full_name, is_approved')
    .eq('id', user.id)
    .single()

  if (!profile?.is_approved) {
    return NextResponse.json({ error: 'Account not yet approved' }, { status: 403 })
  }

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const parsed = createFamilyRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', fields: parsed.error.flatten().fieldErrors },
      { status: 422 },
    )
  }

  // Use admin client for writes (user may not have insert on families via RLS)
  const adminClient = createAdminClient()

  const { data: family, error: familyError } = await adminClient
    .from('families')
    .insert({
      house_id: parsed.data.houseId,
      name: parsed.data.name,
      family_head_id: user.id,
      notes: parsed.data.notes ?? null,
      created_by: user.id,
    })
    .select('id, name')
    .single()

  if (familyError || !family) {
    console.error('[families] create error:', familyError)
    return NextResponse.json({ error: 'Failed to create family' }, { status: 500 })
  }

  const { error: memberError } = await adminClient.from('family_members').insert({
    family_id: family.id,
    house_id: parsed.data.houseId,
    user_id: user.id,
    full_name: profile.full_name,
    relationship: 'head',
  })

  if (memberError) {
    await adminClient.from('families').delete().eq('id', family.id)
    return NextResponse.json(
      { error: 'You are already a member of another active family' },
      { status: 400 },
    )
  }

  return NextResponse.json({ family }, { status: 201 })
}
