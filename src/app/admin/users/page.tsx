import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import { ApproveButton, PromoteAdminButton, RejectButton } from './UserActions'

export const metadata: Metadata = { title: 'Users — Abrahome Admin' }

type UserProfile = {
  id: string
  email: string
  full_name: string
  role: string
  is_approved: boolean
  approved_at: string | null
  created_at: string
}

export default async function AdminUsersPage() {
  const adminClient = createAdminClient()
  const { data: users } = await adminClient
    .from('user_profiles')
    .select('id, email, full_name, role, is_approved, approved_at, created_at')
    .order('is_approved', { ascending: true })
    .order('created_at', { ascending: true })

  const pending = (users ?? []).filter((u: UserProfile) => !u.is_approved)
  const approved = (users ?? []).filter((u: UserProfile) => u.is_approved)

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Users</h1>

      <section className="mt-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Pending approval ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <p className="text-sm text-gray-400">No pending registrations.</p>
        ) : (
          <UserTable users={pending} showActions />
        )}
      </section>

      <section className="mt-10">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Approved ({approved.length})
        </h2>
        {approved.length === 0 ? (
          <p className="text-sm text-gray-400">No approved users yet.</p>
        ) : (
          <UserTable users={approved} showActions={false} showPromote />
        )}
      </section>
    </div>
  )
}

function UserTable({
  users,
  showActions,
  showPromote = false,
}: {
  users: UserProfile[]
  showActions: boolean
  showPromote?: boolean
}) {
  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Email</th>
            <th className="px-4 py-3">Role</th>
            <th className="px-4 py-3">Registered</th>
            {showActions && <th className="px-4 py-3">Actions</th>}
            {showPromote && <th className="px-4 py-3">Promote</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {users.map((u) => (
            <tr key={u.id}>
              <td className="px-4 py-3 font-medium text-gray-900">{u.full_name}</td>
              <td className="px-4 py-3 text-gray-500">{u.email}</td>
              <td className="px-4 py-3 text-gray-500">{u.role}</td>
              <td className="px-4 py-3 text-gray-500">
                {new Date(u.created_at).toLocaleDateString()}
              </td>
              {showActions && (
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <ApproveButton userId={u.id} />
                    <RejectButton userId={u.id} />
                  </div>
                </td>
              )}
              {showPromote && u.role !== 'admin' && (
                <td className="px-4 py-3">
                  <PromoteAdminButton userId={u.id} />
                </td>
              )}
              {showPromote && u.role === 'admin' && (
                <td className="px-4 py-3">
                  <span className="text-xs text-gray-400">Admin</span>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
