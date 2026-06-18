import type { Metadata } from 'next'
import HouseSetupForm from './HouseSetupForm'

export const metadata: Metadata = { title: 'Set up your house — Abrahome Admin' }

export default function HouseSetupPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Set up the house</h1>
        <p className="mt-1 text-sm text-gray-500">
          Configure the house once — then add modules, rooms, and beds.
        </p>
      </div>
      <div className="max-w-lg rounded-xl bg-white p-8 shadow-sm ring-1 ring-gray-200">
        <HouseSetupForm />
      </div>
    </div>
  )
}
