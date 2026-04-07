'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type {
  BikedeskCustomer,
  BikedeskTicket,
  OfferMarker,
  OfferTemplate,
} from '@/types';
import { TemplateList, buildTemplateSnapshots } from '@/components/offer/TemplateList';
import { CustomerPanel } from '@/components/offer/CustomerPanel';
import { ImageSelector } from '@/components/offer/ImageSelector';
import { SendPreview } from '@/components/offer/SendPreview';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface Props {
  workOrderId: string;
  ticket: BikedeskTicket & Record<string, unknown>;
  customer: BikedeskCustomer;
  mechanic: { id: string; name: string; bikedesk_user_id: number | null };
  templates: OfferTemplate[];
  expiryHours: number;
}

export default function SendPageClient({
  workOrderId,
  ticket,
  customer,
  mechanic,
  templates,
  expiryHours,
}: Props) {
  const [selected, setSelected] = useState<Map<number, OfferMarker>>(new Map());
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

  const handleSend = async () => {
    const snapshots = buildTemplateSnapshots(templates, selected);

    const res = await fetch('/api/offer/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workOrderId,
        mechanicId: mechanic.id,
        mechanicName: mechanic.name,
        mechanicBikedeskUserId: mechanic.bikedesk_user_id,
        ticketId: ticket.id,
        customerId: customer.id,
        customerName: customer.name,
        customerPhone: customer.phone,
        customerEmail: customer.email,
        templates: snapshots,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error ?? 'Afsendelse fejlede');
    }

    setSentOfferId(data.offerId);
    setShowPreview(false);
  };

  // Success screen
  if (sentOfferId) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="w-full max-w-sm text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M5 13l4 4L19 7" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Tilbud sendt</h2>
            <p className="text-sm text-gray-500 mb-1">Sag #{workOrderId}</p>
            <p className="text-sm text-gray-500 mb-1">{customer.name}</p>
            <p className="text-xs text-gray-400 mb-8">Udløber om {expiryHours} timer</p>
            <button
              onClick={() => router.push('/')}
              className="w-full py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800"
            >
              Nyt tilbud
            </button>
          </div>
        </div>
      </div>
    );
  }

  const selectedCount = selected.size;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
        {/* Back */}
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 mb-5">
          <ArrowLeft size={14} />
          Skift sag
        </Link>

        <div className="flex flex-col lg:flex-row gap-5 items-start">
          {/* Left: Template area */}
          <div className="flex-1 min-w-0 space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">Vælg ydelser</h2>
                  <p className="text-xs text-gray-400 mt-0.5">{templates.length} skabeloner · vælg og tildel prioritet</p>
                </div>
                {selectedCount > 0 && (
                  <span className="text-xs font-medium bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full">
                    {selectedCount} valgt
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

            {/* Images (placeholder) */}
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Billeder</p>
              <ImageSelector />
            </div>
          </div>

          {/* Right: Customer panel + send button */}
          <div className="w-full lg:w-72 flex-shrink-0 space-y-4">
            <CustomerPanel
              workOrderId={workOrderId}
              ticket={ticket}
              customer={customer}
            />

            {/* Send button */}
            <button
              onClick={() => setShowPreview(true)}
              disabled={selectedCount === 0}
              className="w-full py-3.5 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 disabled:opacity-40 transition-opacity"
            >
              {selectedCount === 0
                ? 'Vælg mindst én ydelse'
                : `Send tilbud (${selectedCount})`}
            </button>

            {/* Marker legend */}
            <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-2">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Prioritet</p>
              <div className="space-y-1.5 text-xs text-gray-600">
                <div className="flex items-center gap-2">
                  <span className="text-red-600 text-[10px]">▲</span>
                  <span>Nødvendig for funktion</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-yellow-500 text-[10px]">▲</span>
                  <span>Bør udbedres, ikke kritisk</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-600 text-[10px]">●</span>
                  <span>Inden næste service</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Preview modal */}
      {showPreview && (
        <SendPreview
          workOrderId={workOrderId}
          customerName={customer.name}
          customerPhone={customer.phone}
          templates={buildTemplateSnapshots(templates, selected)}
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
    <header className="bg-white border-b border-gray-100 px-4">
      <div className="max-w-6xl mx-auto flex items-center h-14">
        <img
          src="https://b-bikes.dk/wp-content/uploads/Logo-Wide.svg"
          alt="B-Bikes"
          className="h-7"
        />
      </div>
    </header>
  );
}
