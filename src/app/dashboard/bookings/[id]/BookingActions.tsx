'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function CancelButton({ bookingId }: { bookingId: string }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCancel() {
    if (!confirm('Cancel this booking request?')) return
    setPending(true)
    setError(null)
    const res = await fetch(`/api/bookings/${bookingId}/cancel`, { method: 'POST' })
    const json = await res.json()
    if (res.ok) {
      router.refresh()
    } else {
      setError(json.error ?? 'Failed to cancel')
      setPending(false)
    }
  }

  return (
    <div>
      {error && <p className="mb-2 text-xs text-red-600">{error}</p>}
      <button
        onClick={handleCancel}
        disabled={pending}
        className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
      >
        {pending ? 'Cancelling…' : 'Cancel booking'}
      </button>
    </div>
  )
}

export function ModifyAttendeesForm({
  bookingId,
  members,
  currentAttendeeIds,
}: {
  bookingId: string
  members: { id: string; full_name: string; relationship: string }[]
  currentAttendeeIds: string[]
}) {
  const router = useRouter()
  const [selected, setSelected] = useState<string[]>(currentAttendeeIds)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  function toggle(id: string) {
    setSelected((prev) => prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (selected.length === 0) { setError('Select at least one attendee'); return }
    setPending(true)
    setError(null)
    const res = await fetch(`/api/bookings/${bookingId}/attendees`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attendeeMemberIds: selected }),
    })
    const json = await res.json()
    if (res.ok) {
      setOpen(false)
      router.refresh()
    } else {
      setError(json.error ?? 'Failed to update attendees')
    }
    setPending(false)
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        Modify attendees
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl bg-gray-50 p-4">
      <p className="text-sm font-medium text-gray-700">Select attendees</p>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {members.map((m) => (
        <label key={m.id} className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={selected.includes(m.id)}
            onChange={() => toggle(m.id)}
            className="h-4 w-4 rounded border-gray-300 text-blue-600"
          />
          <span className="text-sm text-gray-900">{m.full_name}</span>
          <span className="text-xs capitalize text-gray-400">{m.relationship}</span>
        </label>
      ))}
      <div className="flex gap-2 pt-1">
        <button type="submit" disabled={pending}
          className="rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60">
          {pending ? '…' : 'Save'}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-gray-500">
          Cancel
        </button>
      </div>
    </form>
  )
}
