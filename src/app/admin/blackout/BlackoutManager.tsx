'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Blackout = {
  id: string
  start_date: string
  end_date: string
  reason: string
  module_id: string | null
  room_id: string | null
  modules: { name: string } | { name: string }[] | null
  rooms: { name: string } | { name: string }[] | null
}

type Room = { id: string; name: string }
type Module = { id: string; name: string; rooms: Room[] }

type Props = {
  blackouts: Blackout[]
  modules: Module[]
}

function resolveJoin<T>(raw: T | T[] | null): T | null {
  if (!raw) return null
  return Array.isArray(raw) ? (raw[0] ?? null) : raw
}

export default function BlackoutManager({ blackouts: initial, modules }: Props) {
  const router = useRouter()
  const [blackouts, setBlackouts] = useState(initial)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [reason, setReason] = useState('')
  const [moduleId, setModuleId] = useState('')
  const [roomId, setRoomId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedModule = modules.find((m) => m.id === moduleId)
  const availableRooms: Room[] = selectedModule?.rooms ?? []

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/blackout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate, endDate, reason,
          moduleId: moduleId || undefined,
          roomId: roomId || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed'); return }
      router.refresh()
      setStartDate(''); setEndDate(''); setReason(''); setModuleId(''); setRoomId('')
    } catch {
      setError('Network error')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/admin/blackout/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setBlackouts((prev) => prev.filter((b) => b.id !== id))
    }
  }

  return (
    <div className="mt-6 space-y-8">
      {/* Existing */}
      <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
        {blackouts.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-gray-400">No blackout dates.</p>
        ) : (
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Start</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">End</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Reason</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Scope</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {blackouts.map((b) => {
                const mod = resolveJoin(b.modules) as { name: string } | null
                const room = resolveJoin(b.rooms) as { name: string } | null
                const scope = room ? room.name : mod ? mod.name : 'Whole house'
                return (
                  <tr key={b.id}>
                    <td className="px-4 py-3 text-gray-700">{b.start_date}</td>
                    <td className="px-4 py-3 text-gray-700">{b.end_date}</td>
                    <td className="px-4 py-3 text-gray-700">{b.reason}</td>
                    <td className="px-4 py-3 text-gray-500">{scope}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(b.id)}
                        className="text-xs text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Create form */}
      <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">Add Blackout Period</h2>
        <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Start date</label>
            <input
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">End date</label>
            <input
              type="date"
              required
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Reason</label>
            <input
              type="text"
              required
              maxLength={200}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Module (optional)</label>
            <select
              value={moduleId}
              onChange={(e) => { setModuleId(e.target.value); setRoomId('') }}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="">Whole house</option>
              {modules.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Room (optional)</label>
            <select
              value={roomId}
              disabled={!moduleId}
              onChange={(e) => setRoomId(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50"
            >
              <option value="">Whole module</option>
              {availableRooms.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
          {error && <p className="col-span-2 text-sm text-red-600">{error}</p>}
          <div className="col-span-2">
            <button
              type="submit"
              disabled={submitting}
              className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? 'Adding…' : 'Add blackout'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
