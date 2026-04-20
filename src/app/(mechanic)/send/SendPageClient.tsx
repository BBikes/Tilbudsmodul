'use client';

import Image from 'next/image';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type {
  BikedeskCustomer,
  BikedeskTicket,
  OfferExtraWorkItemInput,
  OfferMarker,
  OfferTemplate,
} from '@/types';
import { TemplateList, buildTemplateSnapshots } from '@/components/offer/TemplateList';
import { CustomerPanel } from '@/components/offer/CustomerPanel';
import { ImageSelector } from '@/components/offer/ImageSelector';
import { SendPreview } from '@/components/offer/SendPreview';
import { MarkerCircleButton, MARKER_OPTIONS } from '@/components/offer/MarkerBadge';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface Props {
  workOrderId: string;
  ticket: BikedeskTicket & Record<string, unknown>;
  customer: BikedeskCustomer;
  mechanic: { id: string; name: string; bikedesk_user_id: number | null };
  templates: OfferTemplate[];
  bb15UnitPrice: number | null;
  expiryHours: number;
}

export default function SendPageClient({
  workOrderId,
  ticket,
  customer,
  mechanic,
  templates,
  bb15UnitPrice,
  expiryHours,
}: Props) {
  const [selected, setSelected] = useState<Map<number, OfferMarker>>(new Map());
  const [extraWorkTitle, setExtraWorkTitle] = useState('');
  const [extraWorkBlocks, setExtraWorkBlocks] = useState(0);
  const [extraWorkMarker, setExtraWorkMarker] = useState<OfferMarker>('yellow');
  const [showPreview, setShowPreview] = useState(false);
  const [sentOfferId, setSentOfferId] = useState<string | null>(null);
  const router = useRouter();

  const toggle = (templateId: number) => {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(templateId)) {
        next.delete(templateId);
      } else {
        next.set(templateId, 'yellow');
      }
      return next;
    });
  };

  const changeMarker = (templateId: number, marker: OfferMarker) => {
    setSelected((prev) => {
      const next = new Map(prev);
      next.set(templateId, marker);
      return next;
    });
  };

  const normalizedExtraWorkTitle = extraWorkTitle.trim();
  const hasExtraWorkInput = normalizedExtraWorkTitle.length > 0 || extraWorkBlocks > 0;
  const isExtraWorkValid =
    !hasExtraWorkInput ||
    (normalizedExtraWorkTitle.length > 0 && Number.isInteger(extraWorkBlocks) && extraWorkBlocks > 0);
  const extraWorkItem: OfferExtraWorkItemInput | null =
    hasExtraWorkInput && isExtraWorkValid
      ? {
          title: normalizedExtraWorkTitle,
          bb15Quantity: extraWorkBlocks,
          marker: extraWorkMarker,
        }
      : null;
  const extraWorkTotal =
    extraWorkItem && bb15UnitPrice !== null
      ? extraWorkItem.bb15Quantity * bb15UnitPrice
      : null;

  const handleSend = async (confirmWorkOrderId: string) => {
    const snapshots = buildTemplateSnapshots(templates, selected);

    const res = await fetch('/api/offer/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workOrderId,
        confirmWorkOrderId,
        mechanicId: mechanic.id,
        mechanicName: mechanic.name,
        mechanicBikedeskUserId: mechanic.bikedesk_user_id,
        ticketId: ticket.id,
        customerId: customer.id,
        customerName: customer.name,
        customerPhone: customer.phone,
        customerEmail: customer.email,
        templates: snapshots,
        extraWorkItem,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error ?? 'Afsendelse fejlede');
    }

    setSentOfferId(data.offerId);
    setShowPreview(false);
  };

  if (sentOfferId) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="w-full max-w-sm text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M5 13l4 4L19 7" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h2 className="mb-2 text-xl font-bold text-gray-900">Tilbud sendt</h2>
            <p className="mb-1 text-sm text-gray-500">Sag #{workOrderId}</p>
            <p className="mb-1 text-sm text-gray-500">{customer.name}</p>
            <p className="mb-8 text-xs text-gray-400">Udløber om {expiryHours} timer</p>
            <button
              onClick={() => router.push('/')}
              className="w-full rounded-xl bg-gray-900 py-3 font-medium text-white hover:bg-gray-800"
            >
              Nyt tilbud
            </button>
          </div>
        </div>
      </div>
    );
  }

  const selectedTemplateCount = selected.size;
  const selectedLineCount = selectedTemplateCount + (extraWorkItem ? 1 : 0);
  const hasValidExtraWork = isExtraWorkValid && extraWorkItem !== null;
  const sendDisabled = (selectedTemplateCount === 0 && !hasValidExtraWork) || !isExtraWorkValid;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
        <Link href="/" className="mb-5 inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700">
          <ArrowLeft size={14} />
          Skift sag
        </Link>

        <div className="flex items-start gap-5 flex-col lg:flex-row">
          <div className="min-w-0 flex-1 space-y-4">
            <div className="rounded-2xl border border-gray-100 bg-white p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">Vælg ydelser</h2>
                  <p className="mt-0.5 text-xs text-gray-400">
                    {templates.length} skabeloner · vælg og tildel prioritet
                  </p>
                </div>
                {selectedTemplateCount > 0 && (
                  <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                    {selectedTemplateCount} valgt
                  </span>
                )}
              </div>
              <TemplateList
                templates={templates}
                selected={selected}
                onToggle={toggle}
                onMarkerChange={changeMarker}
              />
            </div>

            <div className="space-y-4 rounded-2xl border border-gray-100 bg-white p-5">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Ekstra linje</h2>
                <p className="mt-0.5 text-xs text-gray-400">
                  Valgfri linje med fritekst. Titlen vises for kunden og skrives i arbejdskortets titel,
                  mens antal 15 minutter bliver til BB15 x antal.
                </p>
              </div>

              <label className="block">
                <span className="mb-2 block text-xs font-medium uppercase tracking-wide text-gray-500">Titel</span>
                <input
                  type="text"
                  value={extraWorkTitle}
                  onChange={(event) => setExtraWorkTitle(event.target.value)}
                  placeholder="Fritekst til arbejdskortets titel"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </label>

              <div>
                <span className="mb-2 block text-xs font-medium uppercase tracking-wide text-gray-500">
                  15-minutters blokke
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setExtraWorkBlocks((current) => Math.max(0, current - 1))}
                    className="h-10 w-10 rounded-xl border border-gray-200 text-lg text-gray-700 hover:bg-gray-50"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={extraWorkBlocks === 0 ? '' : extraWorkBlocks}
                    onChange={(event) => {
                      const parsed = Number.parseInt(event.target.value, 10);
                      setExtraWorkBlocks(Number.isInteger(parsed) && parsed > 0 ? parsed : 0);
                    }}
                    placeholder="0"
                    className="h-10 w-24 rounded-xl border border-gray-200 px-3 text-center text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                  <button
                    type="button"
                    onClick={() => setExtraWorkBlocks((current) => current + 1)}
                    className="h-10 w-10 rounded-xl border border-gray-200 text-lg text-gray-700 hover:bg-gray-50"
                  >
                    +
                  </button>
                  <span className="text-sm text-gray-500">= BB15 x {extraWorkBlocks}</span>
                </div>
              </div>

              {extraWorkItem && extraWorkTotal !== null && (
                <p className="text-sm text-gray-500">
                  Estimeret pris:{' '}
                  {new Intl.NumberFormat('da-DK', {
                    style: 'currency',
                    currency: 'DKK',
                    maximumFractionDigits: 0,
                  }).format(extraWorkTotal)}
                </p>
              )}

              {hasExtraWorkInput && !isExtraWorkValid && (
                <p className="text-sm text-red-600">
                  Udfyld både titel og et positivt antal 15-minutters blokke for at bruge ekstralinjen.
                </p>
              )}

              <div>
                <span className="mb-2 block text-xs font-medium uppercase tracking-wide text-gray-500">Prioritet</span>
                <div className="flex items-center gap-3">
                  {MARKER_OPTIONS.map((opt) => (
                    <MarkerCircleButton
                      key={opt.value}
                      marker={opt.value}
                      active={extraWorkMarker === opt.value}
                      onClick={() => setExtraWorkMarker(opt.value)}
                      title={opt.label}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">Billeder</p>
              <ImageSelector />
            </div>
          </div>

          <div className="w-full shrink-0 space-y-4 lg:w-72">
            <CustomerPanel workOrderId={workOrderId} ticket={ticket} customer={customer} />

            <button
              onClick={() => setShowPreview(true)}
              disabled={sendDisabled}
              className="w-full rounded-xl bg-gray-900 py-3.5 font-medium text-white transition-opacity hover:bg-gray-800 disabled:opacity-40"
            >
              {!isExtraWorkValid
                ? 'Udfyld ekstralinje korrekt'
                : selectedTemplateCount === 0 && !hasValidExtraWork
                  ? 'Vælg en ydelse eller udfyld ekstralinje'
                  : `Send tilbud (${selectedLineCount})`}
            </button>

            <div className="space-y-2 rounded-xl border border-gray-100 bg-white p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Prioritet</p>
              <div className="space-y-1.5 text-xs text-gray-600">
                {MARKER_OPTIONS.map((opt) => (
                  <div key={opt.value} className="flex items-center gap-2">
                    <span className={`inline-block w-3.5 h-3.5 rounded-full flex-shrink-0 ${
                      opt.value === 'red' ? 'bg-red-500' : opt.value === 'yellow' ? 'bg-amber-400' : 'bg-green-500'
                    }`} />
                    <span>{opt.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      {showPreview && (
        <SendPreview
          workOrderId={workOrderId}
          customerName={customer.name}
          customerPhone={customer.phone}
          templates={buildTemplateSnapshots(templates, selected)}
          extraWorkItem={extraWorkItem}
          extraWorkUnitPrice={bb15UnitPrice}
          expiryHours={expiryHours}
          onConfirm={handleSend}
          onCancel={() => setShowPreview(false)}
        />
      )}
    </div>
  );
}

function Header() {
  return (
    <header className="border-b border-gray-100 bg-white px-4">
      <div className="mx-auto flex h-14 max-w-6xl items-center">
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
  );
}
