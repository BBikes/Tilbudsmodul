import { createServiceClient } from '@/lib/supabase/server';
import type { OfferSettings } from '@/types';
import { DEFAULT_OFFER_SETTINGS } from '@/types';
import SettingsClient from './SettingsClient';
import { getTags } from '@/lib/bikedesk-tags';

export default async function SettingsPage() {
  const supabase = await createServiceClient();

  const { data: settingsRow } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', 'offer_settings')
    .single();

  const settings: OfferSettings = settingsRow?.value
    ? { ...DEFAULT_OFFER_SETTINGS, ...(settingsRow.value as Partial<OfferSettings>) }
    : DEFAULT_OFFER_SETTINGS;

  let tags: { id: number; label: string }[] = [];
  try {
    tags = await getTags();
  } catch {
    // Non-critical — settings can still be saved without tag labels
  }

  return <SettingsClient settings={settings} availableTags={tags} />;
}
