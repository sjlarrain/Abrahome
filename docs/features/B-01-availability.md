# B-01: GET /api/availability

## What it does
Returns the total active bed count for the house and the number of beds
soft-held by pending/confirmed booking requests overlapping the requested
date range. The difference is the available capacity.

A booking request "overlaps" if its date range intersects `[checkIn, checkOut)`
using the same half-open interval logic as the DB EXCLUDE constraint.

## Query params
`?checkInDate=yyyy-mm-dd&checkOutDate=yyyy-mm-dd`

## Response
```json
{
  "totalBeds": 20,
  "heldBeds": 5,
  "availableBeds": 15,
  "checkInDate": "2026-07-01",
  "checkOutDate": "2026-07-08"
}
```

| Status | Condition |
|--------|-----------|
| 200 | Success |
| 400 | Missing/invalid params |
| 401 | Unauthenticated |
| 404 | No house configured |

## Soft-hold logic
`heldBeds` = SUM of `attendee_count` from `booking_requests` where:
- `status IN ('pending', 'confirmed')`
- `check_in_date < checkOutDate AND check_out_date > checkInDate`

This is a conservative estimate: it counts headcount from requests, not
individually assigned beds. Bed assignment (Phase 3) is always manual.

## Not in scope
- Per-module breakdown (Phase 3 / A-03)
- Blackout date subtraction (Phase 3 / A-10)
