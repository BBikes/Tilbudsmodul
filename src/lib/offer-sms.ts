export function buildOfferSmsText(opts: {
  customerName: string;
  workOrderId: string;
  expiresAt: Date;
  appUrl: string;
  token: string;
}): string {
  const expiry = opts.expiresAt.toLocaleDateString('da-DK', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });

  const link = `${opts.appUrl.replace(/\/$/, '')}/tilbud/${opts.token}`;

  return [
    `Hej ${opts.customerName},`,
    ``,
    `Vi har lavet et tilbud til dig på din cykel (sag ${opts.workOrderId}).`,
    ``,
    `Se og godkend tilbuddet her:`,
    link,
    ``,
    `Tilbuddet udløber ${expiry}.`,
    ``,
    `Mvh B-Bikes`,
  ].join('\n');
}
