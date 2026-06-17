import type { Metadata } from 'next'
import SignOutButton from '@/components/SignOutButton'

export const metadata: Metadata = { title: 'Awaiting approval — Abrahome' }

export default function PendingApprovalPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md text-center">
        <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100">
          <svg
            className="h-8 w-8 text-yellow-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Waiting for approval</h1>
        <p className="mt-3 text-sm text-gray-500">
          Your account is pending review by an administrator. You&apos;ll have access
          once they approve it — this usually happens within a day.
        </p>
        <div className="mt-8">
          <SignOutButton />
        </div>
      </div>
    </main>
  )
}
