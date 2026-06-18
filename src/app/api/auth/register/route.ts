import { NextRequest, NextResponse } from 'next/server'
import { registerSchema } from '@/lib/validations/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { env } from '@/lib/env'

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const parsed = registerSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', fields: parsed.error.flatten().fieldErrors },
      { status: 422 },
    )
  }

  const { fullName, email, password, phone } = parsed.data
  const isBootstrapAdmin =
    email.toLowerCase() === env.ADMIN_BOOTSTRAP_EMAIL.toLowerCase()

  const supabase = await createClient()
  const { data: authData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  })

  if (signUpError) {
    if (
      signUpError.code === 'user_already_exists' ||
      signUpError.message?.toLowerCase().includes('already registered')
    ) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 400 })
    }
    console.error('[register] signUp error:', signUpError)
    return NextResponse.json(
      { error: 'Registration failed. Please try again.' },
      { status: 503 },
    )
  }

  if (!authData.user) {
    return NextResponse.json(
      { error: 'Registration failed. Please try again.' },
      { status: 503 },
    )
  }

  // When email confirmation is enabled, Supabase does NOT error on a duplicate
  // email (anti-enumeration). It returns an obfuscated user with no identities.
  // Detect that and report the documented 400 instead of attempting a profile
  // insert that would fail the auth.users foreign key.
  if (authData.user.identities && authData.user.identities.length === 0) {
    return NextResponse.json({ error: 'Email already registered' }, { status: 400 })
  }

  const adminClient = createAdminClient()
  const { error: profileError } = await adminClient.from('user_profiles').insert({
    id: authData.user.id,
    email,
    full_name: fullName,
    phone: phone ?? null,
    role: isBootstrapAdmin ? 'admin' : 'family_member',
    is_approved: isBootstrapAdmin,
    ...(isBootstrapAdmin && { approved_at: new Date().toISOString() }),
  })

  if (profileError) {
    console.error('[register] profile insert error:', profileError)
    await adminClient.auth.admin.deleteUser(authData.user.id)
    return NextResponse.json(
      { error: 'Registration failed. Please try again.' },
      { status: 503 },
    )
  }

  return NextResponse.json({ message: 'Verification email sent' }, { status: 201 })
}
