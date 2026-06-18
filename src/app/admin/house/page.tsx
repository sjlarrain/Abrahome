import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { HouseTree } from './HouseManager'

export const metadata: Metadata = { title: 'House — Abrahome Admin' }

export default async function AdminHousePage() {
  const adminClient = createAdminClient()
  const { data: house } = await adminClient
    .from('houses')
    .select('id, name, timezone, description, location, modules(id, name, sort_order, rooms(id, name, room_type, bathroom_type, is_active, beds(id, name, bed_type, is_active)))')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!house) redirect('/admin/house/new')

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{house.name}</h1>
        <p className="mt-1 text-sm text-gray-500">
          {house.location && <>{house.location} · </>}
          Timezone: {house.timezone}
        </p>
      </div>
      <HouseTree house={house as Parameters<typeof HouseTree>[0]['house']} />
    </div>
  )
}
