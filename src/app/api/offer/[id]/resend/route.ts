import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { sendSms } from '@/lib/bikedesk';
import { buildOfferSmsText } from '@/lib/offer-sms';
import type { Offer, OfferSettings } from '@/types';
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

  const expiresAt = new Date(Date.now() + settings.expiry_hours * 60 * 60 * 1000);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3003';

  // Create new offer row (new token)
  const { data: newOffer } = await supabase
    .from('offers')
    .insert({
      work_order_id: original.work_order_id,
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
    .select('id, token')
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
        token: newOffer.token,
      });

      const smsResult = await sendSms({
        message: smsText,
        phone: original.customer_phone,
        customerid: original.bikedesk_customer_id ?? undefined,
      });

      if (smsResult.batchid) {
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
