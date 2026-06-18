import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import BookingForm from './BookingForm'

export const metadata: Metadata = { title: 'New booking request — Abrahome' }

export default async function NewBookingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: membership } = await supabase
    .from('family_members_safe')
    .select('family_id, house_id')
    .eq('user_id', user!.id)
    .eq('is_active', true)
    .maybeSingle()

  if (!membership) redirect('/dashboard/family/new')

  const adminClient = createAdminClient()
  const [{ data: members }, { data: modules }, { data: settings }] = await Promise.all([
    adminClient
      .from('family_members')
      .select('id, full_name, relationship')
      .eq('family_id', membership.family_id)
      .eq('is_active', true)
      .order('relationship'),
    adminClient
      .from('modules')
      .select('id, name')
      .eq('house_id', membership.house_id)
      .order('sort_order'),
    adminClient
      .from('house_settings')
      .select('min_advance_days')
      .eq('house_id', membership.house_id)
      .single(),
  ])

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">New booking request</h1>
        <p className="mt-1 text-sm text-gray-500">
          Select your dates, who is coming, and any preferences.
        </p>
      </div>
      <div className="max-w-xl">
        <BookingForm
          members={members ?? []}
          modules={modules ?? []}
          minAdvanceDays={settings?.min_advance_days ?? 7}
        />
      </div>
    </div>
  )
}
