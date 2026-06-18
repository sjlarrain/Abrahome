# A-12: Admin Waitlist Management

## What it does
Admin page at `/admin/waitlist` listing `waitlist_requests` with status
`'waiting'` or `'offered'`, sorted by `created_at` ascending.

Actions:
- **Offer slot** — sets status to `'offered'` (admin has contacted the family
  outside the system or will do so manually).
- **Expire** — sets status to `'expired'` (slot no longer available).

No automated notifications in this iteration; that is deferred.

## API
- `PATCH /api/admin/waitlist/:id` — body: `{ status: 'offered' | 'expired' }`
