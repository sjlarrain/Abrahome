# F-13: Pending Approval Screen

## What it does
Users who have verified their email but not yet been approved by an admin land
on `/pending-approval`. The page explains the situation and provides a sign-out
button so they can switch accounts.

## Access control
- Middleware (F-12) sends all unapproved authenticated users here.
- Middleware redirects approved users away from this page.
- Unauthenticated users are redirected to `/login`.
