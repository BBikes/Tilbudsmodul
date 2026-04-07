-- Migration 002: Mechanic sessions table

create table if not exists mechanic_sessions (
  id uuid primary key default gen_random_uuid(),
  mechanic_id uuid not null references mechanics(id) on delete cascade,
  token_hash text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists mechanic_sessions_token_hash_idx on mechanic_sessions (token_hash);
create index if not exists mechanic_sessions_expires_at_idx on mechanic_sessions (expires_at);

alter table mechanic_sessions enable row level security;

create policy "Service role only on mechanic_sessions"
  on mechanic_sessions
  for all
  using (auth.jwt() ->> 'role' = 'service_role');
