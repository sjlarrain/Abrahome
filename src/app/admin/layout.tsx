import Link from 'next/link'
import SignOutButton from '@/components/SignOutButton'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-6">
            <Link href="/admin" className="text-sm font-bold text-gray-900">
              Abrahome Admin
            </Link>
            <Link
              href="/admin/users"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Users
            </Link>
            <Link
              href="/admin/house"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              House
            </Link>
            <Link
              href="/admin/families"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Families
            </Link>
          </div>
          <SignOutButton className="text-sm text-gray-500 hover:text-gray-900" />
        </div>
      </nav>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  )
}
