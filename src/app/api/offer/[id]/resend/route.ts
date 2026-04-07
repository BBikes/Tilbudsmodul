import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { createTicketComment, sendSms, findTicketByWorkOrderNumber, findPlannerUser, getSmsLogBatch } from '@/lib/bikedesk';
import { getBikedeskApiUserId } from '@/lib/bikedesk-config';
import { buildOfferSlug, resolvePublicAppUrl } from '@/lib/offer-link';
import { buildOfferDetailsCommentText, buildOfferSmsText } from '@/lib/offer-sms';
import type { OfferSettings } from '@/types';
import { DEFAULT_OFFER_SETTINGS } from '@/types';

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const allowed = (process.env.ADMIN_EMAILS ?? '').split(',').map((e) => e.trim()).filter(Boolean);
  if (allowed.length > 0 && !allowed.includes(user.email ?? '')) return null;
  return user;
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ success: false, error: 'Ikke autoriseret' }, { status: 401 });
  }

  const { id } = await params;
  const supabase = await createServiceClient();

  const { data: original } = await supabase.from('offers').select('*').eq('id', id).single();
  if (!original) {
    return NextResponse.json({ success: false, error: 'Tilbud ikke fundet' }, { status: 404 });
  }

  const { data: settingsRow } = await supabase
    .from('system_settings').select('value').eq('key', 'offer_settings').single();
  const settings: OfferSettings = settingsRow?.value
    ? { ...DEFAULT_OFFER_SETTINGS, ...(settingsRow.value as Partial<OfferSettings>) }
    : DEFAULT_OFFER_SETTINGS;

  const sentAt = new Date();
  const expiresAt = new Date(sentAt.getTime() + settings.expiry_hours * 60 * 60 * 1000);
  const appUrl = resolvePublicAppUrl();
  const publicSlug = buildOfferSlug(original.work_order_id, sentAt);
  let commentUserId: number | null = null;
  let ticket: import('@/types').BikedeskTicket | null = null;

  try {
    ticket = await findTicketByWorkOrderNumber(original.work_order_id);
  } catch (err) {
    console.warn('[resend] getTicket failed early', err);
  }

  // Strategy: Planlægningen > ticket assignee > API user
  try {
    const planner = await findPlannerUser();
    commentUserId = planner?.id ?? null;
  } catch (err) {
    console.warn('[resend] Could not find Planlægningen user', err);
  }
  if (!commentUserId) commentUserId = ticket?.assignee ?? null;
  if (!commentUserId) {
    try { commentUserId = getBikedeskApiUserId(); } catch { /* no-op */ }
  }
  console.log('[resend] commentUserId resolved to:', commentUserId);

  // Create new offer row (new token)
  const { data: newOffer } = await supabase
    .from('offers')
    .insert({
      sent_at: sentAt.toISOString(),
      work_order_id: original.work_order_id,
      public_slug: publicSlug,
      mechanic_id: original.mechanic_id,
      mechanic_name: original.mechanic_name,
      bikedesk_customer_id: original.bikedesk_customer_id,
      customer_name: original.customer_name,
      customer_phone: original.customer_phone,
      customer_email: original.customer_email,
      status: 'sent',
      expires_at: expiresAt.toISOString(),
      templates_snapshot: original.templates_snapshot,
      images_snapshot: original.images_snapshot,
      total_amount: original.total_amount,
      resend_of: original.id,
    })
    .select('id, token, public_slug')
    .single();

  if (!newOffer) {
    return NextResponse.json({ success: false, error: 'Kunne ikke oprette nyt tilbud' }, { status: 500 });
  }

  // Send new SMS
  if (original.customer_phone) {
    try {
      const smsText = buildOfferSmsText({
        customerName: original.customer_name ?? '',
        workOrderId: original.work_order_id,
        expiresAt,
        appUrl,
        identifier: newOffer.public_slug ?? newOffer.token,
        smsTemplate: settings.sms_template,
      });

      const smsResult = await sendSms({
        message: smsText,
        phone: original.customer_phone,
        customerid: original.bikedesk_customer_id ?? undefined,
      });

      if (smsResult.batchid) {
        if (commentUserId && ticket) {
          try {
            // Wait briefly for BikeDesk to process the batch
            await new Promise((resolve) => setTimeout(resolve, 1000));

            let smsLogId: number | undefined;
            try {
              const batch = await getSmsLogBatch(smsResult.batchid);
              smsLogId = batch.entries[0]?.id;
            } catch (err) {
              console.warn('[resend] Could not resolve smsLogId from batch', err);
            }

            // Only link the SMS log entry — BikeDesk renders the SMS natively
            await createTicketComment({
              ticketId: ticket.id,
              smsLogId: smsLogId ?? smsResult.batchid,
              userId: commentUserId,
              comment: '',
              autocomment: 'sms_other',
            });
          } catch (commentErr) {
            console.error('[resend] Failed to create comment', commentErr);
          }
        } else {
          console.warn('[resend] Skipping comment: ticket=', ticket?.id, 'commentUserId=', commentUserId);
        }

        await supabase
          .from('offers')
          .update({ bikedesk_sms_batch_id: smsResult.batchid })
          .eq('id', newOffer.id);
      }
    } catch (err) {
      console.error('[resend] SMS failed', err);
    }
  }

  return NextResponse.json({ success: true, newOfferId: newOffer.id });
}
