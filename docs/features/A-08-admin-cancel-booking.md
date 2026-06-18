# A-08: POST /api/admin/bookings/:id/cancel

## What it does
Admin-initiated cancel (no deadline check). Sets booking status to `cancelled`,
sets any associated `booking_assignments.status` → `'cancelled'` and
`assignment_beds.is_active` → `false` (freeing the beds), appends a
`booking_events` row, and sends a status email.

## Request body
```json
{ "reason": "optional string" }
```

## Responses
- 200 `{ "ok": true }`
- 422 — already cancelled/completed
- 401/403 — not admin
