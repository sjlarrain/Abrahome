# B-02: Availability Calendar Component

## What it does
A month-by-month calendar embedded in the booking request form. Each day is
coloured based on availability for a one-night stay starting that day:

| Colour | Meaning |
|--------|---------|
| Green | Beds available |
| Yellow | ≤ 25% beds remaining (soft-hold pressure) |
| Red | Full (0 available) |
| Gray | Past date or within min_advance_days window |

The component calls `GET /api/availability/range?startDate&endDate` **once per
visible month** (a single batched query, not one request per day) and re-fetches
when the user navigates months. Per-day held-bed counts are bucketed server-side
via `heldBedsByDay` (see `src/lib/availability.ts`). It is purely presentational
— availability is re-validated on the server when the booking is submitted.

The single-night `GET /api/availability` endpoint (B-01) remains available for
point queries; the calendar uses the batched range endpoint for efficiency.

Dates are formatted with **local** date components (not `toISOString`, which is
UTC and would shift the day for timezones east of UTC).

## State
- Selected check-in and check-out dates are lifted to the parent form.
- The component shows two months at a time; navigation arrows scroll by one month.
