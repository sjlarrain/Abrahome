-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  Abrahome — F-02 Database Schema (plan v4 §4.2)                            ║
-- ║  Beds are the only enforced capacity unit. Double-booking is made          ║
-- ║  physically impossible by an EXCLUDE constraint on assignment_beds.         ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

create extension if not exists btree_gist;

-- ── Generic updated_at trigger ──────────────────────────────────────────────
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ── user_profiles ───────────────────────────────────────────────────────────
create table user_profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text unique not null,
  full_name   text not null,
  phone       text,
  role        text not null default 'family_member'
                check (role in ('admin', 'family_head', 'family_member', 'solo_user')),
  is_approved boolean not null default false,
  approved_by uuid references user_profiles(id),
  approved_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger trg_user_profiles_updated before update on user_profiles
  for each row execute function set_updated_at();

-- ── houses ──────────────────────────────────────────────────────────────────
-- total_capacity is a derived/display value (sum of beds), not an enforced cap.
create table houses (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  total_capacity int,
  timezone       text not null default 'UTC',   -- IANA tz; drives cron + deadlines
  description    text,
  location       text,
  created_by     uuid not null references user_profiles(id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create trigger trg_houses_updated before update on houses
  for each row execute function set_updated_at();

-- ── house_settings (one row per house) ──────────────────────────────────────
create table house_settings (
  id                         uuid primary key default gen_random_uuid(),
  house_id                   uuid not null unique references houses(id) on delete cascade,
  min_advance_days           int not null default 7,
  cancellation_deadline_days int not null default 1,  -- cancel up to N days before check-in
  max_bookings_per_year      int,                      -- v2 (nullable until activated)
  max_nights_per_booking     int,                      -- v2
  pending_hold_expiry_days   int,                      -- v2 (null = holds never auto-expire)
  updated_by                 uuid references user_profiles(id),
  updated_at                 timestamptz not null default now()
);
create trigger trg_house_settings_updated before update on house_settings
  for each row execute function set_updated_at();

-- ── modules ─────────────────────────────────────────────────────────────────
create table modules (
  id          uuid primary key default gen_random_uuid(),
  house_id    uuid not null references houses(id) on delete cascade,
  name        text not null,
  description text,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);
create index idx_modules_house on modules(house_id);

-- ── rooms ───────────────────────────────────────────────────────────────────
create table rooms (
  id            uuid primary key default gen_random_uuid(),
  module_id     uuid not null references modules(id) on delete cascade,
  house_id      uuid not null references houses(id),
  name          text not null,
  room_type     text not null check (room_type in ('shared', 'private')),
  bathroom_type text not null check (bathroom_type in ('suite', 'shared')),
  is_active     boolean not null default true,   -- soft-retire instead of hard delete
  sort_order    int not null default 0,
  created_at    timestamptz not null default now()
);
create index idx_rooms_module on rooms(module_id);
create index idx_rooms_house on rooms(house_id);

-- ── beds (the only enforced capacity unit) ──────────────────────────────────
create table beds (
  id         uuid primary key default gen_random_uuid(),
  room_id    uuid not null references rooms(id) on delete cascade,
  house_id   uuid not null references houses(id),
  name       text not null,
  bed_type   text not null check (bed_type in ('single', 'double', 'bunk_top', 'bunk_bottom')),
  is_active  boolean not null default true,      -- soft-retire instead of hard delete
  created_at timestamptz not null default now()
);
create index idx_beds_room on beds(room_id);
create index idx_beds_house on beds(house_id);

-- ── families ────────────────────────────────────────────────────────────────
create table families (
  id             uuid primary key default gen_random_uuid(),
  house_id       uuid not null references houses(id),
  name           text not null,
  family_head_id uuid not null references user_profiles(id),
  notes          text,
  created_by     uuid not null references user_profiles(id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index idx_families_house on families(house_id);
create trigger trg_families_updated before update on families
  for each row execute function set_updated_at();

-- ── family_members ──────────────────────────────────────────────────────────
-- One active family per user; the head MUST also exist here (relationship='head').
-- Age labels are descriptive only — thresholds are not validated.
create table family_members (
  id            uuid primary key default gen_random_uuid(),
  family_id     uuid not null references families(id) on delete cascade,
  house_id      uuid not null references houses(id),
  user_id       uuid references user_profiles(id),  -- null until a login is provisioned
  full_name     text not null,
  relationship  text not null check (relationship in ('head', 'spouse', 'child', 'solo_minor')),
  date_of_birth date,                                -- sensitive: admin-only via safe view
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  unique (family_id, user_id),
  -- A user may hold at most one ACTIVE membership across all families.
  constraint one_active_family_per_user
    exclude using gist (user_id with =) where (is_active and user_id is not null)
);
create index idx_family_members_family on family_members(family_id);
create index idx_family_members_user on family_members(user_id) where user_id is not null;

-- ── booking_requests (soft-holds capacity while pending) ────────────────────
create table booking_requests (
  id                uuid primary key default gen_random_uuid(),
  house_id          uuid not null references houses(id),
  family_id         uuid not null references families(id),
  check_in_date     date not null,
  check_out_date    date not null,
  attendee_count    int not null check (attendee_count > 0),
  module_preference uuid references modules(id),
  notes             text,
  status            text not null default 'pending'
                      check (status in ('pending', 'confirmed', 'rejected', 'cancelled')),
  rejection_reason  text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint valid_dates check (check_out_date > check_in_date)
);
create index idx_booking_requests_family on booking_requests(family_id);
-- Hot path: availability + pending-hold queries filter by house, status, date range.
create index idx_booking_requests_hold
  on booking_requests(house_id, status, check_in_date, check_out_date);
create trigger trg_booking_requests_updated before update on booking_requests
  for each row execute function set_updated_at();

-- ── booking_attendees ───────────────────────────────────────────────────────
create table booking_attendees (
  id                 uuid primary key default gen_random_uuid(),
  booking_request_id uuid not null references booking_requests(id) on delete cascade,
  family_member_id   uuid not null references family_members(id),
  created_at         timestamptz not null default now(),
  unique (booking_request_id, family_member_id)
);
create index idx_booking_attendees_request on booking_attendees(booking_request_id);

-- ── booking_assignments ─────────────────────────────────────────────────────
-- Dates/family/count denormalized from booking_requests; kept in sync on modify.
create table booking_assignments (
  id                 uuid primary key default gen_random_uuid(),
  booking_request_id uuid not null unique references booking_requests(id),
  house_id           uuid not null references houses(id),
  family_id          uuid not null references families(id),
  check_in_date      date not null,
  check_out_date     date not null,
  attendee_count     int not null,
  status             text not null default 'confirmed'
                       check (status in ('confirmed', 'completed', 'cancelled')),
  notes              text,
  assigned_by        uuid not null references user_profiles(id),
  assigned_at        timestamptz not null default now(),
  created_at         timestamptz not null default now()
);
create index idx_booking_assignments_house on booking_assignments(house_id);

-- ── assignment_beds (EXCLUDE backstop against double-booking) ───────────────
-- check_in/out denormalized so the exclusion constraint can range-overlap.
-- is_active=false on cancellation so cancelled rows free the bed.
create table assignment_beds (
  id                    uuid primary key default gen_random_uuid(),
  booking_assignment_id uuid not null references booking_assignments(id) on delete cascade,
  bed_id                uuid not null references beds(id),
  family_member_id      uuid references family_members(id),
  check_in_date         date not null,
  check_out_date        date not null,
  is_active             boolean not null default true,
  created_at            timestamptz not null default now(),
  unique (booking_assignment_id, bed_id),
  constraint no_overlapping_bed exclude using gist (
    bed_id with =,
    daterange(check_in_date, check_out_date, '[)') with &&
  ) where (is_active)
);
create index idx_assignment_beds_assignment on assignment_beds(booking_assignment_id);
create index idx_assignment_beds_bed on assignment_beds(bed_id);

-- ── blackout_dates ──────────────────────────────────────────────────────────
create table blackout_dates (
  id         uuid primary key default gen_random_uuid(),
  house_id   uuid not null references houses(id),
  module_id  uuid references modules(id),  -- null = whole house
  room_id    uuid references rooms(id),    -- null = whole module or house
  start_date date not null,
  end_date   date not null,
  reason     text not null,
  created_by uuid not null references user_profiles(id),
  created_at timestamptz not null default now(),
  constraint valid_blackout check (end_date >= start_date)
);
create index idx_blackout_house on blackout_dates(house_id);

-- ── booking_events (append-only audit log) ──────────────────────────────────
create table booking_events (
  id                 uuid primary key default gen_random_uuid(),
  booking_request_id uuid not null references booking_requests(id),
  house_id           uuid not null references houses(id),
  actor_id           uuid not null references user_profiles(id),
  event_type         text not null check (event_type in (
                       'created', 'confirmed', 'rejected', 'cancelled', 'completed',
                       'attendees_modified', 'notes_updated', 'rooms_reassigned'
                     )),
  old_value          jsonb,
  new_value          jsonb,
  created_at         timestamptz not null default now()
);
create index idx_booking_events_request on booking_events(booking_request_id);

-- ── waitlist_requests ───────────────────────────────────────────────────────
create table waitlist_requests (
  id             uuid primary key default gen_random_uuid(),
  house_id       uuid not null references houses(id),
  family_id      uuid not null references families(id),
  check_in_date  date not null,
  check_out_date date not null,
  attendee_count int not null check (attendee_count > 0),
  notes          text,
  status         text not null default 'waiting'
                   check (status in ('waiting', 'offered', 'converted', 'expired')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index idx_waitlist_house on waitlist_requests(house_id);
create trigger trg_waitlist_updated before update on waitlist_requests
  for each row execute function set_updated_at();
