'use client'

import { useState } from 'react'

type Settings = {
  min_advance_days: number
  cancellation_deadline_days: number
  max_stay_nights: number
  max_attendees: number
}

export default function SettingsForm({ settings }: { settings: Settings }) {
  const [values, setValues] = useState({
    minAdvanceDays: settings.min_advance_days,
    cancellationDeadlineDays: settings.cancellation_deadline_days,
    maxStayNights: settings.max_stay_nights,
    maxAttendees: settings.max_attendees,
  })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  function set(field: keyof typeof values, val: string) {
    const n = parseInt(val, 10)
    if (!isNaN(n)) setValues((prev) => ({ ...prev, [field]: n }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch('/api/admin/house/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      const data = await res.json()
      if (res.ok) setMessage({ ok: true, text: 'Settings saved.' })
      else setMessage({ ok: false, text: data.error ?? 'Failed to save.' })
    } catch {
      setMessage({ ok: false, text: 'Network error.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 max-w-md space-y-5">
      <Field
        label="Min advance days"
        hint="Minimum days in advance a booking can start"
        value={values.minAdvanceDays}
        onChange={(v) => set('minAdvanceDays', v)}
      />
      <Field
        label="Cancellation deadline days"
        hint="Days before check-in after which cancellation is locked"
        value={values.cancellationDeadlineDays}
        onChange={(v) => set('cancellationDeadlineDays', v)}
      />
      <Field
        label="Max stay nights"
        hint="Maximum consecutive nights per booking"
        value={values.maxStayNights}
        onChange={(v) => set('maxStayNights', v)}
      />
      <Field
        label="Max attendees"
        hint="Maximum attendees per booking"
        value={values.maxAttendees}
        onChange={(v) => set('maxAttendees', v)}
      />

      {message && (
        <p className={`text-sm ${message.ok ? 'text-green-600' : 'text-red-600'}`}>{message.text}</p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save settings'}
      </button>
    </form>
  )
}

function Field({
  label,
  hint,
  value,
  onChange,
}: {
  label: string
  hint: string
  value: number
  onChange: (v: string) => void
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <p className="mt-0.5 text-xs text-gray-500">{hint}</p>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-32 rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
      />
    </div>
  )
}
