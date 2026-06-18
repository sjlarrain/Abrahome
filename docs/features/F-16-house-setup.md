# F-16: Admin — House Setup Wizard

## What it does
On first admin login, if no house exists, the admin is prompted to create one.
The wizard collects: name, timezone (IANA), optional description and location.
Also sets house_settings defaults.

## API
`POST /api/admin/house` — creates house + house_settings in one transaction.

Body: `{ name, timezone, description?, location? }`

| Status | Body |
|--------|------|
| 201 | `{ house: { id, name, timezone } }` |
| 409 | `{ error: "House already exists" }` |
| 403 | Forbidden |
| 422 | Validation error |

## UI
`/admin/house/new` — wizard page shown automatically when `/admin` detects no
house. After creation, redirect to `/admin/house`.

`/admin/house` — view + edit house settings (min_advance_days,
cancellation_deadline_days).
