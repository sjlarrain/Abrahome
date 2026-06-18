import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'My family — Abrahome' }

export default async function FamilyProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Use the safe view — excludes date_of_birth
  const { data: membership } = await supabase
    .from('family_members_safe')
    .select('family_id, house_id')
    .eq('user_id', user!.id)
    .eq('is_active', true)
    .maybeSingle()

  if (!membership) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My family</h1>
        <p className="mt-4 text-sm text-gray-500">
          You are not part of a family yet.
        </p>
        <Link
          href="/dashboard/family/new"
          className="mt-4 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Create a family
        </Link>
      </div>
    )
  }

  const { data: family } = await supabase
    .from('families')
    .select('name, family_head_id')
    .eq('id', membership.family_id)
    .single()

  const { data: members } = await supabase
    .from('family_members_safe')
    .select('id, full_name, relationship, is_active')
    .eq('family_id', membership.family_id)
    .eq('is_active', true)
    .order('relationship')

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">{family?.name}</h1>
      <div className="mt-6 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Members
        </h2>
        <ul className="divide-y divide-gray-100">
          {(members ?? []).map((m) => (
            <li key={m.id} className="flex items-center justify-between py-3">
              <span className="text-sm font-medium text-gray-900">{m.full_name}</span>
              <span className="text-xs capitalize text-gray-400">{m.relationship}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
