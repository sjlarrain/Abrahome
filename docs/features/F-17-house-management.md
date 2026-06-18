# F-17: Admin — Module + Room + Bed Management

## What it does
Admins can add/edit/soft-retire modules, rooms, and beds within the house.
Soft-retire = set `is_active = false`; hard delete is not allowed once bookings
exist.

## API endpoints

| Method | Path | Action |
|--------|------|--------|
| POST | `/api/admin/modules` | Create module |
| PATCH | `/api/admin/modules/[id]` | Update name/description/sort_order |
| DELETE | `/api/admin/modules/[id]` | Soft-retire (sets is_active=false on all rooms+beds) |
| POST | `/api/admin/rooms` | Create room in a module |
| PATCH | `/api/admin/rooms/[id]` | Update or soft-retire |
| POST | `/api/admin/beds` | Create bed in a room |
| PATCH | `/api/admin/beds/[id]` | Update or soft-retire |

## UI
`/admin/house` — hierarchical list: house → modules → rooms → beds.
Inline add/edit/retire buttons at each level.
