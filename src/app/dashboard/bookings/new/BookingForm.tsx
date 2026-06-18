'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import AvailabilityCalendar from '@/components/booking/AvailabilityCalendar'

type Member = { id: string; full_name: string; relationship: string }
type Module = { id: string; name: string }

type Props = {
  members: Member[]
  modules: Module[]
  minAdvanceDays: number
}

export default function BookingForm({ members, modules, minAdvanceDays }: Props) {
  const router = useRouter()
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [modulePreference, setModulePreference] = useState('')
  const [notes, setNotes] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})

  function toggleMember(id: string) {
    setSelectedMembers((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id],
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setFieldErrors({})

    if (!checkIn || !checkOut) {
      setError('Please select check-in and check-out dates.')
      return
    }
    if (selectedMembers.length === 0) {
      setError('Please select at least one attendee.')
      return
    }

    setPending(true)
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checkInDate: checkIn,
          checkOutDate: checkOut,
          attendeeMemberIds: selectedMembers,
          modulePreferenceId: modulePreference || undefined,
          notes: notes || undefined,
        }),
      })
      const json = await res.json()
      if (res.status === 201) {
        router.push(`/dashboard/bookings/${json.bookingId}`)
      } else if (res.status === 422) {
        setFieldErrors(json.fields ?? {})
      } else {
        setError(json.error ?? 'Failed to submit booking. Please try again.')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <p role="alert" className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {/* Date picker */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-gray-700">Select dates</h2>
        <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-200">
          <AvailabilityCalendar
            checkIn={checkIn}
            checkOut={checkOut}
            minAdvanceDays={minAdvanceDays}
            onSelectCheckIn={setCheckIn}
            onSelectCheckOut={setCheckOut}
          />
          {checkIn && checkOut && (
            <p className="mt-3 text-sm text-gray-600">
              <strong>{checkIn}</strong> → <strong>{checkOut}</strong>
            </p>
          )}
        </div>
      </section>

      {/* Attendees */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-gray-700">
          Attendees <span className="font-normal text-gray-400">(select all who are coming)</span>
        </h2>
        {fieldErrors.attendeeMemberIds && (
          <p className="mb-2 text-xs text-red-600">{fieldErrors.attendeeMemberIds[0]}</p>
        )}
        <div className="space-y-2">
          {members.map((m) => (
            <label key={m.id} className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 px-4 py-3 hover:bg-gray-50">
              <input
                type="checkbox"
                checked={selectedMembers.includes(m.id)}
                onChange={() => toggleMember(m.id)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600"
              />
              <span className="text-sm font-medium text-gray-900">{m.full_name}</span>
              <span className="ml-auto text-xs capitalize text-gray-400">{m.relationship}</span>
            </label>
          ))}
        </div>
      </section>

      {/* Module preference */}
      {modules.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-gray-700">
            Module preference <span className="font-normal text-gray-400">(optional)</span>
          </h2>
          <select
            value={modulePreference}
            onChange={(e) => setModulePreference(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">No preference</option>
            {modules.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </section>
      )}

      {/* Notes */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-gray-700">
          Notes <span className="font-normal text-gray-400">(optional)</span>
        </h2>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          maxLength={1000}
          placeholder="Any special requests or notes for the admin…"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </section>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {pending ? 'Submitting…' : 'Submit booking request'}
      </button>
    </form>
  )
}
