import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import CreateFamilyForm from './CreateFamilyForm'

export const metadata: Metadata = { title: 'Create a family — Abrahome' }

export default async function CreateFamilyPage() {
  const adminClient = createAdminClient()
  const { data: house } = await adminClient
    .from('houses')
    .select('id')
    .limit(1)
    .maybeSingle()

  if (!house) redirect('/dashboard')

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Create a family</h1>
        <p className="mt-1 text-sm text-gray-500">
          You&apos;ll become the family head. The admin can add more members later.
        </p>
      </div>
      <div className="max-w-md rounded-xl bg-white p-8 shadow-sm ring-1 ring-gray-200">
        <CreateFamilyForm houseId={house.id} />
      </div>
    </div>
  )
}
