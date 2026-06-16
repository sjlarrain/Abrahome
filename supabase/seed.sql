-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  Abrahome — F-04 Seed (local development data)                             ║
-- ║  Runs after migrations on `supabase db reset`. Creates one house with a    ║
-- ║  full module → room → bed graph, plus a dev admin and a sample family.     ║
-- ║                                                                            ║
-- ║  NOTE: the dev admin row here exists only to satisfy created_by/FK and to  ║
-- ║  let you browse data. A *real*, login-capable admin is created by signing  ║
-- ║  up with ADMIN_BOOTSTRAP_EMAIL (plan §3.3 / F-09). Idempotent: safe to     ║
-- ║  re-run. UUID prefixes are mnemonic: a0=admin b0=house c0=module           ║
-- ║  d0=room e0=bed f0=family.                                                 ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- ── Dev admin (local only) ──────────────────────────────────────────────────
insert into auth.users (id)
  values ('a0000000-0000-4000-8000-000000000001')
  on conflict (id) do nothing;

insert into user_profiles (id, email, full_name, role, is_approved)
  values ('a0000000-0000-4000-8000-000000000001', 'dev-admin@abrahome.local', 'Dev Admin', 'admin', true)
  on conflict (id) do nothing;

-- ── House ───────────────────────────────────────────────────────────────────
insert into houses (id, name, timezone, description, location, created_by)
  values ('b0000000-0000-4000-8000-000000000001', 'Casa Abrahome',
          'America/Mexico_City', 'Shared family house', 'Valle de Bravo',
          'a0000000-0000-4000-8000-000000000001')
  on conflict (id) do nothing;

insert into house_settings (house_id, min_advance_days, cancellation_deadline_days)
  values ('b0000000-0000-4000-8000-000000000001', 7, 1)
  on conflict (house_id) do nothing;

-- ── Modules → Rooms → Beds ──────────────────────────────────────────────────
insert into modules (id, house_id, name, description, sort_order) values
  ('c0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'Main Wing',   'Ground-floor rooms', 0),
  ('c0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000001', 'Garden Wing', 'Rooms by the garden', 1)
  on conflict (id) do nothing;

insert into rooms (id, module_id, house_id, name, room_type, bathroom_type, sort_order) values
  ('d0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'Master Suite', 'private', 'suite',  0),
  ('d0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'Twin Room',    'shared',  'shared', 1),
  ('d0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000001', 'Bunk Room',    'shared',  'shared', 0)
  on conflict (id) do nothing;

insert into beds (id, room_id, house_id, name, bed_type) values
  ('e0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'King',       'double'),
  ('e0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000001', 'Twin A',     'single'),
  ('e0000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000001', 'Twin B',     'single'),
  ('e0000000-0000-4000-8000-000000000004', 'd0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000001', 'Bunk 1 Top', 'bunk_top'),
  ('e0000000-0000-4000-8000-000000000005', 'd0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000001', 'Bunk 1 Bot', 'bunk_bottom'),
  ('e0000000-0000-4000-8000-000000000006', 'd0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000001', 'Bunk 2 Top', 'bunk_top'),
  ('e0000000-0000-4000-8000-000000000007', 'd0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000001', 'Bunk 2 Bot', 'bunk_bottom')
  on conflict (id) do nothing;

-- ── Sample family (head is also a member row, per plan v4 §2.3) ──────────────
insert into families (id, house_id, name, family_head_id, created_by) values
  ('f0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'Familia Demo',
   'a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001')
  on conflict (id) do nothing;

insert into family_members (family_id, house_id, user_id, full_name, relationship) values
  ('f0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001',
   'a0000000-0000-4000-8000-000000000001', 'Dev Admin', 'head')
  on conflict (family_id, user_id) do nothing;

-- ── Refresh derived display capacity = active bed count ─────────────────────
update houses h
  set total_capacity = (select count(*) from beds b where b.house_id = h.id and b.is_active)
  where h.id = 'b0000000-0000-4000-8000-000000000001';
