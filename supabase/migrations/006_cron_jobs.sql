-- Migration 006: Cron jobs
-- Requires pg_cron and pg_net extensions to be enabled in Supabase dashboard
-- Replace {TILBUDSMODUL_URL} and {CRON_SECRET} with actual values after deployment

-- 1. Daily template sync at 03:00 UTC
-- select cron.schedule(
--   'sync-offer-templates-daily',
--   '0 3 * * *',
--   $$
--     select net.http_post(
--       url := 'https://{TILBUDSMODUL_URL}/api/cron/templates/sync',
--       headers := '{"Authorization": "Bearer {CRON_SECRET}", "Content-Type": "application/json"}'::jsonb,
--       body := '{}'::jsonb
--     );
--   $$
-- );

-- 2. Hourly offer expiry check
select cron.schedule(
  'expire-offers-hourly',
  '5 * * * *',
  $$
    update offers
    set status = 'expired', updated_at = now()
    where status in ('sent', 'opened')
      and expires_at < now();
  $$
);

-- NOTE: Uncomment job #1 and replace placeholders after deployment.
-- Job #2 runs directly in the DB and needs no URL.
