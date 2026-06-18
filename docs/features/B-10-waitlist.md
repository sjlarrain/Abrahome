# B-10: Waitlist — Join When House is Full

## What it does
When `GET /api/availability` returns `availableBeds = 0`, the booking form
shows a "Join waitlist" button instead of "Submit booking request". This
creates a `waitlist_requests` row (status = `waiting`).

## API
`POST /api/waitlist`

Body: `{ checkInDate, checkOutDate, attendeeCount, notes? }`

| Status | Body |
|--------|------|
| 201 | `{ waitlistId: "uuid" }` |
| 400 | Capacity available (should book directly) / not in a family |
| 401 | Unauthenticated |
| 422 | Validation error |

## Not in scope
- Waitlist promotion / admin notifications (A-12, Phase 3)
- Auto-expiry of waitlist entries
