'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Props = { requestId: string; status: string }

export default function WaitlistActions({ requestId, status }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function update(newStatus: 'offered' | 'expired') {
    setLoading(true)
    await fetch(`/api/admin/waitlist/${requestId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    router.refresh()
    setLoading(false)
  }

  return (
    <div className="flex gap-2">
      {status === 'waiting' && (
        <button
          type="button"
          disabled={loading}
          onClick={() => update('offered')}
          className="rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          Offer
        </button>
      )}
      <button
        type="button"
        disabled={loading}
        onClick={() => update('expired')}
        className="rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200 disabled:opacity-50"
      >
        Expire
      </button>
    </div>
  )
}
