# F-18: Admin — Family Creation + Member Assignment

## What it does
Admins create families and assign approved users as members. The family head
is also recorded as a `family_members` row with `relationship = 'head'`.

## API

### POST /api/admin/families
Body: `{ houseId, name, familyHeadId, notes? }`

| Status | Body |
|--------|------|
| 201 | `{ family: { id, name } }` |
| 404 | Head user not found |
| 409 | Head is already in an active family |
| 422 | Validation error |

### POST /api/admin/families/[id]/members
Body: `{ userId, fullName, relationship, dateOfBirth? }`

Adds a member to an existing family and, if `userId` is provided, creates the
`family_members` row linked to that user.

## UI
`/admin/families` — list of families with member counts. Inline "Add member"
form per family.

# F-18a: Admin — Provision Login for a Member

## What it does
For minor children or dependants without their own email, an admin can create
a Supabase Auth account and link it to an existing `family_members` row.

## API
`POST /api/admin/families/[id]/members/[memberId]/provision-login`
Body: `{ email, password }`

Creates auth user + updates `family_members.user_id`.
