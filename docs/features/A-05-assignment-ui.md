# A-05: Manual Bed Assignment UI

## What it does
Admin booking detail page at `/admin/bookings/:id` shows the full booking
request plus a bed-selection form. The admin picks beds from the available list
(fetched from A-03) and submits to confirm.

## Layout
- Booking summary: family, dates, attendees, notes, module preference
- Attendees list
- Available beds grouped by module → room (fetched client-side from
  `/api/admin/rooms/available`)
- Checkbox per bed; submit button calls POST `/api/admin/bookings/:id/confirm`
- Reject and Cancel buttons (A-07, A-08)

## Capacity preview
The form shows how many beds are selected vs. `attendee_count`. A warning
appears if fewer beds than attendees are selected (not blocked — admin decides).

## State after confirm
The page refreshes; booking status shows `confirmed` with assignment summary.
