import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
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

  const { data: beds } = await admin
    .from('beds')
    .select('id')
    .eq('room_id', id)
    .eq('is_active', true)

  const bedIds = (beds ?? []).map((b) => b.id)
  if (bedIds.length === 0) {
    return NextResponse.json({ canRetire: true, affectedBookings: [] })
  }

  const { data: affected } = await admin
    .from('assignment_beds')
    .select(`
      id, bed_id, booking_assignment_id,
      booking_assignments(
        booking_request_id,
        check_in_date, check_out_date,
        family_id, families(name)
      )
    `)
    .in('bed_id', bedIds)
    .eq('is_active', true)
    .gt('check_out_date', today)

  const affectedBookings = (affected ?? []).map((ab) => {
    const ba = (Array.isArray(ab.booking_assignments) ? ab.booking_assignments[0] : ab.booking_assignments) as {
      booking_request_id: string
      check_in_date: string
      check_out_date: string
      families: { name: string } | { name: string }[] | null
    } | null
    const familyRaw = ba?.families
    const familyName = Array.isArray(familyRaw)
      ? (familyRaw[0] as { name: string } | undefined)?.name ?? '?'
      : (familyRaw as { name: string } | null)?.name ?? '?'
    return {
      assignmentBedId: ab.id,
      bedId: ab.bed_id,
      bookingRequestId: ba?.booking_request_id ?? null,
      checkIn: ba?.check_in_date ?? null,
      checkOut: ba?.check_out_date ?? null,
      familyName,
    }
  })

  return NextResponse.json({ canRetire: affectedBookings.length === 0, affectedBookings })
}
