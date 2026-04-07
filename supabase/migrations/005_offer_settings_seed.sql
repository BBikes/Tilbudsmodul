-- Migration 005: Seed offer_settings into system_settings table
-- system_settings table already exists in the shared Supabase project (from Booking module)

insert into system_settings (key, value) values (
  'offer_settings',
  '{
    "expiry_hours": 72,
    "expired_phone": "",
    "expired_email": "",
    "template_group_id": null,
    "tags_on_sent": [],
    "tags_on_accepted": [],
    "tags_on_rejected": [],
    "tags_remove_on_accepted": [],
    "tags_remove_on_rejected": []
  }'::jsonb
) on conflict (key) do nothing;
