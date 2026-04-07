import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getTicket, updateTicketTags, attachTemplateToTicket } from '@/lib/bikedesk';
import type { OfferSettings, OfferTemplateSnapshot } from '@/types';
import { DEFAULT_OFFER_SETTINGS } from '@/types';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let body: { action: string; acceptedIds: number[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Ugyldig forespørgsel' }, { status: 400 });
  }

  const supabase = await createServiceClient();

  // Fetch offer
  const { data: offer } = await supabase
    .from('offers')
    .select('*')
    .eq('id', id)
    .single();

  if (!offer) {
    return NextResponse.json({ success: false, error: 'Tilbud ikke fundet' }, { status: 404 });
  }

  // Check not already locked
  if (['accepted', 'accepted_partial', 'rejected'].includes(offer.status)) {
    return NextResponse.json({ success: false, error: 'Tilbud er allerede besvaret' }, { status: 409 });
  }

  // Check not expired
  if (new Date(offer.expires_at) < new Date()) {
    await supabase.from('offers').update({ status: 'expired' }).eq('id', id);
    return NextResponse.json({ success: false, error: 'Tilbuddet er udløbet' }, { status: 410 });
  }

  const { action, acceptedIds } = body;
  const allTemplates: OfferTemplateSnapshot[] = offer.templates_snapshot;
  const rejectedIds = allTemplates
    .map((t) => t.id)
    .filter((id) => !acceptedIds.includes(id));

  // Determine new status
  let newStatus: string;
  if (action === 'reject') {
    newStatus = 'rejected';
  } else if (acceptedIds.length === allTemplates.length) {
    newStatus = 'accepted';
  } else {
    newStatus = 'accepted_partial';
  }

  // Update offer
  await supabase.from('offers').update({
    status: newStatus,
    responded_at: new Date().toISOString(),
    response_payload: { accepted_ids: acceptedIds, rejected_ids: rejectedIds },
    updated_at: new Date().toISOString(),
  }).eq('id', id);

  // Load settings for tag operations
  const { data: settingsRow } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', 'offer_settings')
    .single();

  const settings: OfferSettings = settingsRow?.value
    ? { ...DEFAULT_OFFER_SETTINGS, ...(settingsRow.value as Partial<OfferSettings>) }
    : DEFAULT_OFFER_SETTINGS;

  // Apply BikeDesk changes
  try {
    const ticket = await getTicket(parseInt(offer.work_order_id, 10));

    if (action !== 'reject' && acceptedIds.length > 0) {
      // Attach accepted templates to ticket
      for (const templateId of acceptedIds) {
        try {
          await attachTemplateToTicket(parseInt(offer.work_order_id, 10), templateId);
        } catch (err) {
          console.error(`[respond] attach template ${templateId} failed`, err);
        }
      }

      // Update tags: accepted
      if (settings.tags_on_accepted.length > 0 || settings.tags_remove_on_accepted.length > 0) {
        await updateTicketTags(
          parseInt(offer.work_order_id, 10),
          ticket,
          settings.tags_on_accepted,
          settings.tags_remove_on_accepted
        );
      }
    } else if (action === 'reject') {
      // Update tags: rejected
      if (settings.tags_on_rejected.length > 0 || settings.tags_remove_on_rejected.length > 0) {
        await updateTicketTags(
          parseInt(offer.work_order_id, 10),
          ticket,
          settings.tags_on_rejected,
          settings.tags_remove_on_rejected
        );
      }
    }
  } catch (err) {
    console.error('[respond] BikeDesk update failed', err);
    // Don't fail — offer is already locked in our DB
  }

  return NextResponse.json({ success: true, status: newStatus });
}
