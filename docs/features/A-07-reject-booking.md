# A-07: POST /api/admin/bookings/:id/reject

## What it does
Sets booking status to `rejected`, stores `rejection_reason`, appends a
`booking_events` row, and sends a status email to the family head.

## Request body
```json
{ "reason": "string (required)" }
```

## Responses
- 200 `{ "ok": true }`
- 422 — booking not in pending state
- 401/403 — not admin
