# A-06: POST /api/admin/bookings/:id/confirm

## What it does
Calls `assign_booking_atomic` RPC with the admin-chosen bed IDs. On success,
sends a booking status email to the family head.

## Request body
```json
{ "bedIds": ["uuid", ...], "notes": "optional" }
```

## Responses
- 200 `{ "ok": true }` — confirmed
- 409 — double-booking conflict (EXCLUDE constraint fired)
- 422 — booking not in pending state
- 400 — validation error
- 401/403 — not admin
