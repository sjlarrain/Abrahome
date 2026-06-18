import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import SettingsForm from './SettingsForm'

export const metadata: Metadata = { title: 'Settings — Abrahome Admin' }

export default async function AdminSettingsPage() {
  const admin = createAdminClient()
  const { data: house } = await admin
    .from('houses')
    .select('id, name, timezone')
    .limit(1)
    .maybeSingle()

  const { data: settings } = house
    ? await admin
        .from('house_settings')
        .select('min_advance_days, cancellation_deadline_days, max_stay_nights, max_attendees')
        .eq('house_id', house.id)
        .maybeSingle()
    : { data: null }

  if (!house || !settings) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-4 text-sm text-gray-500">No house configured yet. Set up a house first.</p>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
      <p className="mt-1 text-sm text-gray-500">{house.name} · {house.timezone}</p>
      <SettingsForm settings={settings} />
    </div>
  )
}
