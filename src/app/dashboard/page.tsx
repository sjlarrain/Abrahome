import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Dashboard — Abrahome' }

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('full_name')
    .eq('id', user!.id)
    .single()

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">
        Welcome, {profile?.full_name ?? 'there'}
      </h1>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link
          href="/dashboard/bookings"
          className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200 hover:ring-blue-400"
        >
          <p className="font-semibold text-gray-900">Bookings</p>
          <p className="mt-1 text-sm text-gray-500">View and request stays at the house</p>
        </Link>
        <Link
          href="/dashboard/family"
          className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200 hover:ring-blue-400"
        >
          <p className="font-semibold text-gray-900">My family</p>
          <p className="mt-1 text-sm text-gray-500">View and manage your family profile</p>
        </Link>
      </div>
    </div>
  )
}
