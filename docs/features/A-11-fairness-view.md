# A-11: Fairness View

## What it does
Admin page at `/admin/fairness` showing a table of all families with their
booking totals for the current calendar year:
- Total confirmed bookings
- Total nights (sum of check_out_date - check_in_date for confirmed bookings)
- Total attendee-nights (nights × attendee_count)

Sorted by total nights descending. Year selector (current ± 2 years) via query
param `?year=YYYY`.

## Data
Service-role query aggregating `booking_requests` joined to `families`.
No new tables needed.
