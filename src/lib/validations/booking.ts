import { z } from 'zod'

const isoDate = z.string().date() // 'yyyy-mm-dd'

export const bookingStatusSchema = z.enum(['pending', 'confirmed', 'rejected', 'cancelled'])

/**
 * Booking request. check_out must be strictly after check_in (mirrors the
 * `valid_dates` DB constraint); at least one attendee must be selected.
 */
export const createBookingSchema = z
  .object({
    checkInDate: isoDate,
    checkOutDate: isoDate,
    attendeeMemberIds: z.array(z.string().uuid()).min(1, 'Select at least one attendee'),
    modulePreferenceId: z.string().uuid().optional(),
    notes: z.string().max(1000).optional(),
  })
  .refine((v) => v.checkOutDate > v.checkInDate, {
    message: 'Check-out must be after check-in',
    path: ['checkOutDate'],
  })
export type CreateBookingInput = z.infer<typeof createBookingSchema>

export const availabilityQuerySchema = z
  .object({ checkInDate: isoDate, checkOutDate: isoDate })
  .refine((v) => v.checkOutDate > v.checkInDate, {
    message: 'Check-out must be after check-in',
    path: ['checkOutDate'],
  })

export const rejectBookingSchema = z.object({
  reason: z.string().min(1, 'A reason is required').max(1000),
})

export const modifyAttendeesSchema = z.object({
  attendeeMemberIds: z.array(z.string().uuid()).min(1),
})
