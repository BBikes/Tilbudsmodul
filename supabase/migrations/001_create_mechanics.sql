-- Migration 001: Mechanics table
-- Apply to Supabase project: xhqqiyokwbxpjfiqdnqb

create table if not exists mechanics (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code_hash text not null,
  bikedesk_user_id integer,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table mechanics enable row level security;

create policy "Authenticated full access on mechanics"
  on mechanics
  for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "Service role full access on mechanics"
  on mechanics
  for all
  using (auth.jwt() ->> 'role' = 'service_role');
