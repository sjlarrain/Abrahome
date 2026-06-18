# B-09: Modify Attendees on Confirmed Booking

## What it does
Family members can update the attendee list on a confirmed booking.
The `booking_requests.attendee_count` is re-synced to the new count.
A `booking_events` row is appended with old/new attendee IDs.

## API
`PATCH /api/bookings/[id]/attendees`

Body: `{ attendeeMemberIds: ["uuid", ...] }`

| Status | Body |
|--------|------|
| 200 | `{ ok: true }` |
| 400 | Booking is not confirmed / attendees not in family |
| 401 | Unauthenticated |
| 403 | Booking belongs to a different family |
| 404 | Booking not found |
| 422 | Validation error |
