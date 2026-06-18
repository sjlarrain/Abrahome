# A-04: assign_booking_atomic RPC

## What it does
A Postgres function called from `/api/admin/bookings/:id/confirm` that atomically:
1. Locks the `booking_requests` row (`FOR UPDATE`) to prevent concurrent
   confirmation of the same booking.
2. Inserts a `booking_assignments` row.
3. Inserts `assignment_beds` rows (one per bed chosen by the admin).
   The `EXCLUDE USING gist (bed_id WITH =, daterange(...) WITH &&) WHERE
   (is_active)` constraint on `assignment_beds` physically rejects any
   double-booking at this point.
4. Updates `booking_requests.status` → `'confirmed'`.
5. Inserts a `booking_events` row (`event_type='confirmed'`).

## Signature
```sql
create function assign_booking_atomic(
  p_booking_request_id uuid,
  p_admin_id           uuid,
  p_bed_ids            uuid[],
  p_notes              text default null
) returns void
```

## Error semantics
- Raises `SQLSTATE '23P01'` (exclusion_violation) if any bed is already taken
  → caller maps to HTTP 409.
- Raises `SQLSTATE 'P0001'` (raise_exception) if booking is not `pending`
  → caller maps to HTTP 422.

## Migration
`supabase/migrations/20260617000000_assign_booking_atomic.sql`
