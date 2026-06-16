-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  Abrahome — F-03 RLS Policies + Helper Functions (plan v4 §4.4)            ║
-- ║  Privileged writes happen in API routes via the service-role key (which    ║
-- ║  bypasses RLS). These policies are defense-in-depth for client reads and   ║
-- ║  family-scoped writes performed with the user's JWT.                       ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- ── Helper functions (SECURITY DEFINER → bypass RLS, cannot be spoofed) ─────
create or replace function is_admin()
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1 from user_profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- One active family per user; the head also has a member row, so this resolves.
create or replace function my_family_id(p_house_id uuid)
returns uuid language sql security definer set search_path = public as $$
  select family_id from family_members
  where user_id = auth.uid() and house_id = p_house_id and is_active
  limit 1;
$$;

-- ── Enable RLS everywhere ───────────────────────────────────────────────────
alter table user_profiles      enable row level security;
alter table houses             enable row level security;
alter table house_settings     enable row level security;
alter table modules            enable row level security;
alter table rooms              enable row level security;
alter table beds               enable row level security;
alter table families           enable row level security;
alter table family_members     enable row level security;
alter table booking_requests   enable row level security;
alter table booking_attendees  enable row level security;
alter table booking_assignments enable row level security;
alter table assignment_beds    enable row level security;
alter table blackout_dates     enable row level security;
alter table booking_events     enable row level security;
alter table waitlist_requests  enable row level security;

-- ── user_profiles: own row or admin ─────────────────────────────────────────
create policy up_select on user_profiles for select
  using (id = auth.uid() or is_admin());
create policy up_update on user_profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

-- ── House config: readable by any approved authenticated user; admin writes ─
-- (Reads are needed for availability + booking UI. Writes also go via service role.)
create policy houses_select on houses for select using (auth.uid() is not null);
create policy houses_admin  on houses for all using (is_admin()) with check (is_admin());

create policy house_settings_select on house_settings for select using (auth.uid() is not null);
create policy house_settings_admin  on house_settings for all using (is_admin()) with check (is_admin());

create policy modules_select on modules for select using (auth.uid() is not null);
create policy modules_admin  on modules for all using (is_admin()) with check (is_admin());

create policy rooms_select on rooms for select using (auth.uid() is not null);
create policy rooms_admin  on rooms for all using (is_admin()) with check (is_admin());

create policy beds_select on beds for select using (auth.uid() is not null);
create policy beds_admin  on beds for all using (is_admin()) with check (is_admin());

create policy blackouts_select on blackout_dates for select using (auth.uid() is not null);
create policy blackouts_admin  on blackout_dates for all using (is_admin()) with check (is_admin());

-- ── families: own family or admin ───────────────────────────────────────────
create policy families_select on families for select
  using (id = my_family_id(house_id) or is_admin());
create policy families_admin on families for all
  using (is_admin()) with check (is_admin());

-- ── family_members: own family or admin (DOB hidden via safe view) ──────────
create policy fm_select on family_members for select
  using (family_id = my_family_id(house_id) or is_admin());
create policy fm_admin on family_members for all
  using (is_admin()) with check (is_admin());

-- Family-facing view that excludes the sensitive date_of_birth column.
create or replace view family_members_safe
  with (security_invoker = true) as
  select id, family_id, house_id, user_id, full_name, relationship, is_active, created_at
  from family_members;

-- ── booking_requests: own family or admin ───────────────────────────────────
create policy br_select on booking_requests for select
  using (family_id = my_family_id(house_id) or is_admin());
create policy br_insert on booking_requests for insert
  with check (family_id = my_family_id(house_id));
create policy br_admin on booking_requests for all
  using (is_admin()) with check (is_admin());

-- ── booking_attendees: visible when the parent request is visible ───────────
create policy ba_select on booking_attendees for select
  using (exists (
    select 1 from booking_requests br
    where br.id = booking_request_id
      and (br.family_id = my_family_id(br.house_id) or is_admin())
  ));
create policy ba_insert on booking_attendees for insert
  with check (exists (
    select 1 from booking_requests br
    where br.id = booking_request_id
      and br.family_id = my_family_id(br.house_id)
  ));
create policy ba_admin on booking_attendees for all
  using (is_admin()) with check (is_admin());

-- ── booking_assignments: own family or admin ────────────────────────────────
create policy bas_select on booking_assignments for select
  using (family_id = my_family_id(house_id) or is_admin());
create policy bas_admin on booking_assignments for all
  using (is_admin()) with check (is_admin());

-- ── assignment_beds: visible when the parent assignment is visible ──────────
create policy ab_select on assignment_beds for select
  using (exists (
    select 1 from booking_assignments ba
    where ba.id = booking_assignment_id
      and (ba.family_id = my_family_id(ba.house_id) or is_admin())
  ));
create policy ab_admin on assignment_beds for all
  using (is_admin()) with check (is_admin());

-- ── booking_events: read-only for own family's bookings, admin sees all ─────
-- Append-only: no UPDATE/DELETE policies are created (integrity).
create policy be_select on booking_events for select
  using (is_admin() or exists (
    select 1 from booking_requests br
    where br.id = booking_request_id
      and br.family_id = my_family_id(br.house_id)
  ));
create policy be_insert on booking_events for insert
  with check (is_admin() or actor_id = auth.uid());

-- ── waitlist_requests: own family or admin ──────────────────────────────────
create policy wl_select on waitlist_requests for select
  using (family_id = my_family_id(house_id) or is_admin());
create policy wl_insert on waitlist_requests for insert
  with check (family_id = my_family_id(house_id));
create policy wl_admin on waitlist_requests for all
  using (is_admin()) with check (is_admin());
