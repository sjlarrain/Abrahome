# A-03: GET /api/admin/rooms/available

## What it does
Returns beds grouped by room/module that are free for a given date range, so
the admin assignment UI can show only valid options.

## Request
```
GET /api/admin/rooms/available?bookingId=<uuid>&checkIn=<YYYY-MM-DD>&checkOut=<YYYY-MM-DD>
```
`bookingId` is used to exclude any beds already assigned to *this* booking
(so re-confirming doesn't false-conflict with itself).

## Response
```json
{
  "modules": [
    {
      "id": "...", "name": "Main Wing",
      "rooms": [
        {
          "id": "...", "name": "Room 1", "capacity": 2,
          "beds": [
            { "id": "...", "name": "Bed A", "available": true }
          ]
        }
      ]
    }
  ]
}
```
A bed is `available: true` when no `assignment_beds` row with `is_active=true`
has an overlapping `[check_in, check_out)` range for that `bed_id`.

## Auth
Admin only (middleware + service-role client).
