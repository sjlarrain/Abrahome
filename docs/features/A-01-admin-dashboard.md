# A-01: Admin Dashboard

## What it does
The admin landing page at `/admin` shows a quick-glance overview:

- **Capacity card** — total beds in the house, with beds held tonight (pending +
  confirmed) and beds free.
- **Pending requests card** — count of booking requests with `status='pending'`,
  plus the age of the oldest one (in days) so the admin can spot stale holds.
- **Quick links** — to the pending list, house management, families, and users.

All numbers are computed server-side at render time (no client-side fetch).
Capacity is derived from `beds` (counting only `is_active=true`) and
`booking_requests` overlapping today.

## Data sources
```
beds.is_active=true              → total bed count
booking_requests WHERE status IN ('pending','confirmed')
  AND check_in_date <= today AND check_out_date > today  → held tonight
booking_requests WHERE status='pending'                  → pending count + oldest
```
