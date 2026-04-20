import { redirect } from 'next/navigation';
import { validateMechanicSession } from '@/lib/session';
import { findProductByCode, findTicketByWorkOrderNumber, getCustomer, getTicketTemplateGroups } from '@/lib/bikedesk';
import { createServiceClient } from '@/lib/supabase/server';
import type { OfferSettings, OfferTemplate } from '@/types';
import { DEFAULT_OFFER_SETTINGS } from '@/types';
import SendPageClient from './SendPageClient';

const BB15_PRODUCT_CODE = 'BB15';

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
    .order('group_name', { ascending: true })
    .order('position', { ascending: true })
    .order('title', { ascending: true });

  if (settings.template_ticket_type) {
    try {
      const groups = await getTicketTemplateGroups();
      const groupIds = groups
        .filter((group) => group.tickettype === settings.template_ticket_type)
        .map((group) => group.id);

      templatesQuery = templatesQuery.in('group_id', groupIds.length > 0 ? groupIds : [-1]);
    } catch {
      templatesQuery = templatesQuery.in('group_id', [-1]);
    }
  } else if (settings.template_group_id) {
    templatesQuery = templatesQuery.eq('group_id', settings.template_group_id);
  }

  const { data: templates } = await templatesQuery;
  const bb15Product = await findProductByCode(BB15_PRODUCT_CODE).catch(() => null);

  return (
    <SendPageClient
      workOrderId={workorder}
      ticket={ticket as never}
      customer={customer}
      mechanic={{ id: mechanic.id, name: mechanic.name, bikedesk_user_id: mechanic.bikedesk_user_id }}
      templates={(templates ?? []) as OfferTemplate[]}
      bb15UnitPrice={bb15Product?.price ?? null}
      expiryHours={settings.expiry_hours}
    />
  );
}
