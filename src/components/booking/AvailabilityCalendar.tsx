'use client'

import { useState, useEffect, useCallback } from 'react'

type AvailabilityData = {
  totalBeds: number
  heldBeds: number
  availableBeds: number
}

type Props = {
  checkIn: string | null
  checkOut: string | null
  minAdvanceDays: number
  onSelectCheckIn: (date: string) => void
  onSelectCheckOut: (date: string) => void
}

function toYMD(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function addDays(ymd: string, n: number): string {
  const d = new Date(ymd + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return toYMD(d)
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

// Fetch availability for a single-night window starting on `date`
async function fetchNight(date: string): Promise<AvailabilityData | null> {
  try {
    const out = addDays(date, 1)
    const res = await fetch(
      `/api/availability?checkInDate=${date}&checkOutDate=${out}`,
    )
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

type DayStatus = 'available' | 'limited' | 'full' | 'past' | 'loading'

export default function AvailabilityCalendar({
  checkIn,
  checkOut,
  minAdvanceDays,
  onSelectCheckIn,
  onSelectCheckOut,
}: Props) {
  const today = toYMD(new Date())
  const minDate = addDays(today, minAdvanceDays)

  const [viewYear, setViewYear] = useState(() => new Date().getFullYear())
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth())
  const [dayStatus, setDayStatus] = useState<Record<string, DayStatus>>({})

  const loadMonth = useCallback(
    async (year: number, month: number) => {
      const days = daysInMonth(year, month)
      const dates: string[] = []
      for (let d = 1; d <= days; d++) {
        const ymd = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
        if (ymd >= minDate) dates.push(ymd)
      }

      // Mark as loading first
      setDayStatus((prev) => {
        const next = { ...prev }
        dates.forEach((d) => { next[d] = 'loading' })
        return next
      })

      const results = await Promise.all(dates.map((d) => fetchNight(d)))
      setDayStatus((prev) => {
        const next = { ...prev }
        dates.forEach((date, i) => {
          const data = results[i]
          if (!data) { next[date] = 'past'; return }
          if (data.availableBeds === 0) next[date] = 'full'
          else if (data.availableBeds <= data.totalBeds * 0.25) next[date] = 'limited'
          else next[date] = 'available'
        })
        return next
      })
    },
    [minDate],
  )

  useEffect(() => {
    loadMonth(viewYear, viewMonth)
  }, [viewYear, viewMonth, loadMonth])

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
  }

  function handleDayClick(date: string) {
    const status = dayStatus[date]
    if (!status || status === 'past' || status === 'loading' || status === 'full') return
    if (!checkIn || (checkIn && checkOut)) {
      onSelectCheckIn(date)
      onSelectCheckOut('')
    } else if (date > checkIn) {
      onSelectCheckOut(date)
    } else {
      onSelectCheckIn(date)
      onSelectCheckOut('')
    }
  }

  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay()
  const totalDays = daysInMonth(viewYear, viewMonth)
  const monthName = new Date(viewYear, viewMonth).toLocaleString('default', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="select-none">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={prevMonth}
          className="rounded p-1 hover:bg-gray-100"
          aria-label="Previous month"
        >
          ‹
        </button>
        <span className="text-sm font-semibold text-gray-700">{monthName}</span>
        <button
          type="button"
          onClick={nextMonth}
          className="rounded p-1 hover:bg-gray-100"
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-px text-center text-xs text-gray-400">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
          <div key={d} className="pb-1 font-medium">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-px">
        {Array.from({ length: firstDayOfMonth }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {Array.from({ length: totalDays }).map((_, i) => {
          const day = i + 1
          const ymd = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const status: DayStatus = ymd < minDate ? 'past' : (dayStatus[ymd] ?? 'loading')
          const isCheckIn = ymd === checkIn
          const isCheckOut = ymd === checkOut
          const inRange = checkIn && checkOut && ymd > checkIn && ymd < checkOut

          const baseClass = 'flex h-8 items-center justify-center rounded text-xs font-medium transition-colors'
          let colorClass = ''
          if (isCheckIn || isCheckOut) colorClass = 'bg-blue-600 text-white'
          else if (inRange) colorClass = 'bg-blue-100 text-blue-800'
          else if (status === 'past' || status === 'loading') colorClass = 'text-gray-300 cursor-default'
          else if (status === 'full') colorClass = 'bg-red-100 text-red-400 cursor-not-allowed'
          else if (status === 'limited') colorClass = 'bg-yellow-100 text-yellow-700 cursor-pointer hover:bg-yellow-200'
          else colorClass = 'bg-green-50 text-green-700 cursor-pointer hover:bg-green-100'

          return (
            <button
              key={ymd}
              type="button"
              onClick={() => handleDayClick(ymd)}
              disabled={status === 'past' || status === 'loading' || status === 'full'}
              className={`${baseClass} ${colorClass}`}
              aria-label={`${ymd} — ${status}`}
            >
              {day}
            </button>
          )
        })}
      </div>

      <div className="mt-3 flex gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-green-100" />Available
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-yellow-100" />Limited
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-red-100" />Full
        </span>
      </div>
    </div>
  )
}
