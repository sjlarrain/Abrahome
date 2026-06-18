# B-07: Booking Detail Page

## What it does
Shows full detail for a single booking request: dates, attendees (names),
bed assignments (if confirmed), and the event log.

## UI
`/dashboard/bookings/[id]` — server-rendered.

- Shows attendee names from `booking_attendees → family_members_safe`
- Shows assignment info (room/bed names) if status = `confirmed`
- Shows event log from `booking_events`
- Shows Cancel button if status = `pending` or `confirmed` and deadline not passed (B-08)
- Shows Modify Attendees button if status = `confirmed` (B-09)
