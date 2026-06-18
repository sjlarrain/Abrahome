import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { approveUserSchema } from '@/lib/validations/auth'

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

const patchSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('approve') }).merge(approveUserSchema),
  z.object({ action: z.literal('reject') }),
  z.object({ action: z.literal('promote_admin') }),
])

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', fields: parsed.error.flatten().fieldErrors },
      { status: 422 },
    )
  }

  const adminClient = createAdminClient()

  // Verify the target user exists
  const { data: target } = await adminClient
    .from('user_profiles')
    .select('id, is_approved')
    .eq('id', id)
    .single()

  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  if (parsed.data.action === 'approve') {
    const { error } = await adminClient
      .from('user_profiles')
      .update({
        is_approved: true,
        role: parsed.data.role,
        approved_by: admin.id,
        approved_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) {
      console.error('[admin/users/[id]] approve error:', error)
      return NextResponse.json({ error: 'Failed to approve user' }, { status: 500 })
    }
  } else if (parsed.data.action === 'promote_admin') {
    if (!target.is_approved) {
      return NextResponse.json({ error: 'User must be approved before promoting to admin' }, { status: 400 })
    }
    const { error } = await adminClient
      .from('user_profiles')
      .update({ role: 'admin' })
      .eq('id', id)

    if (error) {
      console.error('[admin/users/[id]] promote error:', error)
      return NextResponse.json({ error: 'Failed to promote user' }, { status: 500 })
    }
  } else {
    // reject: mark unapproved (already false by default, but make it explicit)
    const { error } = await adminClient
      .from('user_profiles')
      .update({ is_approved: false })
      .eq('id', id)

    if (error) {
      console.error('[admin/users/[id]] reject error:', error)
      return NextResponse.json({ error: 'Failed to reject user' }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true })
}
