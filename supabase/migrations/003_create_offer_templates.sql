-- Migration 003: Offer templates (synced from BikeDesk)

create table if not exists offer_templates (
  id serial primary key,
  bikedesk_template_id integer not null unique,
  title text not null,
  price numeric(10,2) not null default 0,
  group_id integer,
  group_name text,
  active boolean not null default true,
  position integer not null default 0,
  synced_at timestamptz
);

alter table offer_templates enable row level security;

create policy "Public read on offer_templates"
  on offer_templates
  for select
  using (true);

create policy "Authenticated write on offer_templates"
  on offer_templates
  for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "Service role write on offer_templates"
  on offer_templates
  for all
  using (auth.jwt() ->> 'role' = 'service_role');
