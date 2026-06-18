import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { familyMemberSchema } from '@/lib/validations/family'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from('user_profiles').select('role, id').eq('id', user.id).single()
  if (profile?.role !== 'admin') return null
  return profile
}

const addMemberSchema = familyMemberSchema.extend({
  userId: z.string().uuid().optional(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id: familyId } = await params

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const parsed = addMemberSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', fields: parsed.error.flatten().fieldErrors },
      { status: 422 },
    )
  }

  const adminClient = createAdminClient()

  const { data: family } = await adminClient
    .from('families')
    .select('house_id')
    .eq('id', familyId)
    .single()

  if (!family) return NextResponse.json({ error: 'Family not found' }, { status: 404 })

  const { data: member, error } = await adminClient
    .from('family_members')
    .insert({
      family_id: familyId,
      house_id: family.house_id,
      user_id: parsed.data.userId ?? null,
      full_name: parsed.data.fullName,
      relationship: parsed.data.relationship,
      date_of_birth: parsed.data.dateOfBirth ?? null,
      is_active: parsed.data.isActive,
    })
    .select('id, full_name, relationship')
    .single()

  if (error) {
    if (error.code === 'P0001' || error.message?.includes('one_active_family_per_user')) {
      return NextResponse.json(
        { error: 'This user is already in an active family' },
        { status: 409 },
      )
    }
    console.error('[admin/families/[id]/members] create error:', error)
    return NextResponse.json({ error: 'Failed to add member' }, { status: 500 })
  }

  return NextResponse.json({ member }, { status: 201 })
}
