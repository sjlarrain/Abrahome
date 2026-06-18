'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Bed = { id: string; name: string; bed_type: string; is_active: boolean }
type Room = { id: string; name: string; room_type: string; bathroom_type: string; is_active: boolean; beds: Bed[] }
type Module = { id: string; name: string; sort_order: number; rooms: Room[] }
type House = {
  id: string
  name: string
  timezone: string
  description: string | null
  location: string | null
  modules: Module[]
}

export function AddModuleForm({ houseId }: { houseId: string }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [pending, setPending] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setPending(true)
    await fetch('/api/admin/modules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ houseId, name: name.trim(), sortOrder: 0 }),
    })
    setName('')
    router.refresh()
    setPending(false)
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Module name"
        className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
        required
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {pending ? '…' : 'Add module'}
      </button>
    </form>
  )
}

export function AddRoomForm({ moduleId }: { moduleId: string }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [roomType, setRoomType] = useState('shared')
  const [bathroomType, setBathroomType] = useState('shared')
  const [pending, setPending] = useState(false)
  const [open, setOpen] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setPending(true)
    await fetch('/api/admin/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ moduleId, name: name.trim(), roomType, bathroomType, sortOrder: 0 }),
    })
    setName('')
    setOpen(false)
    router.refresh()
    setPending(false)
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-2 text-xs text-blue-600 hover:underline"
      >
        + Add room
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 space-y-2 rounded-lg border border-dashed border-gray-300 p-3">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Room name"
        className="w-full rounded border border-gray-300 px-2 py-1 text-xs"
        required
      />
      <div className="flex gap-2">
        <select
          value={roomType}
          onChange={(e) => setRoomType(e.target.value)}
          className="rounded border border-gray-300 px-2 py-1 text-xs"
        >
          <option value="shared">Shared</option>
          <option value="private">Private</option>
        </select>
        <select
          value={bathroomType}
          onChange={(e) => setBathroomType(e.target.value)}
          className="rounded border border-gray-300 px-2 py-1 text-xs"
        >
          <option value="shared">Shared bath</option>
          <option value="suite">En suite</option>
        </select>
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white disabled:opacity-60"
        >
          {pending ? '…' : 'Save'}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-gray-500">
          Cancel
        </button>
      </div>
    </form>
  )
}

export function AddBedForm({ roomId }: { roomId: string }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [bedType, setBedType] = useState('single')
  const [pending, setPending] = useState(false)
  const [open, setOpen] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setPending(true)
    await fetch('/api/admin/beds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId, name: name.trim(), bedType }),
    })
    setName('')
    setOpen(false)
    router.refresh()
    setPending(false)
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="mt-1 text-xs text-blue-600 hover:underline">
        + Add bed
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="mt-1 flex gap-2">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Bed name"
        className="flex-1 rounded border border-gray-300 px-2 py-1 text-xs"
        required
      />
      <select
        value={bedType}
        onChange={(e) => setBedType(e.target.value)}
        className="rounded border border-gray-300 px-2 py-1 text-xs"
      >
        <option value="single">Single</option>
        <option value="double">Double</option>
        <option value="bunk_top">Bunk top</option>
        <option value="bunk_bottom">Bunk bottom</option>
      </select>
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white disabled:opacity-60"
      >
        {pending ? '…' : 'Add'}
      </button>
      <button type="button" onClick={() => setOpen(false)} className="text-xs text-gray-500">
        Cancel
      </button>
    </form>
  )
}

export function HouseTree({ house }: { house: House }) {
  return (
    <div className="space-y-4">
      {house.modules.map((mod) => (
        <div key={mod.id} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-200">
          <p className="font-semibold text-gray-900">{mod.name}</p>
          <div className="mt-3 space-y-3 pl-4">
            {mod.rooms.map((room) => (
              <div key={room.id}>
                <p className="text-sm font-medium text-gray-700">
                  {room.name}{' '}
                  <span className="text-xs text-gray-400">
                    ({room.room_type}, {room.bathroom_type} bath)
                  </span>
                </p>
                <ul className="mt-1 space-y-1 pl-4">
                  {room.beds.map((bed) => (
                    <li key={bed.id} className="text-xs text-gray-500">
                      {bed.name} — {bed.bed_type}
                      {!bed.is_active && (
                        <span className="ml-2 text-red-400">(retired)</span>
                      )}
                    </li>
                  ))}
                </ul>
                <AddBedForm roomId={room.id} />
              </div>
            ))}
          </div>
          <AddRoomForm moduleId={mod.id} />
        </div>
      ))}
      <AddModuleForm houseId={house.id} />
    </div>
  )
}
