'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type User = { id: string; full_name: string; email: string }

export function CreateFamilyForm({ houseId, approvedUsers }: { houseId: string; approvedUsers: User[] }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [headId, setHeadId] = useState(approvedUsers[0]?.id ?? '')
  const [notes, setNotes] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPending(true)
    setError(null)
    const res = await fetch('/api/admin/families', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ houseId, name, familyHeadId: headId, notes: notes || undefined }),
    })
    const json = await res.json()
    if (!res.ok) {
      setError(json.error ?? 'Failed to create family')
    } else {
      setName('')
      setNotes('')
      setOpen(false)
      router.refresh()
    }
    setPending(false)
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        New family
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200 space-y-4">
      <h2 className="font-semibold text-gray-900">New family</h2>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700">Family name</label>
        <input value={name} onChange={e => setName(e.target.value)} required
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
      </div>
      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700">Family head</label>
        <select value={headId} onChange={e => setHeadId(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
          {approvedUsers.map(u => (
            <option key={u.id} value={u.id}>{u.full_name} ({u.email})</option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700">Notes (optional)</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={pending}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">
          {pending ? 'Creating…' : 'Create family'}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-gray-500">
          Cancel
        </button>
      </div>
    </form>
  )
}

export function AddMemberForm({ familyId }: { familyId: string }) {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [relationship, setRelationship] = useState('spouse')
  const [pending, setPending] = useState(false)
  const [open, setOpen] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPending(true)
    await fetch(`/api/admin/families/${familyId}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName, relationship }),
    })
    setFullName('')
    setOpen(false)
    router.refresh()
    setPending(false)
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="mt-2 text-xs text-blue-600 hover:underline">
        + Add member
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 flex gap-2">
      <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Full name" required
        className="flex-1 rounded border border-gray-300 px-2 py-1 text-xs" />
      <select value={relationship} onChange={e => setRelationship(e.target.value)}
        className="rounded border border-gray-300 px-2 py-1 text-xs">
        <option value="spouse">Spouse</option>
        <option value="child">Child</option>
        <option value="solo_minor">Solo minor</option>
      </select>
      <button type="submit" disabled={pending}
        className="rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white disabled:opacity-60">
        {pending ? '…' : 'Add'}
      </button>
      <button type="button" onClick={() => setOpen(false)} className="text-xs text-gray-500">
        Cancel
      </button>
    </form>
  )
}
