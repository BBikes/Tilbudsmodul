import type { OfferTemplateSnapshot } from '@/types';
import { buildPublicOfferUrl } from './offer-link';

export const DEFAULT_SMS_TEMPLATE = [
  'Hej {customerName},',
  '',
  'Vi har lavet et tilbud til dig på dit køretøj (sag {workOrderId}).',
  '',
  'Se og godkend tilbuddet her:',
  '{offerLink}',
  '',
  'Tilbuddet udløber {expiry}.',
  '',
  'Mvh B-Bikes',
].join('\n');

const OFFER_LINK_PLACEHOLDER = '{offerLink}';

export function validateSmsTemplate(smsTemplate?: string): string | null {
  const trimmed = smsTemplate?.trim() ?? '';

  if (!trimmed || trimmed.includes(OFFER_LINK_PLACEHOLDER)) {
    return null;
  }

  return `SMS-skabelonen skal indeholde ${OFFER_LINK_PLACEHOLDER}`;
}

export function buildOfferSmsText(opts: {
  customerName: string;
  workOrderId: string;
  expiresAt: Date;
  appUrl: string;
  publicSlug: string;
  smsTemplate?: string;
}): string {
  const expiry = opts.expiresAt.toLocaleString('da-DK', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });

  const offerLink = buildPublicOfferUrl(opts.publicSlug, opts.appUrl);
  const template = opts.smsTemplate?.trim() || DEFAULT_SMS_TEMPLATE;

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

export function buildOfferDetailsCommentText(opts: {
  workOrderId: string;
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
      return `${icon} ${template.title}${template.price > 0 ? ` - ${template.price} kr.` : ''}`;
    }),
    '',
    `Total: ${totalAmount} kr.`,
    `Udløber: ${opts.expiresAt.toLocaleString('da-DK')}`,
  ].join('\n');
}
