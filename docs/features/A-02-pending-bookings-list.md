# A-02: Pending Bookings List

## What it does
Admin page at `/admin/bookings` listing all `status='pending'` booking requests,
sorted by `check_in_date` ascending. A badge highlights requests where the hold
is older than 7 days ("oldest hold flagged").

Columns: family name, check-in, check-out, nights, attendees, submitted date,
hold age (days since created_at), module preference.

Each row links to `/admin/bookings/:id` (the assignment detail page, A-05).

## Data
Single server query via `createAdminClient()`:
```sql
SELECT br.*, f.name AS family_name
FROM booking_requests br
JOIN families f ON f.id = br.family_id
WHERE br.status = 'pending'
ORDER BY br.check_in_date ASC, br.created_at ASC
```
