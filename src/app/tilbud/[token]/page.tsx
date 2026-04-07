import { createServiceClient } from '@/lib/supabase/server';
import type { Offer, OfferSettings } from '@/types';
import { DEFAULT_OFFER_SETTINGS } from '@/types';
import CustomerOfferClient from './CustomerOfferClient';

interface Props {
  params: Promise<{ token: string }>;
}

export default async function TilbudPage({ params }: Props) {
  const { token } = await params;

  const supabase = await createServiceClient();

  const { data: offer } = await supabase
    .from('offers')
    .select('*')
    .eq('token', token)
    .single();

  if (!offer) {
    return <NotFound />;
  }

  // Load contact settings for expired page
  const { data: settingsRow } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', 'offer_settings')
    .single();

  const settings: OfferSettings = settingsRow?.value
    ? { ...DEFAULT_OFFER_SETTINGS, ...(settingsRow.value as Partial<OfferSettings>) }
    : DEFAULT_OFFER_SETTINGS;

  // Mark as opened if it was just sent
  if (offer.status === 'sent' && !offer.opened_at) {
    await supabase
      .from('offers')
      .update({ status: 'opened', opened_at: new Date().toISOString() })
      .eq('id', offer.id);
    offer.status = 'opened';
    offer.opened_at = new Date().toISOString();
  }

  return (
    <CustomerOfferClient
      offer={offer as Offer}
      contactPhone={settings.expired_phone}
      contactEmail={settings.expired_email}
    />
  );
}

function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center max-w-xs">
        <p className="text-4xl mb-4">🔍</p>
        <h1 className="text-lg font-bold text-gray-900 mb-2">Tilbud ikke fundet</h1>
        <p className="text-sm text-gray-500">Dette link er ugyldigt eller udløbet.</p>
      </div>
    </div>
  );
}
