import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { createFamilySchema } from '@/lib/validations/family'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from('user_profiles').select('role, id').eq('id', user.id).single()
  if (profile?.role !== 'admin') return null
  return profile
}

const createFamilyRequestSchema = createFamilySchema.extend({
  houseId: z.string().uuid(),
  familyHeadId: z.string().uuid(),
})

export async function GET() {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const adminClient = createAdminClient()
  const { data: families } = await adminClient
    .from('families')
    .select('id, name, notes, created_at, family_head_id, user_profiles!family_head_id(email, full_name), family_members(id)')
    .order('created_at', { ascending: true })

  return NextResponse.json({ families: families ?? [] })
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

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

  const adminClient = createAdminClient()

  // Verify head user exists and is approved
  const { data: headProfile } = await adminClient
    .from('user_profiles')
    .select('id, full_name, is_approved')
    .eq('id', parsed.data.familyHeadId)
    .single()

  if (!headProfile) return NextResponse.json({ error: 'Family head user not found' }, { status: 404 })
  if (!headProfile.is_approved) {
    return NextResponse.json({ error: 'Family head must be an approved user' }, { status: 400 })
  }

  // Create family
  const { data: family, error: familyError } = await adminClient
    .from('families')
    .insert({
      house_id: parsed.data.houseId,
      name: parsed.data.name,
      family_head_id: parsed.data.familyHeadId,
      notes: parsed.data.notes ?? null,
      created_by: admin.id,
    })
    .select('id, name')
    .single()

  if (familyError || !family) {
    console.error('[admin/families] create error:', familyError)
    return NextResponse.json({ error: 'Failed to create family' }, { status: 500 })
  }

  // Add head as member row with relationship = 'head'
  const { error: memberError } = await adminClient.from('family_members').insert({
    family_id: family.id,
    house_id: parsed.data.houseId,
    user_id: parsed.data.familyHeadId,
    full_name: headProfile.full_name,
    relationship: 'head',
  })

  if (memberError) {
    // Rollback: delete the family (member insert failed, likely one_active_family_per_user)
    await adminClient.from('families').delete().eq('id', family.id)
    return NextResponse.json(
      { error: 'Family head is already a member of another active family' },
      { status: 409 },
    )
  }

  return NextResponse.json({ family }, { status: 201 })
}
