'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type FieldErrors = Partial<Record<'fullName' | 'email' | 'password' | 'phone', string[]>>

export default function RegisterForm() {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [globalError, setGlobalError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    setFieldErrors({})
    setGlobalError(null)

    const form = e.currentTarget
    const data = {
      fullName: (form.elements.namedItem('fullName') as HTMLInputElement).value,
      email: (form.elements.namedItem('email') as HTMLInputElement).value,
      password: (form.elements.namedItem('password') as HTMLInputElement).value,
      phone: (form.elements.namedItem('phone') as HTMLInputElement).value || undefined,
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const json = await res.json()

      if (res.status === 201) {
        router.push('/verify-email')
        return
      }
      if (res.status === 422) {
        setFieldErrors(json.fields ?? {})
      } else {
        setGlobalError(json.error ?? 'Something went wrong. Please try again.')
      }
    } catch {
      setGlobalError('Network error. Please check your connection.')
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {globalError && (
        <p role="alert" className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          {globalError}
        </p>
      )}

      <Field label="Full name" id="fullName" errors={fieldErrors.fullName}>
        <input
          id="fullName"
          name="fullName"
          type="text"
          autoComplete="name"
          required
          className={inputClass(!!fieldErrors.fullName)}
        />
      </Field>

      <Field label="Email" id="email" errors={fieldErrors.email}>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className={inputClass(!!fieldErrors.email)}
        />
      </Field>

      <Field label="Password" id="password" errors={fieldErrors.password}>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className={inputClass(!!fieldErrors.password)}
        />
      </Field>

      <Field label="Phone (optional)" id="phone" errors={fieldErrors.phone}>
        <input
          id="phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          className={inputClass(!!fieldErrors.phone)}
        />
      </Field>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {pending ? 'Creating account…' : 'Create account'}
      </button>

      <p className="text-center text-sm text-gray-500">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-blue-600 hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  )
}

function inputClass(hasError: boolean) {
  return [
    'w-full rounded-lg border px-3 py-2 text-sm outline-none',
    'focus:ring-2 focus:ring-blue-500 focus:border-transparent',
    hasError ? 'border-red-400 bg-red-50' : 'border-gray-300',
  ].join(' ')
}

function Field({
  label,
  id,
  errors,
  children,
}: {
  label: string
  id: string
  errors?: string[]
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      {children}
      {errors?.map((e) => (
        <p key={e} className="text-xs text-red-600">
          {e}
        </p>
      ))}
    </div>
  )
}
