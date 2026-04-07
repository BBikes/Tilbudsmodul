export function buildOfferSmsText(opts: {
  customerName: string;
  workOrderId: string;
  expiresAt: Date;
  appUrl: string;
  token: string;
  smsTemplate?: string;
}): string {
  const expiry = opts.expiresAt.toLocaleString('da-DK', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });

  const offerLink = `${opts.appUrl.replace(/\/$/, '')}/tilbud/${opts.token}`;

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
