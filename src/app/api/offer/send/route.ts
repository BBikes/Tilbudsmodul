import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { validateMechanicSession } from '@/lib/session';
import { sendSms, createTicketComment, getTicket, updateTicketTags, findPlannerUser, getSmsLogBatch, findProductByCode } from '@/lib/bikedesk';
import { getBikedeskApiUserId } from '@/lib/bikedesk-config';
import { buildOfferSlug, resolvePublicAppUrl } from '@/lib/offer-link';
import { buildOfferSmsText } from '@/lib/offer-sms';
import type { OfferExtraWorkItemInput, OfferExtraWorkItemSnapshot, OfferSettings, OfferTemplateSnapshot } from '@/types';
import { DEFAULT_OFFER_SETTINGS } from '@/types';

const BB15_PRODUCT_CODE = 'BB15';

interface SendOfferBody {
  workOrderId: string;
  mechanicId: string;
  mechanicName: string;
  mechanicBikedeskUserId: number | null;
  ticketId: number;
  customerId: number;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  templates: OfferTemplateSnapshot[];
  extraWorkItem?: OfferExtraWorkItemInput | null;
}

function parseExtraWorkItem(input: OfferExtraWorkItemInput | null | undefined): OfferExtraWorkItemInput | null {
  if (!input) {
    return null;
  }

  const title = input.title?.trim() ?? '';
  const quantity = Number.parseInt(String(input.bb15Quantity ?? ''), 10);

  const hasAnyValue = title.length > 0 || Number.isFinite(quantity);
  if (!hasAnyValue) {
    return null;
  }

  if (!title || !Number.isInteger(quantity) || quantity <= 0) {
    throw new Error('Ekstralinjen kræver både titel og et positivt antal 15-minutters blokke');
  }

  return {
    title,
    bb15Quantity: quantity,
  };
}

export async function POST(req: Request) {
  const mechanic = await validateMechanicSession();
  if (!mechanic) {
    return NextResponse.json({ success: false, error: 'Ikke logget ind' }, { status: 401 });
  }

  let body: SendOfferBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Ugyldig forespørgsel' }, { status: 400 });
  }

  if (!body.templates || body.templates.length === 0) {
    return NextResponse.json({ success: false, error: 'Ingen ydelser valgt' }, { status: 400 });
  }

  let extraWorkItem: OfferExtraWorkItemInput | null = null;
  try {
    extraWorkItem = parseExtraWorkItem(body.extraWorkItem);
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Ugyldig ekstralinje' },
      { status: 400 }
    );
  }

  const supabase = await createServiceClient();

  // Load settings
  const { data: settingsRow } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', 'offer_settings')
    .single();

  const settings: OfferSettings = settingsRow?.value
    ? { ...DEFAULT_OFFER_SETTINGS, ...(settingsRow.value as Partial<OfferSettings>) }
    : DEFAULT_OFFER_SETTINGS;

  let extraWorkSnapshot: OfferExtraWorkItemSnapshot | null = null;
  if (extraWorkItem) {
    const product = await findProductByCode(BB15_PRODUCT_CODE);
    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Kunne ikke slå BB15 op i BikeDesk' },
        { status: 500 }
      );
    }

    if (!Number.isFinite(product.price)) {
      return NextResponse.json(
        { success: false, error: 'BB15 har ingen gyldig pris i BikeDesk' },
        { status: 500 }
      );
    }

    extraWorkSnapshot = {
      title: extraWorkItem.title,
      bb15_quantity: extraWorkItem.bb15Quantity,
      product_code: BB15_PRODUCT_CODE,
      bikedesk_product_id: product.id,
      unit_price: product.price,
      total_price: product.price * extraWorkItem.bb15Quantity,
    };
  }

  const totalAmount =
    body.templates.reduce((sum, t) => sum + (t.price ?? 0), 0) +
    (extraWorkSnapshot?.total_price ?? 0);
  const sentAt = new Date();
  const expiresAt = new Date(sentAt.getTime() + settings.expiry_hours * 60 * 60 * 1000);
  const appUrl = resolvePublicAppUrl();
  const publicSlug = buildOfferSlug(body.workOrderId, sentAt);
  // Fetch ticket and resolve the best available comment author
  // Strategy (same as Booking project): Planlægningen > mechanic BD user > ticket assignee > API user
  let ticket;
  try {
    ticket = await getTicket(body.ticketId);
  } catch (err) {
    console.warn('[offer/send] getTicket failed early', err);
  }

  let commentUserId: number | null = null;
  try {
    const planner = await findPlannerUser();
    commentUserId = planner?.id ?? null;
  } catch (err) {
    console.warn('[offer/send] Could not find Planlægningen user', err);
  }
  if (!commentUserId) commentUserId = body.mechanicBikedeskUserId ?? null;
  if (!commentUserId) commentUserId = (ticket as Record<string, unknown> | undefined)?.assignee as number | null ?? null;
  if (!commentUserId) {
    try { commentUserId = getBikedeskApiUserId(); } catch { /* no-op */ }
  }
  console.log('[offer/send] commentUserId resolved to:', commentUserId);

  // Create offer row (token auto-generated by DB)
  const { data: offer, error: offerError } = await supabase
    .from('offers')
    .insert({
      sent_at: sentAt.toISOString(),
      work_order_id: body.workOrderId,
      public_slug: publicSlug,
      mechanic_id: body.mechanicId,
      mechanic_name: body.mechanicName,
      bikedesk_customer_id: body.customerId,
      customer_name: body.customerName,
      customer_phone: body.customerPhone,
      customer_email: body.customerEmail,
      status: 'sent',
      expires_at: expiresAt.toISOString(),
      templates_snapshot: body.templates,
      extra_work_item_snapshot: extraWorkSnapshot,
      images_snapshot: [],
      total_amount: totalAmount,
    })
    .select('id, token, public_slug')
    .single();

  if (offerError || !offer) {
    console.error('[offer/send] DB insert failed', offerError);
    return NextResponse.json({ success: false, error: 'Kunne ikke gemme tilbud' }, { status: 500 });
  }

  // Build and send SMS via BikeDesk
  const smsText = buildOfferSmsText({
    customerName: body.customerName,
    workOrderId: body.workOrderId,
    expiresAt,
    appUrl,
    identifier: offer.public_slug ?? offer.token,
    smsTemplate: settings.sms_template,
  });

  let smsBatchId: number | undefined;
  try {
    const smsResult = await sendSms({
      message: smsText,
      phone: body.customerPhone,
      customerid: body.customerId,
    });
    smsBatchId = smsResult.batchid;
  } catch (err) {
    console.error('[offer/send] SMS failed', err);
    // Don't fail the offer creation — log the error but continue
  }

  // Log SMS as BikeDesk comment — only smslogid needed, no extra comment text
  if (smsBatchId && commentUserId) {
    try {
      // Wait briefly for BikeDesk to process the batch
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Resolve the individual SMS log entry id from the batch
      let smsLogId: number | undefined;
      try {
        const batch = await getSmsLogBatch(smsBatchId);
        smsLogId = batch.entries[0]?.id;
      } catch (err) {
        console.warn('[offer/send] Could not resolve smsLogId from batch', err);
      }

      await createTicketComment({
        ticketId: body.ticketId,
        smsLogId: smsLogId ?? smsBatchId,
        userId: commentUserId,
        comment: '',
        autocomment: 'sms_other',
      });
    } catch (err) {
      console.error('[offer/send] Comment failed', err);
    }
  } else {
    console.warn('[offer/send] Skipping comment: smsBatchId=', smsBatchId, 'commentUserId=', commentUserId);
  }

  // Update ticket tags (tags_on_sent)
  if (settings.tags_on_sent.length > 0 && ticket) {
    try {
      await updateTicketTags(body.ticketId, ticket, settings.tags_on_sent, []);
    } catch (err) {
      console.error('[offer/send] Tag update failed', err);
    }
  }

  // Update offer with batch id
  if (smsBatchId) {
    await supabase
      .from('offers')
      .update({ bikedesk_sms_batch_id: smsBatchId })
      .eq('id', offer.id);
  }

  return NextResponse.json({ success: true, offerId: offer.id });
}
