'use client';

import Image from 'next/image';
import { useMemo, useState } from 'react';
import type { Offer, OfferExtraWorkItemSnapshot, OfferMarker } from '@/types';
import { MarkerBadge } from '@/components/offer/MarkerBadge';
import { Loader2, Mail, Phone } from 'lucide-react';

const MARKER_ORDER: OfferMarker[] = ['red', 'yellow', 'green'];

function formatPrice(price: number) {
  return new Intl.NumberFormat('da-DK', {
    style: 'currency',
    currency: 'DKK',
    maximumFractionDigits: 0,
  }).format(price);
}

interface Props {
  offer: Offer;
  contactPhone: string;
  contactEmail: string;
}

export default function CustomerOfferClient({ offer, contactPhone, contactEmail }: Props) {
  const isExpired = offer.status === 'expired' || new Date(offer.expires_at) < new Date();

  if (isExpired) {
    return <ExpiredPage phone={contactPhone} email={contactEmail} />;
  }

  if (['accepted', 'accepted_partial', 'rejected'].includes(offer.status)) {
    return <AlreadyRespondedPage status={offer.status} />;
  }

  return <OfferView offer={offer} />;
}

function OfferView({ offer }: { offer: Offer }) {
  const sortedTemplates = useMemo(() => {
    return [...offer.templates_snapshot].sort(
      (left, right) => MARKER_ORDER.indexOf(left.marker) - MARKER_ORDER.indexOf(right.marker),
    );
  }, [offer.templates_snapshot]);

  const defaultSelected = new Set(
    sortedTemplates
      .filter((template) => template.marker === 'red' || template.marker === 'yellow')
      .map((template) => template.id),
  );

  const extraWorkItem = offer.extra_work_item_snapshot;
  const [checkedIds, setCheckedIds] = useState<Set<number>>(defaultSelected);
  const extraWorkDefaultChecked =
    !!extraWorkItem && extraWorkItem.marker !== 'green';
  const [extraWorkChecked, setExtraWorkChecked] = useState(extraWorkDefaultChecked);
  const [loading, setLoading] = useState<'accept_selected' | 'accept_all' | 'reject' | null>(null);
  const [done, setDone] = useState(false);
  const [doneType, setDoneType] = useState<'accepted' | 'rejected' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toggleTemplate = (templateId: number) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(templateId)) next.delete(templateId);
      else next.add(templateId);
      return next;
    });
  };

  const toggleExtraWorkItem = () => {
    if (!extraWorkItem) return;
    setExtraWorkChecked((prev) => !prev);
  };

  const selectedTotal =
    sortedTemplates
      .filter((template) => checkedIds.has(template.id))
      .reduce((sum, template) => sum + template.price, 0) +
    (extraWorkChecked && extraWorkItem ? extraWorkItem.total_price : 0);
  const hasAnySelection = checkedIds.size > 0 || (extraWorkItem ? extraWorkChecked : false);

  const respond = async (action: 'accept_selected' | 'accept_all' | 'reject') => {
    setError(null);

    const acceptedIds =
      action === 'reject'
        ? []
        : action === 'accept_all'
          ? sortedTemplates.map((template) => template.id)
          : Array.from(checkedIds);
    const extraWorkItemAccepted =
      action === 'reject'
        ? false
        : action === 'accept_all'
          ? !!extraWorkItem
          : !!extraWorkItem && extraWorkChecked;

    if (action === 'accept_selected' && acceptedIds.length === 0 && !extraWorkItemAccepted) {
      setError('Vælg mindst en linje');
      return;
    }

    setLoading(action);

    try {
      const res = await fetch(`/api/offer/${offer.id}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, acceptedIds, extraWorkItemAccepted }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error ?? 'Noget gik galt');
      }

      setDoneType(action === 'reject' ? 'rejected' : 'accepted');
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Noget gik galt');
    } finally {
      setLoading(null);
    }
  };

  const hasImages = offer.images_snapshot && offer.images_snapshot.length > 0;

  if (done) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-xs text-center">
          <div
            className={`mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full ${
              doneType === 'accepted' ? 'bg-green-100' : 'bg-gray-100'
            }`}
          >
            {doneType === 'accepted' ? (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M5 13l4 4L19 7" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" />
              </svg>
            )}
          </div>
          <h2 className="mb-2 text-xl font-bold text-gray-900">
            {doneType === 'accepted' ? 'Tak for din accept' : 'Tilbud afvist'}
          </h2>
          <p className="text-sm text-gray-500">
            {doneType === 'accepted'
              ? 'Vi er i gang med din cykel. Du hører fra os snarest.'
              : 'Vi har registreret dit svar. Kontakt os gerne, hvis du har spørgsmål.'}
          </p>
        </div>
      </div>
    );
  }

  const expiryDate = new Date(offer.expires_at);
  const expiryStr = expiryDate.toLocaleDateString('da-DK', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-100 bg-white px-4">
        <div className="mx-auto flex h-14 max-w-lg items-center">
          <Image
            src="https://b-bikes.dk/wp-content/uploads/Logo-Wide.svg"
            alt="B-Bikes"
            width={160}
            height={28}
            unoptimized
            className="h-7 w-auto"
          />
        </div>
      </header>

      <main className="mx-auto max-w-lg space-y-5 px-4 py-6 pb-32">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Tilbud på ekstraarbejde</h1>
          <p className="mt-1 text-sm text-gray-500">
            Sag #{offer.work_order_id}
            {offer.customer_name ? ` · ${offer.customer_name}` : ''}
          </p>
          <p className="mt-1 text-xs text-gray-400">Tilbuddet udløber {expiryStr}</p>
        </div>

        {error && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</div>}

        <div className="divide-y divide-gray-50 rounded-2xl border border-gray-100 bg-white">
          {sortedTemplates.map((template) => (
            <TemplateRow
              key={template.id}
              template={template}
              checked={checkedIds.has(template.id)}
              onToggle={() => toggleTemplate(template.id)}
            />
          ))}

          {extraWorkItem && (
            <ExtraWorkRow
              extraWorkItem={extraWorkItem}
              checked={extraWorkChecked}
              onToggle={toggleExtraWorkItem}
            />
          )}
        </div>

        {hasImages && (
          <button className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50">
            Se billeder ({offer.images_snapshot.length})
          </button>
        )}

        {selectedTotal > 0 && (
          <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-white px-5 py-3">
            <span className="text-sm text-gray-600">Valgt total</span>
            <span className="font-bold text-gray-900">{formatPrice(selectedTotal)}</span>
          </div>
        )}
      </main>

      <div className="fixed bottom-0 left-0 right-0 border-t border-gray-100 bg-white px-4 py-4">
        <div className="mx-auto max-w-lg space-y-2">
          <div className="flex gap-2">
            <button
              onClick={() => respond('accept_selected')}
              disabled={!hasAnySelection || loading !== null}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border-2 border-green-600 py-3 text-sm font-medium text-green-700 hover:bg-green-50 disabled:opacity-40"
            >
              {loading === 'accept_selected' && <Loader2 size={14} className="animate-spin" />}
              Accepter valgte
            </button>
            <button
              onClick={() => respond('accept_all')}
              disabled={loading !== null}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-green-600 py-3 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-40"
            >
              {loading === 'accept_all' && <Loader2 size={14} className="animate-spin" />}
              Accepter alle
            </button>
          </div>
          <button
            onClick={() => respond('reject')}
            disabled={loading !== null}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-red-600 py-3 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-40"
          >
            {loading === 'reject' && <Loader2 size={14} className="animate-spin" />}
            Afvis tilbud
          </button>
        </div>
      </div>
    </div>
  );
}

function TemplateRow({
  template,
  checked,
  onToggle,
}: {
  template: Offer['templates_snapshot'][number];
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={`flex cursor-pointer items-center gap-3 px-5 py-4 transition-colors ${checked ? 'bg-white' : 'bg-gray-50/50'}`}
      onClick={onToggle}
    >
      <div
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors ${
          checked ? 'border-gray-900 bg-gray-900' : 'border-gray-300'
        }`}
      >
        {checked && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          <MarkerBadge marker={template.marker} />
        </div>
        <p className={`text-sm font-medium ${checked ? 'text-gray-900' : 'text-gray-500'}`}>{template.title}</p>
      </div>

      <span className="shrink-0 text-sm font-medium text-gray-700">
        {template.price > 0 ? formatPrice(template.price) : '-'}
      </span>
    </div>
  );
}

function ExtraWorkRow({
  extraWorkItem,
  checked,
  onToggle,
}: {
  extraWorkItem: OfferExtraWorkItemSnapshot;
  checked: boolean;
  onToggle: () => void;
}) {
  const badgeClasses =
    extraWorkItem.marker === 'red'
      ? 'bg-red-100 text-red-700'
      : extraWorkItem.marker === 'yellow'
        ? 'bg-amber-100 text-amber-700'
        : extraWorkItem.marker === 'green'
          ? 'bg-green-100 text-green-700'
          : 'bg-gray-100 text-gray-600';
  return (
    <div
      className={`flex cursor-pointer items-center gap-3 px-5 py-4 transition-colors ${checked ? 'bg-white' : 'bg-gray-50/50'}`}
      onClick={onToggle}
    >
      <div
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors ${
          checked ? 'border-gray-900 bg-gray-900' : 'border-gray-300'
        }`}
      >
        {checked && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${badgeClasses}`}>
            BB15
          </span>
          <span className="text-xs text-gray-400">{extraWorkItem.bb15_quantity} x 15 minutter</span>
        </div>
        <p className={`text-sm font-medium ${checked ? 'text-gray-900' : 'text-gray-500'}`}>{extraWorkItem.title}</p>
      </div>

      <span className="shrink-0 text-sm font-medium text-gray-700">{formatPrice(extraWorkItem.total_price)}</span>
    </div>
  );
}

function ExpiredPage({ phone, email }: { phone: string; email: string }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="border-b border-gray-100 bg-white px-4">
        <div className="mx-auto flex h-14 max-w-lg items-center">
          <Image
            src="https://b-bikes.dk/wp-content/uploads/Logo-Wide.svg"
            alt="B-Bikes"
            width={160}
            height={28}
            unoptimized
            className="h-7 w-auto"
          />
        </div>
      </header>
      <div className="flex flex-1 items-center justify-center px-4">
        <div className="max-w-xs text-center">
          <p className="mb-4 text-4xl">⏱</p>
          <h1 className="mb-2 text-lg font-bold text-gray-900">Tilbuddet er udløbet</h1>
          <p className="mb-6 text-sm text-gray-500">Kontakt os, hvis du stadig ønsker at få udført arbejdet.</p>
          <div className="space-y-2">
            {phone && (
              <a
                href={`tel:${phone}`}
                className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 py-3 text-sm text-gray-700 hover:bg-gray-50"
              >
                <Phone size={14} />
                {phone}
              </a>
            )}
            {email && (
              <a
                href={`mailto:${email}`}
                className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 py-3 text-sm text-gray-700 hover:bg-gray-50"
              >
                <Mail size={14} />
                {email}
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AlreadyRespondedPage({ status }: { status: string }) {
  const label =
    status === 'rejected'
      ? 'Du har afvist dette tilbud'
      : 'Du har allerede besvaret dette tilbud';

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-xs text-center">
        <p className="mb-4 text-4xl">✓</p>
        <h1 className="mb-2 text-lg font-bold text-gray-900">{label}</h1>
        <p className="text-sm text-gray-500">Kontakt os, hvis du har spørgsmål.</p>
      </div>
    </div>
  );
}
