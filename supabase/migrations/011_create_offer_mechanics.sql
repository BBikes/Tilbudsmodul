-- Migration 011: Create offer_mechanics table for Tilbudsmodul
-- Background: The shared Supabase project's 'mechanics' table was replaced by the
-- mechanic dashboard app with a different schema (SKU-based id, no code_hash PIN field).
-- Tilbudsmodul needs its own mechanics table with PIN-based login (code_hash via bcrypt).

-- Step 1: Create offer_mechanics with the original schema
create table if not exists offer_mechanics (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code_hash text not null,
  bikedesk_user_id integer,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Step 2: Enable RLS
alter table offer_mechanics enable row level security;

-- Step 3: Service role full access (used by API routes)
create policy "Service role full access on offer_mechanics"
  on offer_mechanics
  for all
  using (auth.jwt() ->> 'role' = 'service_role');

-- Step 4: Authenticated users can read (for admin panel reads)
create policy "Authenticated read on offer_mechanics"
  on offer_mechanics
  for select
  using (auth.role() = 'authenticated');

-- Step 5: Migrate all data from mechanics_old into offer_mechanics
-- Preserves IDs, names, code_hashes, active flags, and timestamps
insert into offer_mechanics (id, name, code_hash, bikedesk_user_id, active, created_at, updated_at)
select id, name, code_hash, bikedesk_user_id, active, created_at, updated_at
from mechanics_old
on conflict (id) do nothing;

-- Step 6: Update mechanic_sessions to add FK to offer_mechanics
alter table mechanic_sessions
  add constraint mechanic_sessions_offer_mechanic_id_fkey
  foreign key (mechanic_id) references offer_mechanics(id) on delete cascade;
