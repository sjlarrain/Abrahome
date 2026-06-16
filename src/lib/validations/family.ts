import { z } from 'zod'

export const relationshipSchema = z.enum(['head', 'spouse', 'child', 'solo_minor'])
export type Relationship = z.infer<typeof relationshipSchema>

export const createFamilySchema = z.object({
  name: z.string().min(1).max(120),
  notes: z.string().max(1000).optional(),
})
export type CreateFamilyInput = z.infer<typeof createFamilySchema>

export const familyMemberSchema = z.object({
  fullName: z.string().min(1).max(120),
  // 'head' is assigned automatically on family creation, not via this form.
  relationship: relationshipSchema.exclude(['head']),
  dateOfBirth: z.string().date().optional(), // ISO yyyy-mm-dd; descriptive only
  isActive: z.boolean().default(true),
})
export type FamilyMemberInput = z.infer<typeof familyMemberSchema>
