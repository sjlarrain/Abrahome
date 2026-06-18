# B-04: POST /api/bookings — Create Booking Request

## What it does
Creates a `booking_requests` row (status = `pending`) plus one
`booking_attendees` row per selected member, then appends a `booking_events`
row (event_type = `created`). The pending request soft-holds capacity.

## Inputs
```json
{
  "checkInDate": "yyyy-mm-dd",
  "checkOutDate": "yyyy-mm-dd",
  "attendeeMemberIds": ["uuid", ...],
  "modulePreferenceId": "uuid | null",
  "notes": "string | null"
}
```

## Outputs
| Status | Body |
|--------|------|
| 201 | `{ bookingId: "uuid" }` |
| 400 | Family has no house / check-in too soon / no active family |
| 401 | Unauthenticated |
| 422 | Validation error |

## Business rules
- Caller must be an approved user in an active family.
- `attendee_count` = `attendeeMemberIds.length`
- All `attendeeMemberIds` must belong to the caller's family.
- `check_in_date` must be ≥ `house_settings.min_advance_days` from today
  (in the house timezone — compared using the house's `timezone` field).
- The attendees + event log insert uses the admin client (privileged write).

## Not in scope
- Auto-expiry of pending holds (V2-04)
- Hard capacity cap (soft-hold is informational; admin assigns manually)
