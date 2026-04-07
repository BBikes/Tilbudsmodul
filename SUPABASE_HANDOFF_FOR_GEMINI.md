# SUPABASE CHANGES FOR GEMINI
## Tilbudsmodul — Database Setup

**Supabase project:** `xhqqiyokwbxpjfiqdnqb`
**Same project as the existing Booking module.**

---

## STEP 1 — Apply migrations in order

Run each file from `supabase/migrations/` in the Supabase SQL editor:

### 001_create_mechanics.sql
Creates the `mechanics` table with RLS.

### 002_create_mechanic_sessions.sql
Creates the `mechanic_sessions` table with token_hash index.

### 003_create_offer_templates.sql
Creates the `offer_templates` table (BikeDesk template cache).

### 004_create_offers.sql
Creates the `offers` table with all status/snapshot fields.

### 005_offer_settings_seed.sql
Inserts default `offer_settings` row into the existing `system_settings` table.
> **Note:** The `system_settings` table already exists (from Booking module). This just adds a new row.

### 006_cron_jobs.sql
- Sets up `expire-offers-hourly` cron (pure SQL, no URL needed).
- Template sync cron is commented out — uncomment after deployment with the correct URL and secret.
- Requires `pg_cron` extension. Enable in Supabase Dashboard → Database → Extensions.

### 007_cleanup_expired_sessions.sql
Daily cleanup of expired mechanic sessions.

---

## STEP 2 — Enable extensions (if not already enabled)

In Supabase Dashboard → Database → Extensions, enable:
- `pg_cron` — for scheduled jobs
- `pg_net` — for HTTP calls from cron (needed for template sync cron)

---

## STEP 3 — After deployment: activate template sync cron

Once Tilbudsmodul is deployed to Vercel (or wherever), run this in SQL editor:

```sql
select cron.schedule(
  'sync-offer-templates-daily',
  '0 3 * * *',
  $$
    select net.http_post(
      url := 'https://YOUR_TILBUDSMODUL_URL/api/cron/templates/sync',
      headers := '{"Authorization": "Bearer YOUR_CRON_SECRET", "Content-Type": "application/json"}'::jsonb,
      body := '{}'::jsonb
    );
  $$
);
```

Replace:
- `YOUR_TILBUDSMODUL_URL` with the deployed URL (e.g. `tilbudsmodul.vercel.app`)
- `YOUR_CRON_SECRET` with the value of `CRON_SECRET` in `.env.local`

---

## STEP 4 — RLS policies summary

| Table | anon | authenticated | service_role |
|-------|------|--------------|--------------|
| `mechanics` | ✗ | read+write | full |
| `mechanic_sessions` | ✗ | ✗ | full |
| `offer_templates` | read | read+write | full |
| `offers` | read | read | insert+update |
| `system_settings` (existing) | read | read+write | full |

> **Note:** `offers` public read is intentional — the customer page reads offers by token without authentication. Token secrecy is the access control. If stricter security is needed, RLS can be tightened to require the token to be passed as a query parameter and validated via an RPC function.

---

## STEP 5 — Environment variables needed in Vercel/hosting

```
NEXT_PUBLIC_SUPABASE_URL=https://xhqqiyokwbxpjfiqdnqb.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<same as Booking>
SUPABASE_SERVICE_ROLE_KEY=<same as Booking>
BIKEDESK_API_URL=https://app.bikedesk.dk/api/v1
BIKEDESK_API_KEY=<same as Booking>
`BIKEDESK_API_USER_ID=<BikeDesk user id for API comments>`
NEXT_PUBLIC_APP_URL=https://YOUR_TILBUDSMODUL_URL
ADMIN_EMAILS=service@b-bikes.dk
CRON_SECRET=<generate a strong random secret>
```

---

## NO STORAGE BUCKETS NEEDED

Images are not stored in Supabase in v1. The image selector is a placeholder.

## NO NEW RPC FUNCTIONS NEEDED

All operations use standard Supabase client queries.

---

## Quick verification checklist for Gemini

After applying migrations:

- [ ] `select * from mechanics limit 1;` — table exists
- [ ] `select * from mechanic_sessions limit 1;` — table exists  
- [ ] `select * from offer_templates limit 1;` — table exists
- [ ] `select * from offers limit 1;` — table exists
- [ ] `select value from system_settings where key = 'offer_settings';` — returns JSON with default settings
- [ ] `select * from cron.job;` — shows `expire-offers-hourly` and `cleanup-mechanic-sessions-daily`
