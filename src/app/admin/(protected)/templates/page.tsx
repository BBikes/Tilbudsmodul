import { createServiceClient } from '@/lib/supabase/server';
import type { OfferTemplate } from '@/types';
import TemplatesClient from '@/app/(admin)/templates/TemplatesClient';

export default async function TemplatesPage() {
  const supabase = await createServiceClient();

  const { data: templates } = await supabase
    .from('offer_templates')
    .select('*')
    .order('title');

  const lastSync = (templates ?? []).reduce<string | null>((latest, t) => {
    if (!t.synced_at) return latest;
    if (!latest) return t.synced_at;
    return t.synced_at > latest ? t.synced_at : latest;
  }, null);

  return (
    <TemplatesClient
      templates={(templates ?? []) as OfferTemplate[]}
      lastSync={lastSync}
    />
  );
}