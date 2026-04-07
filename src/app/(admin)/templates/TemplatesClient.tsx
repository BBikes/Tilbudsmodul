'use client';

import { useState } from 'react';
import type { OfferTemplate } from '@/types';
import { Loader2, RefreshCw } from 'lucide-react';

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('da-DK', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatPrice(p: number) {
  if (!p) return '—';
  return new Intl.NumberFormat('da-DK', { style: 'currency', currency: 'DKK', maximumFractionDigits: 0 }).format(p);
}

export default function TemplatesClient({
  templates: initial,
  lastSync,
}: {
  templates: OfferTemplate[];
  lastSync: string | null;
}) {
  const [templates, setTemplates] = useState(initial);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncDone, setSyncDone] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    setSyncError(null);
    setSyncDone(false);
    try {
      const res = await fetch('/api/cron/templates/sync', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_APP_URL ?? ''}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error ?? 'Synkronisering fejlede');
      setSyncDone(true);
      // Reload templates
      window.location.reload();
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'Fejl');
    } finally {
      setSyncing(false);
    }
  };

  const toggleActive = async (t: OfferTemplate) => {
    const res = await fetch('/api/admin/templates', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: t.id, active: !t.active }),
    });
    const data = await res.json();
    if (data.success) {
      setTemplates((prev) => prev.map((x) => (x.id === t.id ? { ...x, active: !x.active } : x)));
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Skabeloner</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {templates.length} skabeloner
            {lastSync && ` · Sidst synkroniseret ${formatDate(lastSync)}`}
          </p>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 disabled:opacity-40"
        >
          {syncing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          Synkroniser fra BikeDesk
        </button>
      </div>

      {syncError && <div className="bg-red-50 text-red-600 text-sm rounded-xl p-3 mb-4">{syncError}</div>}
      {syncDone && <div className="bg-green-50 text-green-700 text-sm rounded-xl p-3 mb-4">Synkronisering gennemført</div>}

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {templates.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-sm">
            Ingen skabeloner endnu. Klik "Synkroniser" for at hente fra BikeDesk.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 uppercase tracking-wide border-b border-gray-50">
                  <th className="text-left px-4 py-3 font-medium">Navn</th>
                  <th className="text-left px-4 py-3 font-medium">Gruppe</th>
                  <th className="text-right px-4 py-3 font-medium">Pris</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {templates.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-2.5 font-medium text-gray-900">{t.title}</td>
                    <td className="px-4 py-2.5 text-gray-500 text-xs">{t.group_name ?? '—'}</td>
                    <td className="px-4 py-2.5 text-gray-700 text-right">{formatPrice(t.price)}</td>
                    <td className="px-4 py-2.5">
                      <button
                        onClick={() => toggleActive(t)}
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${t.active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-400'}`}
                      >
                        {t.active ? 'Aktiv' : 'Inaktiv'}
                      </button>
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
