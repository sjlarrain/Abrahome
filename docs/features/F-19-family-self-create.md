# F-19: Family — Create Own Family + Become Head

## What it does
An approved user who is not yet in a family can create one themselves. They
automatically become the family head and get a `family_members` row with
`relationship = 'head'`.

## API
`POST /api/families` (reuses the same family creation logic; the caller becomes head)

Body: `{ houseId, name, notes? }`

| Status | Body |
|--------|------|
| 201 | `{ family: { id, name } }` |
| 400 | User already in an active family |
| 422 | Validation error |

## UI
`/dashboard/family/new` — form to create a family.
Shown on the dashboard when the user has no family yet.
