# A-14: Bed/Room Retirement Reassignment Flow

## What it does
Before an admin can retire (soft-delete) a bed or room, the system checks for
future confirmed `assignment_beds` rows referencing it. If any exist, it
presents a reassignment UI: the admin must move each affected booking to another
bed (or cancel it) before retirement is allowed.

## API
- `GET /api/admin/house/beds/:id/retire-check`
  Returns `{ canRetire: bool, affectedBookings: [...] }`.
  An affected booking is any `assignment_beds` row where `bed_id = :id`,
  `is_active = true`, and `check_out_date > today`.

- `POST /api/admin/house/beds/:id/retire`
  Body: `{ reassignments: [{ assignmentBedId, newBedId }], cancelBookingIds: [] }`
  Performs reassignments atomically:
  1. For each reassignment: update `assignment_beds.bed_id` to `newBedId`.
  2. For each cancelled booking: call the same cancel logic as A-08.
  3. Set `beds.is_active = false`.
  Returns 422 if any future assignment still references the bed after step 1/2.

- Room retirement works the same way but checks all beds in the room; the room
  is only retired (`rooms.is_active = false`) when all its beds are retired.

## UI
Admin house management page gets "Retire" buttons. Clicking one:
1. Calls `retire-check`.
2. If `canRetire`: confirms and calls `retire`.
3. If not: shows the affected bookings list with a reassign/cancel form per row.
