import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { createTicketComment, sendSms, findTicketByWorkOrderNumber } from '@/lib/bikedesk';
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

  try {
    commentUserId = getBikedeskApiUserId();
  } catch (err) {
    console.error('[resend] Invalid API user id', err);
  }

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
        if (commentUserId) {
          try {
            const ticket = await findTicketByWorkOrderNumber(original.work_order_id);
            if (ticket) {
              // 1. Raw SMS Comment
              await createTicketComment({
                ticketId: ticket.id,
                smsLogId: smsResult.batchid,
                userId: commentUserId,
                comment: `SMS sendt til kunde:\n${smsText}`,
                autocomment: 'sms_other',
              });

              // 2. Offer Details Comment
              const detailsBody = buildOfferDetailsCommentText({
                workOrderId: original.work_order_id,
                expiresAt,
                templates: original.templates_snapshot,
                totalAmount: original.total_amount,
                isResend: true,
              });

              await createTicketComment({
                ticketId: ticket.id,
                userId: commentUserId,
                comment: detailsBody,
                autocomment: 'other',
              });
            }
          } catch (commentErr) {
            console.error('[resend] Failed to create comment', commentErr);
          }
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
