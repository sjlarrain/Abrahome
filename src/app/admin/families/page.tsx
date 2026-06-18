import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import { CreateFamilyForm, AddMemberForm } from './FamilyActions'

export const metadata: Metadata = { title: 'Families — Abrahome Admin' }

export default async function AdminFamiliesPage() {
  const adminClient = createAdminClient()

  const [{ data: house }, { data: families }, { data: approvedUsers }] = await Promise.all([
    adminClient.from('houses').select('id').limit(1).maybeSingle(),
    adminClient
      .from('families')
      .select('id, name, notes, family_head_id, family_members(id, full_name, relationship, user_id)')
      .order('created_at', { ascending: true }),
    adminClient
      .from('user_profiles')
      .select('id, full_name, email')
      .eq('is_approved', true)
      .order('full_name'),
  ])

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Families</h1>
        {house && (
          <CreateFamilyForm
            houseId={house.id}
            approvedUsers={approvedUsers ?? []}
          />
        )}
      </div>

      {!house && (
        <p className="text-sm text-gray-500">
          Set up the house first before creating families.
        </p>
      )}

      <div className="space-y-4">
        {(families ?? []).map((family) => (
          <div key={family.id} className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
            <p className="font-semibold text-gray-900">{family.name}</p>
            {family.notes && (
              <p className="mt-1 text-sm text-gray-400">{family.notes}</p>
            )}
            <ul className="mt-3 space-y-1">
              {family.family_members.map((m: { id: string; full_name: string; relationship: string; user_id: string | null }) => (
                <li key={m.id} className="flex items-center gap-2 text-sm text-gray-600">
                  <span>{m.full_name}</span>
                  <span className="text-xs text-gray-400">({m.relationship})</span>
                  {!m.user_id && (
                    <span className="text-xs text-yellow-600">no login</span>
                  )}
                </li>
              ))}
            </ul>
            <AddMemberForm familyId={family.id} />
          </div>
        ))}

        {(families ?? []).length === 0 && (
          <p className="text-sm text-gray-400">No families yet.</p>
        )}
      </div>
    </div>
  )
}
