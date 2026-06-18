import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import BlackoutManager from './BlackoutManager'

export const metadata: Metadata = { title: 'Blackout Dates — Abrahome Admin' }

export default async function BlackoutPage() {
  const admin = createAdminClient()
  const [{ data: blackouts }, { data: modules }] = await Promise.all([
    admin
      .from('blackout_dates')
      .select('id, start_date, end_date, reason, module_id, room_id, modules(name), rooms(name)')
      .order('start_date', { ascending: true }),
    admin
      .from('modules')
      .select('id, name, rooms(id, name)')
      .order('name', { ascending: true }),
  ])

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Blackout Dates</h1>
      <BlackoutManager blackouts={blackouts ?? []} modules={modules ?? []} />
    </div>
  )
}
