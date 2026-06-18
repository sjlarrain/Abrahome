'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function CreateFamilyForm({ houseId }: { houseId: string }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [notes, setNotes] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPending(true)
    setError(null)

    const res = await fetch('/api/families', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ houseId, name, notes: notes || undefined }),
    })
    const json = await res.json()
    if (!res.ok) {
      setError(json.error ?? 'Failed to create family')
      setPending(false)
    } else {
      router.push('/dashboard/family')
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
          Family name
        </label>
        <input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          placeholder="e.g. The García Family"
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
          Notes (optional)
        </label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {pending ? 'Creating…' : 'Create family'}
      </button>
    </form>
  )
}
