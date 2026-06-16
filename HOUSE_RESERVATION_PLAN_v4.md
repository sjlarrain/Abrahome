# House Reservation System — Detailed Plan v4

**Project**: Shared house reservation platform for managing bookings with family groups, capacity constraints, and admin oversight.

**Status**: Final planning — Backlog defined, all v3 review conflicts resolved, ready for Phase 1

**Version**: 4.0 — Capacity model, soft holds, bootstrap, conflict-safety, deletion flow, timezone, verification, and family model all finalized.

---

## Changelog from v3

| Item | v3 | v4 |
|------|----|----|
| Capacity authority | House/module/room/bed all carried `capacity` | **Beds only** are enforced. `modules.capacity` and `rooms.capacity` removed. `houses.total_capacity` kept as derived/display value. Admin always assigns beds manually — system never auto-assigns. |
| Pending requests | Held nothing until confirm | **Soft hold** at headcount level: a pending request reserves `attendee_count` against the bed pool for its dates. Held until admin acts or family cancels. Auto-expiry deferred to v2. |
| First admin | Undefined (chicken-and-egg) | `ADMIN_BOOTSTRAP_EMAIL` env var: matching signup is auto-approved and promoted to admin. |
| Solo minors | Contradiction (no login but could "submit") | Admin provisions a login account for a minor when needed; `family_members.user_id` is then populated. |
| Double-booking safety | "FOR UPDATE lock" only | `assign_booking_atomic` keeps the lock **plus** a DB-level `EXCLUDE USING gist` constraint on `assignment_beds` (bed_id, daterange) as a physical backstop. |
| Bed/room deletion | No rule (FK would fail) | Guided **reassignment flow**: affected future bookings must be reassigned before a bed/room can be deleted. |
| Timezone | Unspecified | `timezone` column on `houses`; cron completion and cancellation-deadline math use it. |
| Email verification | §2.1 (Supabase) vs §3.3 (Resend) conflict | **Supabase Auth built-in** verification. Resend used only for app transactional emails. |
| Family model | `my_family_id()` could return null for heads | **One active family per user**; the head also exists as a `family_members` row. |
| Age rules | Ambiguous | **Descriptive only** — `child`/`solo_minor` are labels; no threshold validation. |
| Open Questions | "None" (inaccurate) | Updated to reflect the v3 review resolutions below. |

---

## Changelog from v2 (retained)

| Item | v2 | v3 |
|------|----|----|
| Bathrooms | Not modelled | `bathroom_type` on rooms (suite / shared). Shared bathrooms tracked per module. |
| House setup | Not modelled | Admin creates the house on first login. House config is part of onboarding. |
| Family creation | Admin only | Any approved member can create a family. Admin can also assign/move members. |
| Booking frequency limits | v2 | Deferred to v2 — admin sets rules in settings |
| In-app notifications | MVP | Deferred to v2 (backlog) |
| WhatsApp notifications | Not planned | Deferred to v3 (backlog) |
| Admin promotion | One admin | Any admin can promote another user to admin |
| Cancellation | Unclear | Families can cancel anytime up to day before check-in |
| Backlog | Missing | Fully defined, prioritised, with story points |
| TDD approach | Not stated | All features: docs → tests → implementation |

---

## 1. Executive Summary

### Problem Statement
A shared house with limited capacity is used by multiple families. Each family has different compositions (adult + spouse + kids under 18, or solo users under 15 with a responsible adult always on site). The system must:
- Allow an admin to create and configure the house (modules, rooms, beds, bathrooms)
- Allow families to self-register, get admin approval, and create or join family groups
- Allow families to submit booking requests (dates + attendees)
- Allow the admin to assign specific rooms/beds to each booking
- Enforce bed-level capacity limits atomically
- Respect blackout dates set by the admin
- Provide clear availability visibility to both families and admin

### Solution Approach
- Admin creates the house configuration (modules → rooms → beds + bathroom type)
- Users self-register → admin approves → user creates or is assigned to a family
- Families submit booking requests → request soft-holds capacity → admin manually assigns rooms/beds → family gets confirmed booking
- System atomically prevents overbooking at the database level (lock + exclusion constraint)

### Confirmed Decisions
- Next.js 14 (App Router) on Vercel
- Business logic in TypeScript API routes (one Postgres RPC for atomic capacity check)
- Resend for all transactional emails; Supabase Auth for email verification
- `house_id` on all core tables (multi-tenancy ready)
- TDD approach: documentation → tests → implementation for every feature
- No in-app notifications in MVP (email only)
- No WhatsApp in MVP
- **Beds are the only enforced capacity unit; the admin always assigns beds by hand** (no auto-assignment), applying rules the system does not encode (bathroom suitability, keeping families together, etc.)
- **Pending requests soft-hold capacity** until acted on
- **First admin** bootstrapped via `ADMIN_BOOTSTRAP_EMAIL`
- **One active family per user**; family head is also a member row

---

## 2. Detailed Requirements

### 2.1 User Management

- Self-registration with email + password
- Email verification via **Supabase Auth's built-in flow** (Resend is used only for app transactional emails: approvals, booking status)
- Admin approves or rejects new registrations
- Roles: `admin`, `family_head`, `family_member`, `solo_user`
- **Bootstrap:** the email configured in `ADMIN_BOOTSTRAP_EMAIL` is auto-approved and set to `admin` on signup. All other users start unapproved.
- Any admin can promote another approved user to admin
- Admin can create families, assign/move members between families
- **Admin can provision a login account for a member** (e.g. a solo minor) — sets the member's `user_id`
- Any approved member can create a family and become its head
- Family heads can view and update their own family roster
- User profiles: full name, email, phone, role, approval status

### 2.2 House Configuration (Admin-Only Setup)

- On first login, admin is prompted to create the house (name, location, timezone, description). `total_capacity` is shown as a **derived value** (sum of beds), not a hand-entered constraint.
- Admin then creates modules (name, description)
- Admin creates rooms within each module:
  - Room name
  - Bathroom type: `suite` (private en-suite) or `shared` (shared within module)
- Admin creates beds within each room (name, type: single / double / bunk_top / bunk_bottom). **Beds are the only enforced capacity unit.**
- Admin can edit any house configuration at any time
- **Deleting a bed or room that future confirmed bookings reference requires a guided reassignment flow first** (see §2.6)
- House configuration is the seed that all bookings and capacity checks depend on

### 2.3 Family Groups

- Any approved user can create a family (they become the family head)
- Admin can also create families and assign heads
- **Each user belongs to exactly one active family; the family head is also represented as a `family_members` row** (so row-level security and booking ownership resolve correctly)
- Family structure: head + optional spouse + children under 18 + solo minors under 15
- Solo minors under 15 can have a booking submitted for them; a responsible adult is always on site. **If a minor needs to act in the system, the admin provisions a login for them.**
- Age labels (`child`, `solo_minor`) are **descriptive** — the system does not validate the under-18 / under-15 thresholds
- Admin can reassign any member to a different family
- Family heads manage their own roster (add/remove members, mark inactive)

### 2.4 Booking Requests

- Family submits: check-in date, check-out date, which members attending, module preference (optional), notes
- System validates: no blackout overlap, no duplicate for same family on overlapping dates, at least one attendee, enough capacity (counting soft holds)
- **On submission the request soft-holds `attendee_count` against the bed pool for those dates.** Availability = `total_beds − confirmed_beds_assigned − pending_attendee_count` over overlapping date ranges.
- System shows live availability before submission (green / gray / red calendar), reflecting soft holds
- Request created with status `pending`
- Resend email: "We received your booking request"
- If the house is full for those dates (no remaining headcount after holds): offer to join the waitlist

### 2.5 Admin Booking Assignment

- Pending requests listed sorted by requested check-in date; **oldest pending is surfaced prominently** so soft holds don't linger unaddressed
- Admin sees: family name, dates, attendee count, bathroom preference derivable from module, notes
- Admin **manually selects rooms and beds** for those dates (available beds shown, blocked beds grayed out). The system never auto-assigns; the admin applies judgment for rules it does not encode.
- System previews capacity impact before confirming
- On confirm: `assign_booking_atomic` RPC runs (lock + exclusion constraint), booking confirmed, email sent to family
- Admin can reject with a written reason — rejection email sent, soft hold released
- Admin can cancel a confirmed booking (cancellation email sent, beds released)

### 2.6 Booking Modification, Cancellation & Config Reassignment

- Families can modify the attendee list on a confirmed booking (subject to capacity)
- Families can cancel up until the day before check-in (after that, admin-only cancellation). The deadline is evaluated in the **house's timezone**.
- Admin can cancel any booking at any time
- **Config reassignment flow:** before an admin can delete a bed or room with future confirmed assignments, the system lists the affected bookings and requires the admin to move them to other beds (or cancel them). Only when no future assignment references the bed/room can it be removed.
- All changes logged in `booking_events`

### 2.7 Admin Rules Configuration (v1 — basic)

- Admin sets the minimum advance notice for bookings (e.g., 7 days)
- Admin sets the cancellation deadline (we confirmed: day before check-in)
- Booking frequency limits deferred to v2
- Pending-hold auto-expiry deferred to v2 (v1: holds persist until acted on)

### 2.8 Fairness View

- Admin sees bookings per family per year and total nights used
- Families see their own history only

### 2.9 Waitlist

- If dates are full (no headcount remaining after soft holds + confirmed beds), family can join the waitlist
- If a booking is cancelled and a waitlisted family fits, admin is notified
- Admin manually offers the slot (no automatic assignment)

### 2.10 Deferred to v2 / v3 (Backlog)

- In-app notifications (v2)
- Booking frequency limits per family (v2)
- Pending-hold auto-expiry (v2)
- WhatsApp notifications (v3)
- Pricing and cost-sharing (v2)
- Multi-house support (v3, architecture already supports it)
- Google Calendar sync (v3)

---

## 3. System Architecture

### 3.1 Tech Stack

| Layer | Technology | Reason |
|-------|-----------|--------|
| Framework | Next.js 14 (App Router) | API routes + frontend in one repo, Vercel-native |
| Language | TypeScript end-to-end | Type safety from DB to UI |
| Hosting | Vercel | Zero-config deploy, serverless, cron jobs |
| Database | Supabase (PostgreSQL) | Managed Postgres, auth, RLS, realtime |
| Auth | Supabase Auth | JWT, email/password, built-in email verification, MFA-ready |
| Business logic | Next.js API Routes | TypeScript, testable, npm-ready |
| Capacity check | Supabase RPC (1 function) | Atomic transaction; lock + exclusion constraint prevent race conditions |
| Email | Resend | Transactional app emails (approval, booking status) |
| State | TanStack Query | Server state sync, optimistic updates |
| UI | Shadcn/ui + Tailwind CSS | Accessible, themeable, responsive |
| Testing | Vitest (unit) + Playwright (e2e) | Fast unit tests, real browser e2e |
| Validation | Zod | Shared schemas between frontend and API |

### 3.2 Architecture Diagram

```
┌──────────────────────────────────────────────────┐
│                    Vercel                         │
│                                                  │
│  /app (Next.js pages)    /app/api (API routes)   │
│  ├─ (auth)/              ├─ auth/                │
│  ├─ (family)/            ├─ bookings/            │
│  │   ├─ dashboard/       ├─ families/            │
│  │   ├─ bookings/        ├─ availability/        │
│  │   └─ family/          ├─ waitlist/            │
│  └─ (admin)/             └─ admin/               │
│      ├─ dashboard/           ├─ users/           │
│      ├─ house-setup/         ├─ house/           │
│      ├─ bookings/            ├─ bookings/        │
│      ├─ users/               ├─ blackouts/       │
│      └─ calendar/            └─ settings/        │
│                                                  │
│  /lib                    /tests                  │
│  ├─ supabase.ts          ├─ unit/               │
│  ├─ capacity.ts          └─ e2e/                │
│  ├─ email.ts                                     │
│  └─ validations/                                 │
└──────────────────────────┬───────────────────────┘
                           │
              ┌────────────┴───────────┐
              ▼                        ▼
   ┌──────────────────┐      ┌──────────────────┐
   │    Supabase      │      │     Resend        │
   │                  │      │                  │
   │  PostgreSQL      │      │  request recv'd  │
   │  Supabase Auth   │      │  confirmed       │
   │  (verification)  │      │  rejected        │
   │  RLS Policies    │      │  cancelled       │
   │  1 RPC + EXCLUDE │      │  approved user   │
   └──────────────────┘      └──────────────────┘
```

### 3.3 Authentication & Authorization Flow

```
1. User registers → Supabase Auth → Supabase sends verification email
2. User verifies email → user_profiles row created (is_approved: false)
   → EXCEPTION: if email == ADMIN_BOOTSTRAP_EMAIL → role=admin, is_approved=true
3. Admin sees "N pending users" → approves + assigns role
   → Resend: "You've been approved"
4. Approved user logs in → JWT in httpOnly cookie
5. Middleware checks:
   - Is JWT valid? → if not, redirect to login
   - Is user approved? → if not, show pending screen
   - Is route admin-only? → check role
6. Every API call: Supabase RLS enforces row-level access
```

### 3.4 Development Approach: Docs → Tests → Implementation

For every feature and every API route, the workflow is:

```
1. Write or update the spec in /docs/features/<feature>.md
   - What it does, inputs, outputs, edge cases, error states
2. Write the test first (Vitest for unit, Playwright for e2e)
   - Test the contract, not the implementation
   - Tests are the living specification
3. Implement until tests pass
4. Update docs if anything changed during implementation
```

This discipline means:
- You always know what a feature is supposed to do before writing code
- Regressions are caught automatically
- The codebase is documented by passing tests, not by comments

---

## 4. Data Model

### 4.1 Entity Relationships

```
houses (1)
  ├─→ modules (many)
  │     └─→ rooms (many)
  │           ├─ bathroom_type: 'suite' | 'shared'
  │           └─→ beds (many)        ← the only enforced capacity unit
  │
  ├─→ families (many)
  │     └─→ family_members (many)    ← one active family per user; head included
  │           └─ linked to user_profiles (nullable until a login is provisioned)
  │
  ├─→ booking_requests (many)        ← soft-holds capacity while pending
  │     ├─→ booking_attendees (junction: request ↔ family_member)
  │     └─→ booking_assignments (1)
  │           └─→ assignment_beds (junction: assignment ↔ bed; carries dates + EXCLUDE)
  │
  ├─→ blackout_dates (many)
  ├─→ booking_events (audit log)
  ├─→ waitlist_requests (many)
  └─→ house_settings (1 row: rules set by admin)
```

### 4.2 Tables

#### `user_profiles`
```sql
CREATE TABLE user_profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT UNIQUE NOT NULL,
  full_name     TEXT NOT NULL,
  phone         TEXT,
  role          TEXT NOT NULL DEFAULT 'family_member'
                  CHECK (role IN ('admin', 'family_head', 'family_member', 'solo_user')),
  is_approved   BOOLEAN NOT NULL DEFAULT FALSE,
  approved_by   UUID REFERENCES user_profiles(id),
  approved_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### `houses`
```sql
CREATE TABLE houses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  total_capacity  INT,                    -- derived/display: sum of beds. Not enforced.
  timezone        TEXT NOT NULL DEFAULT 'UTC',  -- IANA tz, e.g. 'America/Mexico_City'
  description     TEXT,
  location        TEXT,
  created_by      UUID NOT NULL REFERENCES user_profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- created_by = the admin who set up the house on first login
-- timezone drives cron completion + cancellation-deadline math
-- v1: one row. v3+: multiple rows for multi-house commercial use.
```

#### `house_settings`
```sql
CREATE TABLE house_settings (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  house_id                  UUID NOT NULL UNIQUE REFERENCES houses(id),
  min_advance_days          INT NOT NULL DEFAULT 7,
  cancellation_deadline_days INT NOT NULL DEFAULT 1,
  -- v2 additions (nullable until activated):
  max_bookings_per_year     INT,
  max_nights_per_booking    INT,
  pending_hold_expiry_days  INT,          -- v2: null in MVP (holds never auto-expire)
  updated_by                UUID REFERENCES user_profiles(id),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- One row per house. cancellation_deadline_days = 1 → cancel up to 1 day before check-in.
```

#### `modules`
```sql
CREATE TABLE modules (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  house_id    UUID NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- capacity column removed in v4: beds are the only enforced capacity unit.
```

#### `rooms`
```sql
CREATE TABLE rooms (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id       UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  house_id        UUID NOT NULL REFERENCES houses(id),
  name            TEXT NOT NULL,
  room_type       TEXT NOT NULL CHECK (room_type IN ('shared', 'private')),
  bathroom_type   TEXT NOT NULL CHECK (bathroom_type IN ('suite', 'shared')),
  -- suite: private en-suite bathroom in this room
  -- shared: bathroom is shared with other rooms in the module
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,  -- soft-retire instead of hard delete
  sort_order      INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- capacity column removed in v4: room capacity = count of its beds.
```

#### `beds`
```sql
CREATE TABLE beds (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id   UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  house_id  UUID NOT NULL REFERENCES houses(id),
  name      TEXT NOT NULL,
  bed_type  TEXT NOT NULL CHECK (bed_type IN ('single', 'double', 'bunk_top', 'bunk_bottom')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,  -- soft-retire instead of hard delete
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  -- No status column: availability is computed per date range, not stored.
);
```

#### `families`
```sql
CREATE TABLE families (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  house_id        UUID NOT NULL REFERENCES houses(id),
  name            TEXT NOT NULL,
  family_head_id  UUID NOT NULL REFERENCES user_profiles(id),
  notes           TEXT,
  created_by      UUID NOT NULL REFERENCES user_profiles(id),
  -- created_by = user who created the family (family head or admin)
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### `family_members`
```sql
CREATE TABLE family_members (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id       UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  house_id        UUID NOT NULL REFERENCES houses(id),
  user_id         UUID REFERENCES user_profiles(id),
  -- nullable until a login is provisioned (children, or minors before admin creates an account)
  full_name       TEXT NOT NULL,
  relationship    TEXT NOT NULL
                    CHECK (relationship IN ('head', 'spouse', 'child', 'solo_minor')),
  date_of_birth   DATE,
  -- sensitive: not returned in list queries; admin only after creation
  -- descriptive only: thresholds (under 18 / under 15) are NOT validated by the system
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(family_id, user_id),
  -- one active family per user: a user_id may appear in at most one active membership
  CONSTRAINT one_active_family_per_user EXCLUDE (user_id WITH =) WHERE (is_active AND user_id IS NOT NULL)
);
-- The family head MUST also have a row here (relationship = 'head') so my_family_id() resolves.
```

#### `booking_requests`
```sql
CREATE TABLE booking_requests (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  house_id          UUID NOT NULL REFERENCES houses(id),
  family_id         UUID NOT NULL REFERENCES families(id),
  check_in_date     DATE NOT NULL,
  check_out_date    DATE NOT NULL,
  attendee_count    INT NOT NULL,
  module_preference UUID REFERENCES modules(id),
  notes             TEXT,
  status            TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'confirmed', 'rejected', 'cancelled')),
  rejection_reason  TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_dates CHECK (check_out_date > check_in_date)
);
-- A row with status='pending' soft-holds attendee_count for [check_in_date, check_out_date).
-- Availability query subtracts pending attendee_count from the bed pool over overlapping ranges.
```

#### `booking_attendees`
```sql
CREATE TABLE booking_attendees (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_request_id  UUID NOT NULL REFERENCES booking_requests(id) ON DELETE CASCADE,
  family_member_id    UUID NOT NULL REFERENCES family_members(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(booking_request_id, family_member_id)
);
-- booking_requests.attendee_count must equal COUNT(booking_attendees) — kept in sync on modify.
```

#### `booking_assignments`
```sql
CREATE TABLE booking_assignments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_request_id  UUID NOT NULL UNIQUE REFERENCES booking_requests(id),
  house_id            UUID NOT NULL REFERENCES houses(id),
  family_id           UUID NOT NULL REFERENCES families(id),
  check_in_date       DATE NOT NULL,
  check_out_date      DATE NOT NULL,
  attendee_count      INT NOT NULL,
  status              TEXT NOT NULL DEFAULT 'confirmed'
                        CHECK (status IN ('confirmed', 'completed', 'cancelled')),
  notes               TEXT,
  assigned_by         UUID NOT NULL REFERENCES user_profiles(id),
  assigned_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Dates/family/count denormalized from booking_requests; kept in sync on attendee modification.
```

#### `assignment_beds`
```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE assignment_beds (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_assignment_id UUID NOT NULL REFERENCES booking_assignments(id) ON DELETE CASCADE,
  bed_id                UUID NOT NULL REFERENCES beds(id),
  family_member_id      UUID REFERENCES family_members(id),
  check_in_date         DATE NOT NULL,    -- denormalized so the exclusion constraint can apply
  check_out_date        DATE NOT NULL,
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,  -- false when assignment is cancelled
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(booking_assignment_id, bed_id),
  -- Physical backstop against double-booking: no two active rows may overlap on the same bed.
  CONSTRAINT no_overlapping_bed EXCLUDE USING gist (
    bed_id WITH =,
    daterange(check_in_date, check_out_date, '[)') WITH &&
  ) WHERE (is_active)
);
-- Room is derivable via bed → room JOIN. No separate assignment_rooms table needed.
```

#### `blackout_dates`
```sql
CREATE TABLE blackout_dates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  house_id    UUID NOT NULL REFERENCES houses(id),
  module_id   UUID REFERENCES modules(id),   -- null = whole house
  room_id     UUID REFERENCES rooms(id),     -- null = whole module or house
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  reason      TEXT NOT NULL,
  created_by  UUID NOT NULL REFERENCES user_profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_blackout CHECK (end_date >= start_date)
);
```

#### `booking_events` (audit log)
```sql
CREATE TABLE booking_events (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_request_id  UUID NOT NULL REFERENCES booking_requests(id),
  house_id            UUID NOT NULL REFERENCES houses(id),
  actor_id            UUID NOT NULL REFERENCES user_profiles(id),
  event_type          TEXT NOT NULL CHECK (event_type IN (
                        'created', 'confirmed', 'rejected', 'cancelled', 'completed',
                        'attendees_modified', 'notes_updated', 'rooms_reassigned'
                      )),
  old_value           JSONB,
  new_value           JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- No DELETE policy: this table is append-only for integrity.
-- 'rooms_reassigned' also covers config-driven reassignment (bed/room retirement).
```

#### `waitlist_requests`
```sql
CREATE TABLE waitlist_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  house_id        UUID NOT NULL REFERENCES houses(id),
  family_id       UUID NOT NULL REFERENCES families(id),
  check_in_date   DATE NOT NULL,
  check_out_date  DATE NOT NULL,
  attendee_count  INT NOT NULL,
  notes           TEXT,
  status          TEXT NOT NULL DEFAULT 'waiting'
                    CHECK (status IN ('waiting', 'offered', 'converted', 'expired')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 4.3 Booking State Machine

```
  Family submits  (soft-holds capacity)
       │
       ▼
   [PENDING] ──── admin rejects (+ reason) ──→ [REJECTED] terminal (hold released)
       │
       │ admin manually assigns beds + confirms (RPC: lock + EXCLUDE)
       ▼
  [CONFIRMED]
       │
   ┌───┴───────────────────┐
   │                       │
   │ family cancels        │ check-out date passes
   │ (before deadline)     │ (nightly cron, house tz)
   │ or admin cancels      │
   ▼                       ▼
[CANCELLED] terminal   [COMPLETED] terminal
(beds released:        
 assignment_beds.is_active=false)
```

**Cancellation rule:** Families can cancel up to 1 day before check-in (evaluated in the house's timezone). After that, only admin can cancel. Controlled by `house_settings.cancellation_deadline_days`.

### 4.4 Row-Level Security

```sql
-- Helper functions (SECURITY DEFINER — cannot be spoofed by users)
CREATE FUNCTION is_admin() RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
$$ LANGUAGE sql SECURITY DEFINER;

-- One active family per user; the head also has a family_members row, so this resolves for heads.
CREATE FUNCTION my_family_id(p_house_id UUID) RETURNS UUID AS $$
  SELECT family_id FROM family_members
  WHERE user_id = auth.uid() AND house_id = p_house_id AND is_active LIMIT 1
$$ LANGUAGE sql SECURITY DEFINER;

-- user_profiles: own row or admin
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY up_select ON user_profiles FOR SELECT
  USING (id = auth.uid() OR is_admin());
CREATE POLICY up_update ON user_profiles FOR UPDATE
  USING (id = auth.uid());

-- family_members: own family or admin. date_of_birth excluded via safe view.
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY fm_select ON family_members FOR SELECT
  USING (family_id = my_family_id(house_id) OR is_admin());

-- Sensitive data view (excludes date_of_birth)
CREATE VIEW family_members_safe AS
  SELECT id, family_id, house_id, user_id, full_name, relationship, is_active, created_at
  FROM family_members;
-- All family-facing queries use this view. Admin queries the table directly.

-- booking_requests: own family or admin
ALTER TABLE booking_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY br_select ON booking_requests FOR SELECT
  USING (family_id = my_family_id(house_id) OR is_admin());
CREATE POLICY br_insert ON booking_requests FOR INSERT
  WITH CHECK (family_id = my_family_id(house_id));

-- booking_events: read-only for own family's bookings, admin sees all. No DELETE.
ALTER TABLE booking_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY be_select ON booking_events FOR SELECT
  USING (is_admin() OR EXISTS (
    SELECT 1 FROM booking_requests br
    WHERE br.id = booking_request_id
    AND br.family_id = my_family_id(br.house_id)
  ));
```

---

## 5. Booking Status & Email Map

| Event | Triggered by | Email to family | Channel |
|-------|-------------|-----------------|---------|
| Email verification | Registration | "Confirm your email" | Supabase Auth |
| User approved | Admin | "You've been approved" | Resend |
| Request submitted | Family | "We received your booking request" | Resend |
| Request confirmed | Admin | "Your booking is confirmed — rooms: [details]" | Resend |
| Request rejected | Admin | "Your booking was not approved: [reason]" | Resend |
| Booking cancelled by family | Family | "Your cancellation is confirmed" | Resend |
| Booking cancelled by admin | Admin | "Your booking has been cancelled by the admin" | Resend |
| Booking reassigned (config change) | Admin | "Your room assignment changed" | Resend |
| Booking completed | Nightly cron | No email | — |
| Waitlist slot available | Admin notifies | "A slot opened for your requested dates" | Resend |

---

## 6. API Routes

All routes in `/app/api/`. Shared middleware: `withAuth(role?)`.

### Auth
```
POST /api/auth/register         → create Supabase user + profile (bootstrap email auto-admin)
GET  /api/auth/me               → return profile + role + family
POST /api/auth/logout           → clear session
```

### Family-facing
```
GET  /api/availability          → { checkIn, checkOut } → occupancy (incl. soft holds) + available count
GET  /api/bookings              → own family's bookings
POST /api/bookings              → submit booking request (creates soft hold)
GET  /api/bookings/:id          → detail: request + attendees + assignment + events
POST /api/bookings/:id/cancel   → cancel (checks deadline rule in house tz; releases hold/beds)
PUT  /api/bookings/:id/attendees → modify attendee list on confirmed booking (re-syncs counts)

GET  /api/family                → own family + members (safe view)
POST /api/families              → create a new family (current user becomes head + member row)
PUT  /api/family/members/:id    → update member (family_head only)
```

### Admin-only
```
GET  /api/admin/dashboard       → capacity overview + pending count + oldest-pending + upcoming
GET  /api/admin/calendar        → { month, year } → bookings + blackouts per day

GET  /api/admin/bookings        → all pending requests (sorted by check-in, oldest hold flagged)
GET  /api/admin/bookings/:id    → full detail with family info
POST /api/admin/bookings/:id/confirm  → calls assign_booking_atomic RPC
POST /api/admin/bookings/:id/reject   → { reason } → update + email + release hold
POST /api/admin/bookings/:id/cancel   → admin-side cancellation + email + release beds

GET  /api/admin/users           → all users (pending + approved)
POST /api/admin/users/:id/approve    → { role } → approve + email
POST /api/admin/users/:id/reject     → { reason }
POST /api/admin/users/:id/promote    → promote to admin (requires caller to be admin)

GET  /api/admin/families        → all families + member counts
POST /api/admin/families        → create family
PUT  /api/admin/families/:id    → edit family
PUT  /api/admin/families/:id/members/:memberId → move member between families
POST /api/admin/families/:id/members/:memberId/account → provision a login for a member (minor)

GET  /api/admin/house           → house config: modules → rooms → beds
POST /api/admin/house           → create house (first-time setup; name, timezone, location)
PUT  /api/admin/house           → edit house details
POST /api/admin/house/modules   → add module
PUT  /api/admin/house/modules/:id → edit module
POST /api/admin/house/rooms     → add room (with bathroom_type)
PUT  /api/admin/house/rooms/:id → edit room
POST /api/admin/house/rooms/:id/retire → reassignment flow then soft-retire room
POST /api/admin/house/beds      → add bed
POST /api/admin/house/beds/:id/retire → reassignment flow then soft-retire bed

GET  /api/admin/rooms/available → { checkIn, checkOut } → available beds per room/module
GET  /api/admin/blackouts       → all blackout dates
POST /api/admin/blackouts       → create blackout date
DELETE /api/admin/blackouts/:id → remove blackout date

GET  /api/admin/settings        → house_settings row
PUT  /api/admin/settings        → update rules (min_advance_days, cancellation_deadline_days)

GET  /api/admin/fairness        → bookings + nights per family per year
GET  /api/admin/waitlist        → all waitlist entries
POST /api/admin/waitlist/:id/notify → notify waitlisted family of opening
```

---

## 7. Implementation Backlog

The backlog is the single source of truth for what to build and in what order. Every item has: an ID, a title, a size (S/M/L/XL), a phase, and a status. Items are ordered by dependency and priority within each phase.

**Size guide**: S = half day, M = 1 day, L = 2-3 days, XL = 3-5 days

**Before coding any item**: write or update the feature doc in `/docs/features/`. Write the tests. Then implement.

---

### PHASE 1 — Foundation

| ID | Title | Size | Depends on | Status |
|----|-------|------|-----------|--------|
| F-01 | Supabase project setup + env config (incl. ADMIN_BOOTSTRAP_EMAIL) | S | — | todo |
| F-02 | Write full database schema (all tables, btree_gist, EXCLUDE constraints) | L | F-01 | todo |
| F-03 | Write RLS policies + helper functions | L | F-02 | todo |
| F-04 | Write seed script (house w/ timezone, modules, rooms, beds) | M | F-02 | todo |
| F-05 | Next.js 14 project scaffold + Tailwind + Shadcn | M | — | todo |
| F-06 | Supabase client setup + auth helpers | S | F-01, F-05 | todo |
| F-07 | Zod validation schemas (shared lib) | M | F-05 | todo |
| F-08 | Vitest + Playwright test setup | M | F-05 | todo |
| F-09 | Registration + bootstrap-admin rule + Supabase Auth | M | F-06, F-07 | todo |
| F-10 | Email verification flow (Supabase built-in) | S | F-09 | todo |
| F-11 | Login + logout + session middleware | M | F-09 | todo |
| F-12 | Role-based route protection middleware | M | F-11 | todo |
| F-13 | "Pending approval" screen for unapproved users | S | F-12 | todo |
| F-14 | Admin: user approval interface (list, approve, reject) | M | F-12, F-03 | todo |
| F-15 | Admin: promote user to admin | S | F-14 | todo |
| F-16 | Admin: house setup wizard (create house w/ timezone on first login) | L | F-12, F-03 | todo |
| F-17 | Admin: module + room + bed management (with soft-retire) | L | F-16 | todo |
| F-18 | Admin: family creation + member assignment (head as member row) | M | F-14, F-17 | todo |
| F-18a | Admin: provision login account for a member (minor) | S | F-18 | todo |
| F-19 | Family: create own family + become head (+ member row) | M | F-12, F-18 | todo |
| F-20 | Family: profile page (view own members, safe view) | M | F-19 | todo |
| F-21 | Deploy staging to Vercel | S | F-12 | todo |

**Phase 1 exit criteria**: Bootstrap admin can log in; any user can register, verify email, wait for approval. Admin can approve users, set up house config (with timezone), create families, and provision member logins. Staging deployed on Vercel.

---

### PHASE 2 — Family Booking UI

| ID | Title | Size | Depends on | Status |
|----|-------|------|-----------|--------|
| B-01 | GET /api/availability — bed-pool query incl. soft holds | M | F-03 | todo |
| B-02 | Availability calendar component (green/gray/red, reflects holds) | M | B-01 | todo |
| B-03 | Booking request form (dates, attendees, preference, notes) | L | B-02, F-20 | todo |
| B-04 | POST /api/bookings — create request (soft hold) + attendees + event log | M | B-03, F-07 | todo |
| B-05 | Resend: booking request confirmation email | S | B-04 | todo |
| B-06 | "My bookings" page — list with status badges | M | B-04 | todo |
| B-07 | Booking detail page (attendees, assignment, event log) | M | B-06 | todo |
| B-08 | Cancel booking flow (deadline in house tz; releases hold/beds) | M | B-07 | todo |
| B-09 | Modify attendees on confirmed booking (re-sync counts) | M | B-07 | todo |
| B-10 | Waitlist: join when house is full | M | B-01, B-04 | todo |
| B-11 | POST /api/families — family creation by member (head as member row) | M | F-19 | todo |
| B-12 | Unit tests: availability + soft-hold logic, booking validation | M | B-01, B-04 | todo |
| B-13 | E2E test: full booking request flow | L | B-05 | todo |

**Phase 2 exit criteria**: Any approved family member can submit a booking request that soft-holds capacity, see their status, cancel before the deadline, and modify attendees.

---

### PHASE 3 — Admin Booking Assignment

| ID | Title | Size | Depends on | Status |
|----|-------|------|-----------|--------|
| A-01 | Admin dashboard: capacity cards + pending count + oldest-hold | M | B-04 | todo |
| A-02 | Pending bookings list (sorted by check-in, oldest hold flagged) | M | B-04 | todo |
| A-03 | GET /api/admin/rooms/available — beds by date range | M | F-03, B-01 | todo |
| A-04 | assign_booking_atomic RPC (FOR UPDATE + EXCLUDE-backed) | L | F-03 | todo |
| A-05 | Manual room/bed assignment UI + capacity impact preview | L | A-03, A-04 | todo |
| A-06 | POST /api/admin/bookings/:id/confirm → RPC + email | M | A-04, A-05 | todo |
| A-07 | POST /api/admin/bookings/:id/reject → reason + email + release hold | S | A-02 | todo |
| A-08 | POST /api/admin/bookings/:id/cancel → email + release beds | S | A-06 | todo |
| A-09 | Admin calendar view (monthly, color by family) | L | A-06 | todo |
| A-10 | Blackout date create / delete | M | F-17 | todo |
| A-11 | Fairness view: bookings + nights per family per year | M | A-06 | todo |
| A-12 | Admin: waitlist management + notify family | M | B-10 | todo |
| A-13 | Admin: settings page (advance days, cancellation deadline) | M | F-16 | todo |
| A-14 | Bed/room retirement reassignment flow | M | A-05, F-17 | todo |
| A-15 | Unit tests: capacity check, RPC + EXCLUDE edge cases | M | A-04 | todo |
| A-16 | E2E test: full admin assignment flow | L | A-06 | todo |

**Phase 3 exit criteria**: Admin can review all pending requests, manually assign rooms and beds (with double-booking impossible at the DB level), reject or cancel, view the calendar, manage blackout dates, and retire beds/rooms through a reassignment flow.

---

### PHASE 4 — Polish & Production

| ID | Title | Size | Depends on | Status |
|----|-------|------|-----------|--------|
| P-01 | Mobile responsiveness audit + fixes (all flows, 375px) | L | A-16 | todo |
| P-02 | Error boundaries + fallback UI for all pages | M | A-16 | todo |
| P-03 | Loading states + optimistic updates (TanStack Query) | M | A-16 | todo |
| P-04 | Accessibility audit (keyboard nav, ARIA, contrast) | M | P-01 | todo |
| P-05 | Nightly cron: mark completed bookings (Vercel Cron, house tz) | S | A-06 | todo |
| P-06 | Performance audit: Lighthouse, query optimization | M | P-01 | todo |
| P-07 | Error tracking: Sentry setup | S | P-02 | todo |
| P-08 | Full e2e regression suite | L | P-03 | todo |
| P-09 | Production deploy + custom domain | S | P-08 | todo |
| P-10 | One-page user guide for families (PDF or in-app) | S | P-09 | todo |

**Phase 4 exit criteria**: App passes Lighthouse score >85, all e2e tests green, deployed to production with custom domain, error tracking live.

---

### BACKLOG — v2 Features (Not in MVP)

| ID | Title | Size | Notes |
|----|-------|------|-------|
| V2-01 | In-app notifications (bell icon + unread count) | L | Requires notifications table |
| V2-02 | Booking frequency limits per family | M | house_settings already has nullable columns |
| V2-03 | Max nights per booking rule | S | house_settings already has the column |
| V2-04 | Pending-hold auto-expiry | S | house_settings.pending_hold_expiry_days + cron |
| V2-05 | Pricing + cost per booking | XL | Needs pricing model design first |
| V2-06 | Fairness scoring algorithm | M | Build on top of existing fairness view |
| V2-07 | Admin reporting dashboard | L | Occupancy rate, utilization charts |

### BACKLOG — v3 Features

| ID | Title | Size | Notes |
|----|-------|------|-------|
| V3-01 | WhatsApp notifications | L | Twilio or WhatsApp Business API |
| V3-02 | Multi-house support | M | house_id already on all tables — minimal schema work |
| V3-03 | Google Calendar sync | L | OAuth + Calendar API |
| V3-04 | Stripe payment integration | XL | Depends on V2-05 pricing |
| V3-05 | Invoice generation (PDF) | M | Depends on V3-04 |
| V3-06 | Cost-sharing rules between families | L | Depends on V2-05 |

---

## 8. Working Method: How We Build Each Feature

Every backlog item follows this exact sequence. No exceptions.

### Step 1 — Feature doc
Create or update `/docs/features/<item-id>-<slug>.md`:
```
# F-09: User Registration

## What it does
New users submit name, email, password, phone. Supabase Auth creates the account and
sends a verification email. user_profiles row created with is_approved: false — UNLESS
the email matches ADMIN_BOOTSTRAP_EMAIL, in which case role=admin, is_approved=true.

## Inputs
POST /api/auth/register
Body: { fullName, email, password, phone }

## Outputs
201: { message: "Verification email sent" }
400: { error: "Email already registered" }
422: { error: "Validation failed", fields: [...] }

## Edge cases
- Email already in auth.users → 400
- Email == ADMIN_BOOTSTRAP_EMAIL → auto-admin, auto-approved
- Supabase Auth down → 503 with retry guidance

## Not in scope
- Social login (v3)
- Phone verification (v3)
```

### Step 2 — Write tests first
```typescript
// tests/unit/auth/register.test.ts
describe('POST /api/auth/register', () => {
  it('creates a user profile with is_approved: false', async () => { ... })
  it('auto-promotes the bootstrap email to admin', async () => { ... })
  it('returns 400 if email already exists', async () => { ... })
  it('returns 422 if required fields missing', async () => { ... })
})

// tests/e2e/auth/register.spec.ts
test('user can register and see pending screen', async ({ page }) => {
  await page.goto('/register')
  await page.fill('[name=fullName]', 'Test User')
  // ...
  await expect(page.getByText('Waiting for approval')).toBeVisible()
})
```

### Step 3 — Implement until tests pass
```
git checkout -b feat/F-09-registration
# implement
# run: pnpm test && pnpm test:e2e
# all green → open PR
```

### Step 4 — Update docs if anything changed
If the implementation revealed a different edge case or changed an input shape, update the feature doc before merging.

---

## 9. Security

| Concern | Approach |
|---------|----------|
| Auth tokens | httpOnly cookies, 1hr expiry, auto-refresh |
| Admin-only routes | Middleware checks role before handler runs |
| First admin | Bootstrapped via `ADMIN_BOOTSTRAP_EMAIL` env var, not a hardcoded credential |
| RLS | Supabase enforces row access at DB level |
| `is_admin()` function | SECURITY DEFINER — cannot be spoofed by user JWTs |
| Input validation | Zod schemas, shared between frontend + API route |
| Race condition on booking | `assign_booking_atomic` RPC: FOR UPDATE lock **plus** `EXCLUDE USING gist` on assignment_beds — double-booking is physically impossible |
| Children's DOB | Excluded from `family_members_safe` view; admin only |
| One family per user | DB exclusion constraint on active memberships |
| Audit trail | `booking_events` is append-only (no DELETE policy) |
| XSS | No localStorage for tokens; httpOnly cookies only |

---

## 10. Open Questions — Resolved in v4

All v3-review conflicts are resolved:

| Question | Answer |
|----------|--------|
| Capacity authority | Beds only. Module/room capacity dropped; total_capacity is derived display. Admin assigns manually. |
| Pending requests holding capacity | Yes — soft hold at headcount level, held until acted on. Auto-expiry → v2. |
| First admin bootstrap | `ADMIN_BOOTSTRAP_EMAIL` env auto-promotes on signup. |
| Solo minor accounts | Admin provisions a login for the minor when needed. |
| Double-booking safety | FOR UPDATE lock + `EXCLUDE USING gist` constraint. |
| Bed/room deletion with live bookings | Guided reassignment flow, then soft-retire. |
| Timezone | `timezone` column on houses; drives cron + deadlines. |
| Email verification | Supabase Auth built-in; Resend for transactional only. |
| Family membership model | One active family per user; head is a member row. |
| Age thresholds | Descriptive only — not validated. |

| Earlier (v2/v3) questions | Answer |
|----------|--------|
| House configuration | Admin creates on first login (F-16) |
| Booking frequency limits | v2 feature (V2-02) |
| Minimum advance notice | Admin sets it in house_settings (default: 7 days) |
| Notifications channel | Email only in MVP; in-app in v2; WhatsApp in v3 |
| Admin promotion | Any admin can promote another user (F-15) |
| Cancellation deadline | Families can cancel up to 1 day before check-in (house tz) |

---

## 11. Timeline

| Phase | Items | Size estimate | Duration |
|-------|-------|---------------|----------|
| Phase 1: Foundation | F-01 → F-21 (+F-18a) | ~19 days of work | 3 weeks |
| Phase 2: Family UI | B-01 → B-13 | ~13 days of work | 2 weeks |
| Phase 3: Admin UI | A-01 → A-16 | ~15 days of work | 2-3 weeks |
| Phase 4: Polish | P-01 → P-10 | ~10 days of work | 2 weeks |
| **Total MVP** | 62 items | ~57 days | **~9-10 weeks** |

---

## 12. Glossary

| Term | Definition |
|------|-----------|
| House | The shared property. Configured by admin on first login. Has a timezone. |
| Module | A section/wing of the house. |
| Room | A bedroom within a module. Has bathroom_type: suite or shared. |
| Suite | Room with a private en-suite bathroom. |
| Shared bathroom | Bathroom used by multiple rooms within a module. |
| Bed | Individual sleeping unit. **The only enforced capacity unit.** Availability computed per date range. |
| Soft hold | Capacity reserved by a pending request (headcount) until the admin acts. |
| Family | A group of users who book together. Head + spouse + children + solo minors. One active family per user. |
| Solo minor | Child under 15 a booking can be made for. Admin may provision a login for them. Responsible adult always on site. |
| Booking request | What the family submits. Status: pending → confirmed/rejected/cancelled. Soft-holds capacity while pending. |
| Booking assignment | The rooms/beds the admin manually allocates to a confirmed request. |
| Reassignment flow | Moving affected bookings to other beds before a bed/room can be retired. |
| Booking event | Append-only audit record of every status change with actor and diff. |
| House settings | Admin-configurable rules: advance notice days, cancellation deadline. |
| Blackout date | Admin-set period of unavailability at house/module/room level. |
| Waitlist | Queue of families wanting fully-booked dates. Admin manually offers slots. |
| Bootstrap admin | The first admin, created via ADMIN_BOOTSTRAP_EMAIL on signup. |
| RLS | Row-Level Security — Postgres enforces who can read/write each row. |
| RPC | Postgres function called via Supabase client. Used for atomic capacity check. |
| EXCLUDE constraint | Postgres constraint making overlapping bed assignments physically impossible. |
| TDD | Test-Driven Development: docs → tests → implementation for every feature. |

---

**Document Version**: 4.0
**Last Updated**: June 16, 2026
**Status**: All v3-review conflicts resolved — backlog defined — ready for Phase 1
