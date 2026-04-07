'use client';

import { useState, useMemo } from 'react';
import type { Offer, OfferMarker, OfferTemplateSnapshot } from '@/types';
import { MarkerBadge } from '@/components/offer/MarkerBadge';
import { Loader2, Phone, Mail } from 'lucide-react';

const MARKER_ORDER: OfferMarker[] = ['red', 'yellow', 'green'];

function formatPrice(price: number) {
  return new Intl.NumberFormat('da-DK', { style: 'currency', currency: 'DKK', maximumFractionDigits: 0 }).format(price);
}

interface Props {
  offer: Offer;
  contactPhone: string;
  contactEmail: string;
}

export default function CustomerOfferClient({ offer, contactPhone, contactEmail }: Props) {
  // Check if expired
  const isExpired =
    offer.status === 'expired' || new Date(offer.expires_at) < new Date();

  if (isExpired) {
    return <ExpiredPage phone={contactPhone} email={contactEmail} />;
  }

  // Check if already responded
  if (['accepted', 'accepted_partial', 'rejected'].includes(offer.status)) {
    return <AlreadyRespondedPage status={offer.status} />;
  }

  return <OfferView offer={offer} />;
}

function OfferView({ offer }: { offer: Offer }) {
  const sorted = useMemo(() => {
    return [...offer.templates_snapshot].sort(
      (a, b) => MARKER_ORDER.indexOf(a.marker) - MARKER_ORDER.indexOf(b.marker)
    );
  }, [offer.templates_snapshot]);

  // Default: red + yellow preselected, green unselected
  const defaultSelected = new Set(
    sorted
      .filter((t) => t.marker === 'red' || t.marker === 'yellow')
      .map((t) => t.id)
  );

  const [checkedIds, setCheckedIds] = useState<Set<number>>(defaultSelected);
  const [loading, setLoading] = useState<'accept_selected' | 'accept_all' | 'reject' | null>(null);
  const [done, setDone] = useState(false);
  const [doneType, setDoneType] = useState<'accepted' | 'rejected' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toggle = (id: number) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedTotal = sorted
    .filter((t) => checkedIds.has(t.id))
    .reduce((sum, t) => sum + t.price, 0);

  const respond = async (action: 'accept_selected' | 'accept_all' | 'reject') => {
    setError(null);
    setLoading(action);

    const acceptedIds =
      action === 'reject'
        ? []
        : action === 'accept_all'
        ? sorted.map((t) => t.id)
        : Array.from(checkedIds);

    try {
      const res = await fetch(`/api/offer/${offer.id}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, acceptedIds }),
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
        <div className="text-center max-w-xs">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5 ${doneType === 'accepted' ? 'bg-green-100' : 'bg-gray-100'}`}>
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
          <h2 className="text-xl font-bold text-gray-900 mb-2">
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
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4">
        <div className="max-w-lg mx-auto flex items-center h-14">
          <img
            src="https://b-bikes.dk/wp-content/uploads/Logo-Wide.svg"
            alt="B-Bikes"
            className="h-7"
          />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-5 pb-32">
        {/* Intro */}
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            Tilbud på ekstraarbejde
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Sag #{offer.work_order_id}
            {offer.customer_name ? ` · ${offer.customer_name}` : ''}
          </p>
          <p className="text-xs text-gray-400 mt-1">Tilbuddet udløber {expiryStr}</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm rounded-xl p-3">{error}</div>
        )}

        {/* Template list */}
        <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
          {sorted.map((t) => (
            <TemplateRow
              key={t.id}
              template={t}
              checked={checkedIds.has(t.id)}
              onToggle={() => toggle(t.id)}
            />
          ))}
        </div>

        {/* Images button */}
        {hasImages && (
          <button className="text-sm text-gray-600 font-medium border border-gray-200 rounded-xl px-4 py-2.5 hover:bg-gray-50 w-full">
            Se billeder ({offer.images_snapshot.length})
          </button>
        )}

        {/* Total */}
        {selectedTotal > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 px-5 py-3 flex justify-between items-center">
            <span className="text-sm text-gray-600">Valgt total</span>
            <span className="font-bold text-gray-900">{formatPrice(selectedTotal)}</span>
          </div>
        )}
      </main>

      {/* Sticky action bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-4">
        <div className="max-w-lg mx-auto space-y-2">
          <div className="flex gap-2">
            <button
              onClick={() => respond('accept_selected')}
              disabled={checkedIds.size === 0 || loading !== null}
              className="flex-1 py-3 border-2 border-green-600 text-green-700 rounded-xl font-medium text-sm hover:bg-green-50 disabled:opacity-40 flex items-center justify-center gap-1.5"
            >
              {loading === 'accept_selected' && <Loader2 size={14} className="animate-spin" />}
              Accepter valgte
            </button>
            <button
              onClick={() => respond('accept_all')}
              disabled={loading !== null}
              className="flex-1 py-3 bg-green-600 text-white rounded-xl font-medium text-sm hover:bg-green-700 disabled:opacity-40 flex items-center justify-center gap-1.5"
            >
              {loading === 'accept_all' && <Loader2 size={14} className="animate-spin" />}
              Accepter alle
            </button>
          </div>
          <button
            onClick={() => respond('reject')}
            disabled={loading !== null}
            className="w-full py-3 bg-red-600 text-white rounded-xl font-medium text-sm hover:bg-red-700 disabled:opacity-40 flex items-center justify-center gap-1.5"
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
  template: OfferTemplateSnapshot;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={`flex items-center gap-3 px-5 py-4 cursor-pointer transition-colors ${checked ? 'bg-white' : 'bg-gray-50/50'}`}
      onClick={onToggle}
    >
      {/* Checkbox */}
      <div
        className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
          checked ? 'bg-gray-900 border-gray-900' : 'border-gray-300'
        }`}
      >
        {checked && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <MarkerBadge marker={template.marker} />
        </div>
        <p className={`text-sm font-medium ${checked ? 'text-gray-900' : 'text-gray-500'}`}>
          {template.title}
        </p>
      </div>

      {/* Price */}
      <span className="text-sm font-medium text-gray-700 flex-shrink-0">
        {template.price > 0 ? formatPrice(template.price) : '—'}
      </span>
    </div>
  );
}

function ExpiredPage({ phone, email }: { phone: string; email: string }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-100 px-4">
        <div className="max-w-lg mx-auto flex items-center h-14">
          <img
            src="https://b-bikes.dk/wp-content/uploads/Logo-Wide.svg"
            alt="B-Bikes"
            className="h-7"
          />
        </div>
      </header>
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="text-center max-w-xs">
          <p className="text-4xl mb-4">⏱</p>
          <h1 className="text-lg font-bold text-gray-900 mb-2">Tilbuddet er udløbet</h1>
          <p className="text-sm text-gray-500 mb-6">
            Kontakt os, hvis du stadig ønsker at få udført arbejdet.
          </p>
          <div className="space-y-2">
            {phone && (
              <a
                href={`tel:${phone}`}
                className="flex items-center justify-center gap-2 py-3 border border-gray-200 rounded-xl text-sm text-gray-700 hover:bg-gray-50"
              >
                <Phone size={14} />
                {phone}
              </a>
            )}
            {email && (
              <a
                href={`mailto:${email}`}
                className="flex items-center justify-center gap-2 py-3 border border-gray-200 rounded-xl text-sm text-gray-700 hover:bg-gray-50"
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
      <div className="text-center max-w-xs">
        <p className="text-4xl mb-4">✓</p>
        <h1 className="text-lg font-bold text-gray-900 mb-2">{label}</h1>
        <p className="text-sm text-gray-500">Kontakt os, hvis du har spørgsmål.</p>
      </div>
    </div>
  );
}
