import { createServiceClient } from '@/lib/supabase/server';
import type { OfferSettings } from '@/types';
import { DEFAULT_OFFER_SETTINGS } from '@/types';
import SettingsClient from '@/app/(admin)/settings/SettingsClient';
import { getTicketTemplateGroups } from '@/lib/bikedesk';
import { getTags } from '@/lib/bikedesk-tags';

function formatTicketTypeLabel(value: string) {
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

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
  let templateTypes: { value: string; label: string }[] = [];
  try {
    tags = await getTags();
  } catch {
    // Non-critical; settings can still be saved without tag labels.
  }

  try {
    const groups = await getTicketTemplateGroups();
    const uniqueTypes = new Map<string, string>();

    for (const group of groups) {
      if (!group.tickettype) continue;
      if (group.visible === false) continue;
      if (!uniqueTypes.has(group.tickettype)) {
        uniqueTypes.set(group.tickettype, formatTicketTypeLabel(group.tickettype));
      }
    }

    templateTypes = Array.from(uniqueTypes.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label, 'da'));
  } catch {
    // Non-critical; settings can still be saved without a dynamic template type list.
  }

  return (
    <SettingsClient
      settings={settings}
      availableTags={tags}
      availableTemplateTypes={templateTypes}
    />
  );
}