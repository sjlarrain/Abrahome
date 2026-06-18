# F-20: Family — Profile Page

## What it does
A family member can view their own family profile: family name, all members
(via `family_members_safe` view — DOB hidden), and their own user details.

## UI
`/dashboard/family` — server-rendered page showing:
- Family name and head
- Member list (name, relationship) — from `family_members_safe`
- Link to create a family if the user has none

## Access control
RLS on `family_members` (and the safe view) limits rows to the user's own
family. No additional server-side checks needed beyond the session.
