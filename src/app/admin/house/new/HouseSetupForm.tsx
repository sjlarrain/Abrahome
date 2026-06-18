'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const TIMEZONES = [
  'America/Mexico_City',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Bogota',
  'America/Lima',
  'America/Buenos_Aires',
  'Europe/Madrid',
  'Europe/London',
  'UTC',
]

export default function HouseSetupForm() {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    setError(null)

    const form = e.currentTarget
    const data = {
      name: (form.elements.namedItem('name') as HTMLInputElement).value,
      timezone: (form.elements.namedItem('timezone') as HTMLSelectElement).value,
      description: (form.elements.namedItem('description') as HTMLTextAreaElement).value || undefined,
      location: (form.elements.namedItem('location') as HTMLInputElement).value || undefined,
    }

    try {
      const res = await fetch('/api/admin/house', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Failed to create house')
      } else {
        router.push('/admin/house')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <p role="alert" className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="space-y-1">
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          House name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="timezone" className="block text-sm font-medium text-gray-700">
          Timezone
        </label>
        <select
          id="timezone"
          name="timezone"
          required
          defaultValue="America/Mexico_City"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          {TIMEZONES.map((tz) => (
            <option key={tz} value={tz}>{tz}</option>
          ))}
        </select>
        <p className="text-xs text-gray-400">
          Used for booking deadlines and the cancellation cutoff.
        </p>
      </div>

      <div className="space-y-1">
        <label htmlFor="location" className="block text-sm font-medium text-gray-700">
          Location (optional)
        </label>
        <input
          id="location"
          name="location"
          type="text"
          placeholder="e.g. Valle de Bravo"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          Description (optional)
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {pending ? 'Creating…' : 'Create house'}
      </button>
    </form>
  )
}
