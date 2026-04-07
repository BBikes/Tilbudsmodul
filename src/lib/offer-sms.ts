import type { OfferTemplateSnapshot } from '@/types';
import { buildOfferPath } from './offer-link';

export function buildOfferSmsText(opts: {
  customerName: string;
  workOrderId: string;
  expiresAt: Date;
  appUrl: string;
  identifier: string;
  smsTemplate?: string;
}): string {
  const expiry = opts.expiresAt.toLocaleString('da-DK', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });

  const offerLink = `${opts.appUrl.replace(/\/$/, '')}${buildOfferPath(opts.identifier)}`;

  const template = opts.smsTemplate?.trim() || [
    'Hej {customerName},',
    '',
    'Vi har lavet et tilbud til dig på din cykel (sag {workOrderId}).',
    '',
    'Se og godkend tilbuddet her:',
    '{offerLink}',
    '',
    'Tilbuddet udløber {expiry}.',
    '',
    'Mvh B-Bikes',
  ].join('\n');

  const replacements: Record<string, string> = {
    customerName: opts.customerName,
    customer_name: opts.customerName,
    workOrderId: opts.workOrderId,
    work_order_id: opts.workOrderId,
    offerLink,
    link: offerLink,
    expiry,
    expiresAt: expiry,
  };

  return template.replace(/\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}/g, (match, key: string) => {
    return replacements[key] ?? match;
  });
}

export function buildOfferSmsCommentText(opts: {
  workOrderId: string;
  smsText: string;
  expiresAt: Date;
  templates: OfferTemplateSnapshot[];
  totalAmount?: number | null;
  isResend?: boolean;
}) {
  const totalAmount = opts.totalAmount ?? opts.templates.reduce((sum, template) => sum + (template.price ?? 0), 0);
  const heading = opts.isResend ? 'Tilbud sendt igen via API-bruger' : 'Tilbud sendt via API-bruger';

  return [
    `${heading} (Sag #${opts.workOrderId})`,
    '',
    ...opts.templates.map((template) => {
      const icon = template.marker === 'red' || template.marker === 'yellow' ? '▲' : '●';
      return `${icon} ${template.title}${template.price > 0 ? ` — ${template.price} kr.` : ''}`;
    }),
    '',
    `Total: ${totalAmount} kr.`,
    `Udløber: ${opts.expiresAt.toLocaleString('da-DK')}`,
    '',
    'SMS sendt til kunde:',
    opts.smsText,
  ].join('\n');
}
