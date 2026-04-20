import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import {
  attachTemplateToTicket,
  createTicketComment,
  createCustomTicketMaterial,
  findPlannerUser,
  findTicketByWorkOrderNumber,
  updateTicketTags,
} from '@/lib/bikedesk';
import type { OfferExtraWorkItemSnapshot, OfferSettings, OfferTemplateSnapshot } from '@/types';
import { DEFAULT_OFFER_SETTINGS } from '@/types';

function formatAcceptedLine(title: string, price: number) {
  return `${title}${price > 0 ? ` - ${price} kr.` : ''}`;
}

function buildResponseCommentText(opts: {
  action: string;
  customerName: string | null;
  acceptedTemplates: OfferTemplateSnapshot[];
  rejectedTemplates: OfferTemplateSnapshot[];
  acceptedExtraWorkItem: OfferExtraWorkItemSnapshot | null;
  rejectedExtraWorkItem: OfferExtraWorkItemSnapshot | null;
  totalAccepted: number;
}): string {
  if (opts.action === 'reject') {
    return `Kunde afviste tilbud${opts.customerName ? ` (${opts.customerName})` : ''}`;
  }

  const acceptedLineCount = opts.acceptedTemplates.length + (opts.acceptedExtraWorkItem ? 1 : 0);
  const rejectedLineCount = opts.rejectedTemplates.length + (opts.rejectedExtraWorkItem ? 1 : 0);
  const heading =
    acceptedLineCount > 0 && rejectedLineCount === 0
      ? `Kunde accepterede alle ydelser${opts.customerName ? ` (${opts.customerName})` : ''}`
      : `Kunde accepterede valgte ydelser${opts.customerName ? ` (${opts.customerName})` : ''}`;

  const lines = [
    heading,
    '',
    ...opts.acceptedTemplates.map((template) => `✓ ${formatAcceptedLine(template.title, template.price)}`),
  ];

  if (opts.acceptedExtraWorkItem) {
    lines.push(`✓ ${formatAcceptedLine(opts.acceptedExtraWorkItem.title, opts.acceptedExtraWorkItem.total_price)}`);
  }

  if (rejectedLineCount > 0) {
    lines.push('');
    lines.push('Ikke accepteret:');
    lines.push(...opts.rejectedTemplates.map((template) => `✕ ${template.title}`));

    if (opts.rejectedExtraWorkItem) {
      lines.push(`✕ ${opts.rejectedExtraWorkItem.title}`);
    }
  }

  lines.push('');
  lines.push(`Total accepteret: ${opts.totalAccepted} kr.`);

  return lines.join('\n');
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  let body: { action: string; acceptedIds: number[]; extraWorkItemAccepted?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Ugyldig forespørgsel' }, { status: 400 });
  }

  const supabase = await createServiceClient();

  const { data: offer } = await supabase
    .from('offers')
    .select('*')
    .eq('id', id)
    .single();

  if (!offer) {
    return NextResponse.json({ success: false, error: 'Tilbud ikke fundet' }, { status: 404 });
  }

  if (['accepted', 'accepted_partial', 'rejected'].includes(offer.status)) {
    return NextResponse.json({ success: false, error: 'Tilbud er allerede besvaret' }, { status: 409 });
  }

  if (new Date(offer.expires_at) < new Date()) {
    await supabase.from('offers').update({ status: 'expired' }).eq('id', id);
    return NextResponse.json({ success: false, error: 'Tilbuddet er udløbet' }, { status: 410 });
  }

  if (!['accept_selected', 'accept_all', 'reject'].includes(body.action)) {
    return NextResponse.json({ success: false, error: 'Ugyldig handling' }, { status: 400 });
  }

  const allTemplates = (offer.templates_snapshot ?? []) as OfferTemplateSnapshot[];
  const allTemplateIds = new Set(allTemplates.map((template) => template.id));
  const acceptedIds =
    body.action === 'reject'
      ? []
      : Array.from(new Set(Array.isArray(body.acceptedIds) ? body.acceptedIds : []))
          .filter((templateId): templateId is number => Number.isInteger(templateId) && allTemplateIds.has(templateId));
  const rejectedIds = allTemplates
    .map((template) => template.id)
    .filter((templateId) => !acceptedIds.includes(templateId));
  const extraWorkItem = (offer.extra_work_item_snapshot ?? null) as OfferExtraWorkItemSnapshot | null;
  const extraWorkItemAccepted =
    body.action !== 'reject' && !!extraWorkItem && body.extraWorkItemAccepted === true;
  const acceptedCount = acceptedIds.length + (extraWorkItemAccepted ? 1 : 0);
  const totalSelectableCount = allTemplates.length + (extraWorkItem ? 1 : 0);

  if (body.action !== 'reject' && acceptedCount === 0) {
    return NextResponse.json({ success: false, error: 'Vælg mindst én linje' }, { status: 400 });
  }

  let newStatus: string;
  if (body.action === 'reject') {
    newStatus = 'rejected';
  } else if (acceptedCount === totalSelectableCount) {
    newStatus = 'accepted';
  } else {
    newStatus = 'accepted_partial';
  }

  await supabase.from('offers').update({
    status: newStatus,
    responded_at: new Date().toISOString(),
    response_payload: {
      accepted_ids: acceptedIds,
      rejected_ids: rejectedIds,
      extra_work_item_accepted: extraWorkItemAccepted,
    },
    updated_at: new Date().toISOString(),
  }).eq('id', id);

  const { data: settingsRow } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', 'offer_settings')
    .single();

  const settings: OfferSettings = settingsRow?.value
    ? { ...DEFAULT_OFFER_SETTINGS, ...(settingsRow.value as Partial<OfferSettings>) }
    : DEFAULT_OFFER_SETTINGS;

  try {
    const ticket = await findTicketByWorkOrderNumber(offer.work_order_id);
    if (!ticket) {
      throw new Error(`Ticket for work_order_id ${offer.work_order_id} not found`);
    }

    if (body.action !== 'reject' && acceptedCount > 0) {
      for (const templateId of acceptedIds) {
        try {
          await attachTemplateToTicket(ticket.id, templateId);
        } catch (err) {
          console.error(`[respond] attach template ${templateId} failed`, err);
        }
      }

      if (extraWorkItemAccepted && extraWorkItem) {
        try {
          await createCustomTicketMaterial({
            ticketId: ticket.id,
            title: extraWorkItem.title,
            amount: extraWorkItem.bb15_quantity,
            price: extraWorkItem.unit_price,
          });
        } catch (err) {
          console.error('[respond] create custom BB15 material failed', err);
        }
      }

      if (settings.tags_on_accepted.length > 0 || settings.tags_remove_on_accepted.length > 0) {
        await updateTicketTags(
          ticket.id,
          ticket,
          settings.tags_on_accepted,
          settings.tags_remove_on_accepted,
        );
      }
    } else if (body.action === 'reject') {
      if (settings.tags_on_rejected.length > 0 || settings.tags_remove_on_rejected.length > 0) {
        await updateTicketTags(
          ticket.id,
          ticket,
          settings.tags_on_rejected,
          settings.tags_remove_on_rejected,
        );
      }
    }

    try {
      let commentUserId: number | null = null;
      try {
        const planner = await findPlannerUser();
        commentUserId = planner?.id ?? null;
      } catch {
        // Ignore lookup errors and fall back to assignee.
      }
      if (!commentUserId) commentUserId = ticket.assignee ?? null;

      if (commentUserId) {
        const acceptedTemplates = allTemplates.filter((template) => acceptedIds.includes(template.id));
        const rejectedTemplates = allTemplates.filter((template) => !acceptedIds.includes(template.id));
        const acceptedExtraWorkItem = extraWorkItemAccepted ? extraWorkItem : null;
        const rejectedExtraWorkItem = extraWorkItem && !extraWorkItemAccepted ? extraWorkItem : null;
        const totalAccepted =
          acceptedTemplates.reduce((sum, template) => sum + (template.price ?? 0), 0) +
          (acceptedExtraWorkItem?.total_price ?? 0);

        const commentText = buildResponseCommentText({
          action: body.action,
          customerName: offer.customer_name,
          acceptedTemplates,
          rejectedTemplates,
          acceptedExtraWorkItem,
          rejectedExtraWorkItem,
          totalAccepted,
        });

        await createTicketComment({
          ticketId: ticket.id,
          userId: commentUserId,
          comment: commentText,
          autocomment: 'other',
        });
      }
    } catch (commentErr) {
      console.error('[respond] Failed to create response comment', commentErr);
    }
  } catch (err) {
    console.error('[respond] BikeDesk update failed', err);
  }

  return NextResponse.json({ success: true, status: newStatus });
}
