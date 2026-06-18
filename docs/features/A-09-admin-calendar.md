# A-09: Admin Calendar View

## What it does
Monthly calendar at `/admin/calendar` showing all confirmed and pending bookings
colour-coded by family. Each day cell lists family names with status badges.
Navigation arrows step by month.

## Data
Server-fetched via `createAdminClient()`:
- `booking_requests` where status IN ('pending','confirmed') and dates overlap
  the visible month.
- Join `families(name)` for the label.

## Colour coding
Each family is assigned a stable colour index derived from `family_id` (modulo
a palette of 8 colours). No persistent mapping needed.
