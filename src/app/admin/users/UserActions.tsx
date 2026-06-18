'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Role = 'family_head' | 'family_member' | 'solo_user'

export function ApproveButton({ userId }: { userId: string }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [role, setRole] = useState<Role>('family_member')

  async function handleApprove() {
    setPending(true)
    await fetch(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve', role }),
    })
    router.refresh()
    setPending(false)
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={role}
        onChange={(e) => setRole(e.target.value as Role)}
        className="rounded border border-gray-300 px-2 py-1 text-xs"
        disabled={pending}
      >
        <option value="family_member">Member</option>
        <option value="family_head">Head</option>
        <option value="solo_user">Solo</option>
      </select>
      <button
        onClick={handleApprove}
        disabled={pending}
        className="rounded bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-60"
      >
        {pending ? '…' : 'Approve'}
      </button>
    </div>
  )
}

export function PromoteAdminButton({ userId }: { userId: string }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  async function handlePromote() {
    if (!confirm('Promote this user to admin?')) return
    setPending(true)
    await fetch(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'promote_admin' }),
    })
    router.refresh()
    setPending(false)
  }

  return (
    <button
      onClick={handlePromote}
      disabled={pending}
      className="rounded border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
    >
      {pending ? '…' : 'Make admin'}
    </button>
  )
}

export function RejectButton({ userId }: { userId: string }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  async function handleReject() {
    setPending(true)
    await fetch(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reject' }),
    })
    router.refresh()
    setPending(false)
  }

  return (
    <button
      onClick={handleReject}
      disabled={pending}
      className="rounded border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
    >
      {pending ? '…' : 'Reject'}
    </button>
  )
}
