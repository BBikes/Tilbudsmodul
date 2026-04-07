import { redirect } from 'next/navigation';
import { validateMechanicSession } from '@/lib/session';
import { findTicketByWorkOrderNumber, getCustomer } from '@/lib/bikedesk';
import { createServiceClient } from '@/lib/supabase/server';
import type { OfferSettings, OfferTemplate } from '@/types';
import { DEFAULT_OFFER_SETTINGS } from '@/types';
import SendPageClient from './SendPageClient';

interface Props {
  searchParams: Promise<{ workorder?: string }>;
}

export default async function SendPage({ searchParams }: Props) {
  const mechanic = await validateMechanicSession();
  if (!mechanic) redirect('/login');

  const { workorder } = await searchParams;
  if (!workorder) redirect('/');

  // Fetch work order + customer from BikeDesk
  const ticket = await findTicketByWorkOrderNumber(workorder).catch(() => null);
  if (!ticket) redirect('/?error=not_found');

  const customer = await getCustomer(ticket.customerid as number).catch(() => null);
  if (!customer) redirect('/?error=customer_not_found');

  // Load settings + templates from Supabase
  const supabase = await createServiceClient();

  const { data: settingsRow } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', 'offer_settings')
    .single();

  const settings: OfferSettings = settingsRow?.value
    ? { ...DEFAULT_OFFER_SETTINGS, ...(settingsRow.value as Partial<OfferSettings>) }
    : DEFAULT_OFFER_SETTINGS;

  let templatesQuery = supabase
    .from('offer_templates')
    .select('*')
    .eq('active', true)
    .order('title', { ascending: true });

  if (settings.template_group_id) {
    templatesQuery = templatesQuery.eq('group_id', settings.template_group_id);
  }

  const { data: templates } = await templatesQuery;

  return (
    <SendPageClient
      workOrderId={workorder}
      ticket={ticket as never}
      customer={customer}
      mechanic={{ id: mechanic.id, name: mechanic.name, bikedesk_user_id: mechanic.bikedesk_user_id }}
      templates={(templates ?? []) as OfferTemplate[]}
      expiryHours={settings.expiry_hours}
    />
  );
}
