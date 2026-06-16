# Abrahome

Shared house reservation platform. An admin configures a house (modules → rooms →
beds), families self-register and are approved, families submit booking requests
that soft-hold capacity, and the admin manually assigns specific beds. Bed-level
capacity is enforced atomically so a bed can never be double-booked.

Full specification: [`HOUSE_RESERVATION_PLAN_v4.md`](./HOUSE_RESERVATION_PLAN_v4.md).

## Tech stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16 (App Router) + React 19 |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Database / Auth | Supabase (PostgreSQL + Auth + RLS) |
| Validation | Zod (shared between client and API) |
| Email | Resend (transactional) |
| Server state | TanStack Query |
| Tests | Vitest (unit) + Playwright (e2e) |
| Package manager | pnpm |

## Getting started

### Prerequisites
- Node.js 22+
- pnpm (`corepack enable`)
- A Supabase project (or the Supabase CLI for local development)

### Setup
```bash
pnpm install
cp .env.example .env.local   # then fill in real values
```

Required environment variables are documented in [`.env.example`](./.env.example).
Note `ADMIN_BOOTSTRAP_EMAIL`: the account that signs up with this email is
auto-approved and promoted to `admin` on first registration.

### Database
Migrations and seed live in [`supabase/`](./supabase). Apply them with the Supabase
CLI:
```bash
supabase db reset        # runs migrations/ then seed.sql
```
- `supabase/migrations/*_schema.sql` — full schema (F-02)
- `supabase/migrations/*_rls.sql` — RLS policies + helper functions (F-03)
- `supabase/seed.sql` — local dev data: one house with modules/rooms/beds (F-04)

### Run
```bash
pnpm dev                 # http://localhost:3000
```

## Scripts
```bash
pnpm dev          # start dev server
pnpm build        # production build
pnpm test         # unit tests (Vitest)
pnpm test:watch   # unit tests, watch mode
pnpm test:e2e     # end-to-end tests (Playwright)
pnpm lint         # eslint
```

## Project structure
```
src/
  app/                  Next.js App Router (pages + API routes)
  lib/
    env.ts              validated environment
    supabase/           browser, server, and service-role clients
    validations/        shared Zod schemas (auth, house, family, booking)
  test/                 test setup
supabase/
  migrations/           schema + RLS
  seed.sql              local dev data
tests/
  unit/                 Vitest
  e2e/                  Playwright
```

## Key design notes
- **Beds are the only enforced capacity unit.** The admin always assigns beds
  manually; the system never auto-assigns.
- **No double-booking:** an `EXCLUDE USING gist` constraint on `assignment_beds`
  makes overlapping bed assignments physically impossible at the database level.
- **Soft holds:** a pending request reserves headcount for its dates until the
  admin acts on it.
- **One active family per user**, enforced by a DB exclusion constraint; the
  family head is also a member row.

## Development workflow
Every feature follows docs → tests → implementation (see plan §8). Commits are
made only once `pnpm exec tsc --noEmit` and `pnpm test` pass.

## Status
Phase 1 (foundation) complete. See the backlog in the plan for what's next.
