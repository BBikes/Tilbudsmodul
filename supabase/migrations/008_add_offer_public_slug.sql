alter table offers
  add column if not exists public_slug text;

update offers
set public_slug = lower(
  regexp_replace(trim(work_order_id), '[^a-zA-Z0-9]+', '-', 'g') ||
  '-' ||
  to_char(sent_at at time zone 'Europe/Copenhagen', 'DD-MM-YYYY-HH24-MI')
)
where public_slug is null;

create index if not exists offers_public_slug_idx on offers (public_slug);