# B-05: Resend — Booking Request Confirmation Email

## What it does
After a booking request is created (B-04), sends a confirmation email to the
family head's email address via Resend.

## Template content
- Subject: `Your booking request for [House Name] has been received`
- Body: dates, attendee count, status (Pending), link to booking detail page

## Implementation
`src/lib/email.ts` — a thin wrapper around the Resend SDK, called from the
POST /api/bookings handler after the event log is written.

Fire-and-forget: email failure does NOT roll back the booking. An error is
logged but the 201 is still returned to the client.
