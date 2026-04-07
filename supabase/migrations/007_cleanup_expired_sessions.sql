-- Migration 007: Clean up expired mechanic sessions daily

select cron.schedule(
  'cleanup-mechanic-sessions-daily',
  '30 2 * * *',
  $$
    delete from mechanic_sessions where expires_at < now() - interval '1 day';
  $$
);
