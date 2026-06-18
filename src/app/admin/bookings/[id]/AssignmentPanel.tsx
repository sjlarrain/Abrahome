'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

type Bed = { id: string; name: string; available: boolean }
type Room = { id: string; name: string; capacity: number; beds: Bed[] }
type Module = { id: string; name: string; rooms: Room[] }

type Props = {
  bookingId: string
  checkIn: string
  checkOut: string
  attendeeCount: number
}

export default function AssignmentPanel({ bookingId, checkIn, checkOut, attendeeCount }: Props) {
  const router = useRouter()
  const [modules, setModules] = useState<Module[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedBeds, setSelectedBeds] = useState<Set<string>>(new Set())
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function run() {
      try {
        const r = await fetch(
          `/api/admin/rooms/available?bookingId=${bookingId}&checkIn=${checkIn}&checkOut=${checkOut}`
        )
        const d = await r.json()
        if (cancelled) return
        setModules(d.modules ?? [])
      } catch {
        if (!cancelled) setModules([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    run()
    return () => { cancelled = true }
  }, [bookingId, checkIn, checkOut])

  function toggleBed(id: string) {
    setSelectedBeds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleConfirm() {
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch(`/api/admin/bookings/${bookingId}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bedIds: Array.from(selectedBeds) }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to confirm')
      } else {
        router.refresh()
      }
    } catch {
      setError('Network error')
    } finally {
      setSubmitting(false)
    }
  }

  const selectedCount = selectedBeds.size
  const underCapacity = selectedCount < attendeeCount

  if (loading) return <p className="text-sm text-gray-400">Loading available beds…</p>

  const allBeds = modules.flatMap((m) => m.rooms.flatMap((r) => r.beds))
  const availableCount = allBeds.filter((b) => b.available).length

  return (
    <div className="space-y-4">
      {availableCount === 0 && (
        <p className="text-sm text-yellow-700 bg-yellow-50 rounded px-3 py-2">
          No beds are free for these dates.
        </p>
      )}

      {modules.map((mod) => (
        <div key={mod.id}>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">{mod.name}</p>
          <div className="space-y-3">
            {mod.rooms.map((room) => (
              <div key={room.id} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  {room.name} <span className="text-gray-400 font-normal">· capacity {room.capacity}</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {room.beds.map((bed) => {
                    const checked = selectedBeds.has(bed.id)
                    return (
                      <label
                        key={bed.id}
                        className={`flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium cursor-pointer select-none
                          ${!bed.available ? 'opacity-40 cursor-not-allowed' : ''}
                          ${checked ? 'bg-blue-600 text-white' : 'bg-white ring-1 ring-gray-300 text-gray-700 hover:ring-blue-400'}`}
                      >
                        <input
                          type="checkbox"
                          className="sr-only"
                          disabled={!bed.available}
                          checked={checked}
                          onChange={() => bed.available && toggleBed(bed.id)}
                        />
                        {bed.name}
                      </label>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {selectedCount > 0 && (
        <p className={`text-sm ${underCapacity ? 'text-yellow-700' : 'text-green-700'}`}>
          {selectedCount} bed{selectedCount !== 1 ? 's' : ''} selected for {attendeeCount} attendee{attendeeCount !== 1 ? 's' : ''}
          {underCapacity ? ' — fewer beds than attendees' : ''}
        </p>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="button"
        disabled={selectedCount === 0 || submitting}
        onClick={handleConfirm}
        className="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? 'Confirming…' : `Confirm with ${selectedCount} bed${selectedCount !== 1 ? 's' : ''}`}
      </button>
    </div>
  )
}
