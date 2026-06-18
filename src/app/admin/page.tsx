import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Admin — Abrahome' }

export default function AdminPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <DashboardCard href="/admin/users" label="Users" description="Approve or reject registrations" />
        <DashboardCard href="/admin/house" label="House" description="Modules, rooms, and beds" />
        <DashboardCard href="/admin/families" label="Families" description="Manage families and members" />
      </div>
    </div>
  )
}

function DashboardCard({
  href,
  label,
  description,
}: {
  href: string
  label: string
  description: string
}) {
  return (
    <Link
      href={href}
      className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200 hover:ring-blue-400"
    >
      <p className="font-semibold text-gray-900">{label}</p>
      <p className="mt-1 text-sm text-gray-500">{description}</p>
    </Link>
  )
}
