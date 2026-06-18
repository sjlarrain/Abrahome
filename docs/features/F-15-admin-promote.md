# F-15: Admin — Promote User to Admin

## What it does
Any admin can promote an already-approved user to `role = 'admin'`.

## API
`PATCH /api/admin/users/[id]` with `{ action: 'promote_admin' }`

Reuses the existing PATCH endpoint by adding a new discriminant.

| Status | Body |
|--------|------|
| 200 | `{ ok: true }` |
| 400 | User is already an admin |
| 403 | Caller is not an admin |
| 404 | User not found |

## UI
A "Make admin" button on the approved users table (F-14 page), shown only for
non-admin rows.
