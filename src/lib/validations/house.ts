import { z } from 'zod'

export const bathroomTypeSchema = z.enum(['suite', 'shared'])
export const roomTypeSchema = z.enum(['shared', 'private'])
export const bedTypeSchema = z.enum(['single', 'double', 'bunk_top', 'bunk_bottom'])

export const createHouseSchema = z.object({
  name: z.string().min(1).max(120),
  timezone: z.string().min(1, 'Timezone is required'), // IANA tz, e.g. America/Mexico_City
  description: z.string().max(1000).optional(),
  location: z.string().max(200).optional(),
})
export type CreateHouseInput = z.infer<typeof createHouseSchema>

export const moduleSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(1000).optional(),
  sortOrder: z.number().int().min(0).default(0),
})

export const roomSchema = z.object({
  moduleId: z.string().uuid(),
  name: z.string().min(1).max(120),
  roomType: roomTypeSchema,
  bathroomType: bathroomTypeSchema,
  sortOrder: z.number().int().min(0).default(0),
})

export const bedSchema = z.object({
  roomId: z.string().uuid(),
  name: z.string().min(1).max(120),
  bedType: bedTypeSchema,
})

export const houseSettingsSchema = z.object({
  minAdvanceDays: z.number().int().min(0).max(365),
  cancellationDeadlineDays: z.number().int().min(0).max(365),
})
