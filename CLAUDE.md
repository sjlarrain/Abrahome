# CLAUDE.md

Guidance for Claude Code (and collaborators) working in this repository.

## Project
Abrahome — shared house reservation platform. Admin configures a house
(modules → rooms → beds), families register/are approved, submit booking
requests that soft-hold capacity, and the admin manually assigns beds.
Full spec: `HOUSE_RESERVATION_PLAN_v4.md` (the source of truth for scope and
backlog). Current status: Phase 1 (foundation) complete.

## Commands
```bash
pnpm dev                 # dev server on :3000
pnpm build               # production build
pnpm test                # unit tests (Vitest)
pnpm test:watch          # unit tests, watch
pnpm test:e2e            # e2e (Playwright)
pnpm lint                # eslint
pnpm exec tsc --noEmit   # typecheck
supabase db reset        # apply migrations/ then seed.sql
```

## Workflow & conventions
- **Docs → tests → implementation** for every backlog item (plan §8). Feature
  docs go in `docs/features/<id>-<slug>.md`.
- **Commits:** concise, no co-author/attribution trailer, and only after
  `pnpm exec tsc --noEmit` and `pnpm test` pass. Fix any failures before
  committing — a commit means the state is green.
- **Pushes:** only when the user explicitly asks. Never push automatically after
  a commit.

## Architecture
- Next.js (App Router) with `src/` and the `@/*` → `src/*` import alias.
- Supabase clients in `src/lib/supabase/`:
  - `client.ts` — browser, anon key, RLS applies (Client Components).
  - `server.ts` — cookie-bound server client, anon key, RLS applies.
  - `admin.ts` — service-role, **bypasses RLS**, server-only (privileged writes).
- Privileged writes happen in API routes via the service-role client; RLS is
  defense-in-depth for client reads and family-scoped writes.
- Shared **Zod** schemas in `src/lib/validations/` are the single validation
  source for both client and API.
- `src/lib/env.ts` validates environment at load and fails fast.

## Capacity model (the core invariant)
- **Beds are the only enforced capacity unit.** The admin always assigns beds
  manually; the system never auto-assigns.
- `assignment_beds` has an `EXCLUDE USING gist` constraint (`no_overlapping_bed`)
  making overlapping bed bookings physically impossible at the DB level.
- **Soft holds** (pending requests reserving headcount) and the availability math
  live in the availability query / `assign_booking_atomic` RPC — *not yet built*
  (Phase 2/3). The EXCLUDE constraint only guards confirmed bed rows.
- One active family per user, enforced by a DB exclusion constraint; the family
  head is also a `family_members` row.

## Gotchas
- Installed stack is newer than the plan text (plan says Next 14): actually
  **Next 16 / React 19 / Tailwind 4 / Zod 4**. Stay on Next 16.
- **Zod 4 `.uuid()` is strict RFC v4.** Postgres accepts any hex, but fixed
  fixture/seed IDs must be valid v4 (`x0000000-0000-4000-8000-0000000000NN`).
- pnpm 11 gates native builds in `pnpm-workspace.yaml` `allowBuilds:` — `sharp`
  and `unrs-resolver` must be `true` or `next build` aborts.
- Migrations can be validated offline against a local Postgres 16 cluster
  (contrib ships `btree_gist`); stub `auth.users` + `auth.uid()` first.

## Layout
```
src/app/            pages + API routes
src/lib/            env, supabase clients, validations
supabase/migrations schema (_schema) + RLS (_rls)
supabase/seed.sql   local dev data
tests/unit          Vitest    tests/e2e  Playwright
```
