# F-14: Admin — User Approval Interface

## What it does
Admins see a list of all users (pending first, then approved/rejected).
They can approve or reject each pending user.

## API endpoints

### GET /api/admin/users
Returns all user_profiles rows. Admin-only (service-role client, checked via
`is_approved + role` from session).

Response: `{ users: UserProfile[] }`

### PATCH /api/admin/users/[id]
Approves or rejects a user.

Body: `{ action: 'approve', role: 'family_head' | 'family_member' | 'solo_user' }
     | { action: 'reject' }`

| Status | Body |
|--------|------|
| 200 | `{ ok: true }` |
| 400 | `{ error: "..." }` |
| 403 | `{ error: "Forbidden" }` |
| 404 | `{ error: "User not found" }` |

## UI
`/admin/users` — server-rendered table with Approve/Reject buttons per pending
user. Approved/rejected users are shown below in a collapsed list.

## Access control
Middleware (F-12) already blocks non-admins from `/admin/**`. The API routes
additionally verify `role = 'admin'` from the session to guard against direct
API calls.
