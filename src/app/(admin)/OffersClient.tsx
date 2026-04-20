'use client';

import { useState } from 'react';
import type { Offer, OfferStatus } from '@/types';
import { buildPublicOfferUrl } from '@/lib/offer-link';
import { Loader2, ExternalLink, RefreshCw } from 'lucide-react';

const STATUS_LABELS: Record<OfferStatus, string> = {
  sent: 'Sendt',
  opened: 'Åbnet',
  accepted: 'Accepteret',
  accepted_partial: 'Delvist accepteret',
  rejected: 'Afvist',
  expired: 'Udløbet',
};

const STATUS_COLORS: Record<OfferStatus, string> = {
  sent: 'bg-blue-50 text-blue-700',
  opened: 'bg-yellow-50 text-yellow-700',
  accepted: 'bg-green-50 text-green-700',
  accepted_partial: 'bg-green-50 text-green-600',
  rejected: 'bg-red-50 text-red-700',
  expired: 'bg-gray-100 text-gray-500',
};

const ALL_STATUSES: OfferStatus[] = ['sent', 'opened', 'accepted', 'accepted_partial', 'rejected', 'expired'];

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('da-DK', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function OffersClient({ offers }: { offers: Offer[] }) {
  const [filter, setFilter] = useState<OfferStatus | 'all'>('all');
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);

  const filtered = filter === 'all' ? offers : offers.filter((offer) => offer.status === filter);

  const handleResend = async (offer: Offer) => {
    setResendingId(offer.id);
    setResendError(null);
    try {
      const res = await fetch(`/api/offer/${offer.id}/resend`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error ?? 'Fejl');
      window.location.reload();
    } catch (err) {
      setResendError(err instanceof Error ? err.message : 'Fejl ved gensendelse');
    } finally {
      setResendingId(null);
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Tilbud</h1>
          <p className="mt-0.5 text-sm text-gray-400">{offers.length} sendte tilbud</p>
        </div>
      </div>

      {resendError && <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-600">{resendError}</div>}

      <div className="mb-5 flex flex-wrap gap-2">
        <FilterTab label="Alle" value="all" active={filter === 'all'} onClick={() => setFilter('all')} />
        {ALL_STATUSES.map((status) => (
          <FilterTab
            key={status}
            label={STATUS_LABELS[status]}
            value={status}
            active={filter === status}
            onClick={() => setFilter(status)}
          />
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400">Ingen tilbud</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50 text-xs uppercase tracking-wide text-gray-400">
                  <th className="px-4 py-3 text-left font-medium">Sag</th>
                  <th className="px-4 py-3 text-left font-medium">Kunde</th>
                  <th className="px-4 py-3 text-left font-medium">Mekaniker</th>
                  <th className="px-4 py-3 text-left font-medium">Sendt</th>
                  <th className="px-4 py-3 text-left font-medium">Udløber</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Handling</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((offer) => (
                  <tr key={offer.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-medium text-gray-900">#{offer.work_order_id}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{offer.customer_name ?? '-'}</p>
                      <p className="text-xs text-gray-400">{offer.customer_phone ?? ''}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{offer.mechanic_name}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-500">{formatDate(offer.sent_at)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-500">{formatDate(offer.expires_at)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[offer.status]}`}
                      >
                        {STATUS_LABELS[offer.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {offer.public_slug && (
                          <a
                            href={buildPublicOfferUrl(offer.public_slug)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                            title="Åbn kundeside"
                          >
                            <ExternalLink size={14} />
                          </a>
                        )}
                        <button
                          onClick={() => handleResend(offer)}
                          disabled={resendingId === offer.id}
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40"
                          title="Gensend"
                        >
                          {resendingId === offer.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <RefreshCw size={14} />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function FilterTab({
  label,
  active,
  onClick,
}: {
  label: string;
  value: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
        active ? 'bg-gray-900 text-white' : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
      }`}
    >
      {label}
    </button>
  );
}
