-- Migration 004: Offers table

create table if not exists offers (
  id uuid primary key default gen_random_uuid(),
  token text not null unique default replace(gen_random_uuid()::text, '-', ''),
  work_order_id text not null,
  mechanic_id uuid references mechanics(id),
  mechanic_name text not null,
  bikedesk_customer_id integer,
  customer_name text,
  customer_phone text,
  customer_email text,
  status text not null default 'sent'
    check (status in ('sent','opened','accepted','accepted_partial','rejected','expired')),
  sent_at timestamptz not null default now(),
  expires_at timestamptz not null,
  opened_at timestamptz,
  responded_at timestamptz,
  templates_snapshot jsonb not null default '[]'::jsonb,
  images_snapshot jsonb default '[]'::jsonb,
  total_amount numeric(10,2),
  response_payload jsonb,
  bikedesk_sms_batch_id integer,
  bikedesk_comment_reference text,
  resend_of uuid references offers(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists offers_token_idx on offers (token);
create index if not exists offers_work_order_id_idx on offers (work_order_id);
create index if not exists offers_status_idx on offers (status);
create index if not exists offers_expires_at_idx on offers (expires_at);

alter table offers enable row level security;

-- Public read — customer pages read by token, app validates at API level
create policy "Public read on offers"
  on offers
  for select
  using (true);

create policy "Service role insert on offers"
  on offers
  for insert
  with check (auth.jwt() ->> 'role' = 'service_role');

create policy "Service role update on offers"
  on offers
  for update
  using (auth.jwt() ->> 'role' = 'service_role');

create policy "Authenticated read on offers"
  on offers
  for select
  using (auth.role() = 'authenticated');
