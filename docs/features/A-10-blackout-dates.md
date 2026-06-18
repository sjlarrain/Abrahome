# A-10: Blackout Date Create / Delete

## What it does
Admin page at `/admin/blackout` lists existing blackout dates and allows
creating new ones (start date, end date, reason, optional module/room scope)
or deleting them.

## API
- `GET /api/admin/blackout` — list all blackout dates with module/room names
- `POST /api/admin/blackout` — create; body: `{ startDate, endDate, reason, moduleId?, roomId? }`
- `DELETE /api/admin/blackout/:id` — delete

## Validation
- `endDate >= startDate`
- `reason` required, max 200 chars
