# B-08: Cancel Booking Flow

## What it does
A family member can cancel their own pending or confirmed booking, provided the
check-in is more than `house_settings.cancellation_deadline_days` days away
(evaluated in the house timezone).

Cancellation sets `status = 'cancelled'`, appends a `booking_events` row, and
sends a status-update email (fire-and-forget).

## API
`POST /api/bookings/[id]/cancel`

| Status | Body |
|--------|------|
| 200 | `{ ok: true }` |
| 400 | Past the cancellation deadline / already cancelled |
| 401 | Unauthenticated |
| 403 | Booking belongs to a different family |
| 404 | Booking not found |
