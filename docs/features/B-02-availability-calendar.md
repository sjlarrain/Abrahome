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

The component calls `GET /api/availability` as the user changes the date range
selection. It is purely presentational — availability is re-validated on the
server when the booking is submitted.

## State
- Selected check-in and check-out dates are lifted to the parent form.
- The component shows two months at a time; navigation arrows scroll by one month.
