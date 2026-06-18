import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from('user_profiles').select('role, id').eq('id', user.id).single()
  if (profile?.role !== 'admin') return null
  return profile
}

const provisionSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> },
) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id: familyId, memberId } = await params

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const parsed = provisionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', fields: parsed.error.flatten().fieldErrors },
      { status: 422 },
    )
  }

  const adminClient = createAdminClient()

  const { data: member } = await adminClient
    .from('family_members')
    .select('id, full_name, user_id, house_id')
    .eq('id', memberId)
    .eq('family_id', familyId)
    .single()

  if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 })
  if (member.user_id) {
    return NextResponse.json({ error: 'Member already has a login' }, { status: 409 })
  }

  // Create auth user (pre-confirmed — admin provisioned, no email verification needed)
  const { data: authData, error: createError } = await adminClient.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: { full_name: member.full_name },
  })

  if (createError || !authData.user) {
    console.error('[provision-login] create user error:', createError)
    return NextResponse.json({ error: 'Failed to create login' }, { status: 500 })
  }

  // Create user_profile row (approved, inherits family role)
  const { error: profileError } = await adminClient.from('user_profiles').insert({
    id: authData.user.id,
    email: parsed.data.email,
    full_name: member.full_name,
    role: 'family_member',
    is_approved: true,
    approved_by: admin.id,
    approved_at: new Date().toISOString(),
  })

  if (profileError) {
    await adminClient.auth.admin.deleteUser(authData.user.id)
    console.error('[provision-login] profile error:', profileError)
    return NextResponse.json({ error: 'Failed to create user profile' }, { status: 500 })
  }

  // Link the auth user to the family_members row
  const { error: linkError } = await adminClient
    .from('family_members')
    .update({ user_id: authData.user.id })
    .eq('id', memberId)

  if (linkError) {
    // Non-fatal: login exists but linking failed — surface the error
    console.error('[provision-login] link error:', linkError)
    return NextResponse.json(
      { error: 'Login created but failed to link to member — contact support' },
      { status: 500 },
    )
  }

  return NextResponse.json({ ok: true, userId: authData.user.id }, { status: 201 })
}
