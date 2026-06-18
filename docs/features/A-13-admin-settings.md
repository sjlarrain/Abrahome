# A-13: Admin Settings Page

## What it does
Admin page at `/admin/settings` displays and allows editing `house_settings`:
- `min_advance_days` — minimum days in advance a booking can start
- `cancellation_deadline_days` — days before check-in after which cancellation
  is locked
- `max_stay_nights` — maximum consecutive nights per booking
- `max_attendees` — maximum attendees per booking

## API
`PATCH /api/admin/house/settings` — body with any subset of the fields above.
Uses `createAdminClient()`. Updates the single `house_settings` row for the
configured house.

## Validation (Zod)
All fields are positive integers. `min_advance_days` ≥ 0.
