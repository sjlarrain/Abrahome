import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = createAdminClient()
  const today = new Date().toISOString().slice(0, 10)

  const { data: beds } = await admin.from('beds').select('id').eq('room_id', id).eq('is_active', true)
  const bedIds = (beds ?? []).map((b) => b.id)

  if (bedIds.length > 0) {
    const { data: remaining } = await admin
      .from('assignment_beds')
      .select('id')
      .in('bed_id', bedIds)
      .eq('is_active', true)
      .gt('check_out_date', today)
      .limit(1)

    if (remaining && remaining.length > 0) {
      return NextResponse.json(
        { error: 'Room still has beds with future assignments. Use retire-check to reassign first.' },
        { status: 422 }
      )
    }

    // Retire all active beds in the room.
    await admin.from('beds').update({ is_active: false }).in('id', bedIds)
  }

  await admin.from('rooms').update({ is_active: false }).eq('id', id)
  return NextResponse.json({ ok: true })
}
