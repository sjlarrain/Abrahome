# B-03: Booking Request Form

## What it does
Approved family members can submit a booking request specifying:
- Check-in / check-out dates (selected via the availability calendar)
- Attendees (multi-select from `family_members_safe`)
- Module preference (optional dropdown)
- Notes (optional textarea)

Attendee count is derived from `attendeeMemberIds.length`.

## UI
`/dashboard/bookings/new`

1. Calendar (B-02) for date selection
2. Attendee multi-select
3. Module preference dropdown (optional)
4. Notes textarea
5. Submit → POST /api/bookings

On success → redirect to `/dashboard/bookings/[id]`.

## Validation
Client-side Zod parse before submit; server echoes field errors back on 422.
- At least one attendee required
- Check-out must be after check-in
- Check-in must be ≥ `min_advance_days` from today (validated server-side only)
