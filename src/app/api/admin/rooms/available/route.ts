import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const querySchema = z.object({
  bookingId: z.string().uuid(),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const parsed = querySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid params' }, { status: 400 })
  const { bookingId, checkIn, checkOut } = parsed.data

  if (checkOut <= checkIn) {
    return NextResponse.json({ error: 'checkOut must be after checkIn' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Beds already occupied for this range (excluding beds assigned to this booking).
  const { data: occupiedRows } = await admin
    .from('assignment_beds')
    .select('bed_id, booking_assignment_id, booking_assignments!inner(booking_request_id)')
    .eq('is_active', true)
    .lt('check_in_date', checkOut)
    .gt('check_out_date', checkIn)

  const occupiedBedIds = new Set<string>(
    (occupiedRows ?? [])
      .filter((r) => {
        const ba = r.booking_assignments
        const req_id = Array.isArray(ba)
          ? (ba[0] as { booking_request_id: string } | undefined)?.booking_request_id
          : (ba as { booking_request_id: string } | null)?.booking_request_id
        return req_id !== bookingId
      })
      .map((r) => r.bed_id)
  )

  // Full house structure.
  const { data: modules } = await admin
    .from('modules')
    .select(`
      id, name,
      rooms(
        id, name, capacity, is_active,
        beds(id, name, is_active)
      )
    `)
    .order('name', { ascending: true })

  type BedRow = { id: string; name: string; is_active: boolean }
  type RoomRow = { id: string; name: string; capacity: number; is_active: boolean; beds: BedRow[] }
  type ModuleRow = { id: string; name: string; rooms: RoomRow[] }

  const result = (modules as ModuleRow[] ?? []).map((mod) => ({
    id: mod.id,
    name: mod.name,
    rooms: (mod.rooms ?? [])
      .filter((r) => r.is_active)
      .map((room) => ({
        id: room.id,
        name: room.name,
        capacity: room.capacity,
        beds: (room.beds ?? [])
          .filter((b) => b.is_active)
          .map((bed) => ({
            id: bed.id,
            name: bed.name,
            available: !occupiedBedIds.has(bed.id),
          })),
      })),
  }))

  return NextResponse.json({ modules: result })
}
