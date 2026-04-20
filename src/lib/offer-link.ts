import type { Offer } from '@/types';

const DEFAULT_PUBLIC_APP_URL = 'https://tilbud.b-bikes.dk';

function normalizePublicAppUrl(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const normalized = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;

  try {
    const url = new URL(normalized);
    const hostname = url.hostname.toLowerCase();

    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0') {
      return null;
    }

    return url.origin.replace(/\/$/, '');
  } catch {
    return null;
  }
}

function pad(value: number) {
  return String(value).padStart(2, '0');
}

function getCopenhagenParts(date: Date) {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Copenhagen',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    day: lookup.day ?? pad(date.getDate()),
    month: lookup.month ?? pad(date.getMonth() + 1),
    year: lookup.year ?? String(date.getFullYear()),
    hour: lookup.hour ?? pad(date.getHours()),
    minute: lookup.minute ?? pad(date.getMinutes()),
  };
}

export function slugifyWorkOrderId(workOrderId: string) {
  return workOrderId
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

export function buildOfferSlug(workOrderId: string, sentAt: Date) {
  const normalizedWorkOrderId = slugifyWorkOrderId(workOrderId) || 'tilbud';
  const parts = getCopenhagenParts(sentAt);
  return `${normalizedWorkOrderId}-${parts.day}-${parts.month}-${parts.year}-${parts.hour}-${parts.minute}`;
}

export function getOfferIdentifier(offer: Pick<Offer, 'public_slug' | 'token'>) {
  return offer.public_slug || offer.token;
}

export function buildOfferPath(identifier: string) {
  return `/${encodeURIComponent(identifier)}`;
}

export function buildPublicOfferUrl(identifier: string, appUrl = resolveClientPublicAppUrl()) {
  return `${appUrl.replace(/\/$/, '')}${buildOfferPath(identifier)}`;
}

function resolveClientPublicAppUrl() {
  return normalizePublicAppUrl(process.env.NEXT_PUBLIC_APP_URL ?? '') ?? DEFAULT_PUBLIC_APP_URL;
}

export function resolvePublicAppUrl() {
  const configured = [process.env.NEXT_PUBLIC_APP_URL, process.env.APP_URL]
    .map((value) => normalizePublicAppUrl(value ?? ''))
    .find(Boolean);

  if (configured) {
    return configured;
  }

  return DEFAULT_PUBLIC_APP_URL;
}
