import type { Metadata } from 'next'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'

export const metadata: Metadata = { title: 'Admin — Abrahome' }

export default async function AdminPage() {
  const admin = createAdminClient()
  const today = new Date().toISOString().slice(0, 10)

  const [
    { count: totalBeds },
    { count: heldTonight },
    { data: pendingRows },
  ] = await Promise.all([
    admin.from('beds').select('*', { count: 'exact', head: true }).eq('is_active', true),
    admin
      .from('booking_requests')
      .select('*', { count: 'exact', head: true })
      .in('status', ['pending', 'confirmed'])
      .lte('check_in_date', today)
      .gt('check_out_date', today),
    admin
      .from('booking_requests')
      .select('created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: true }),
  ])

  const pendingCount = pendingRows?.length ?? 0
  const freeBeds = Math.max(0, (totalBeds ?? 0) - (heldTonight ?? 0))

  let oldestHoldDays: number | null = null
  if (pendingRows && pendingRows.length > 0) {
    const ms = new Date().getTime() - new Date(pendingRows[0].created_at).getTime()
    oldestHoldDays = Math.floor(ms / 86_400_000)
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      {/* Capacity + pending cards */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Total beds"
          value={String(totalBeds ?? 0)}
          sub="active in house"
        />
        <StatCard
          label="Held tonight"
          value={String(heldTonight ?? 0)}
          sub={`${freeBeds} free`}
          highlight={freeBeds === 0}
        />
        <Link href="/admin/bookings" className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200 hover:ring-blue-400">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Pending requests</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{pendingCount}</p>
          {oldestHoldDays !== null && (
            <p className={`mt-1 text-sm ${oldestHoldDays >= 7 ? 'font-semibold text-red-600' : 'text-gray-500'}`}>
              oldest: {oldestHoldDays}d ago
            </p>
          )}
        </Link>
      </div>

      {/* Quick links */}
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <NavCard href="/admin/users" label="Users" description="Approve or reject registrations" />
        <NavCard href="/admin/house" label="House" description="Modules, rooms, and beds" />
        <NavCard href="/admin/families" label="Families" description="Manage families and members" />
        <NavCard href="/admin/bookings" label="Bookings" description="Assign, confirm, or reject requests" />
        <NavCard href="/admin/calendar" label="Calendar" description="Monthly view by family" />
        <NavCard href="/admin/settings" label="Settings" description="Advance days, cancellation policy" />
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  sub,
  highlight = false,
}: {
  label: string
  value: string
  sub: string
  highlight?: boolean
}) {
  return (
    <div className={`rounded-xl bg-white p-6 shadow-sm ring-1 ${highlight ? 'ring-red-300' : 'ring-gray-200'}`}>
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-3xl font-bold text-gray-900">{value}</p>
      <p className="mt-1 text-sm text-gray-500">{sub}</p>
    </div>
  )
}

function NavCard({ href, label, description }: { href: string; label: string; description: string }) {
  return (
    <Link href={href} className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200 hover:ring-blue-400">
      <p className="font-semibold text-gray-900">{label}</p>
      <p className="mt-1 text-sm text-gray-500">{description}</p>
    </Link>
  )
}
