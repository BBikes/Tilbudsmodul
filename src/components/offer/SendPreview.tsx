'use client';

import { useState } from 'react';
import type { OfferTemplateSnapshot } from '@/types';
import { MarkerBadge } from './MarkerBadge';
import { Loader2, AlertTriangle } from 'lucide-react';

function formatPrice(price: number) {
  return new Intl.NumberFormat('da-DK', { style: 'currency', currency: 'DKK', maximumFractionDigits: 0 }).format(price);
}

interface SendPreviewProps {
  workOrderId: string;
  customerName: string;
  customerPhone: string;
  templates: OfferTemplateSnapshot[];
  expiryHours: number;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

export function SendPreview({
  workOrderId,
  customerName,
  customerPhone,
  templates,
  expiryHours,
  onConfirm,
  onCancel,
}: SendPreviewProps) {
  const [confirmOrderId, setConfirmOrderId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = templates.reduce((sum, t) => sum + t.price, 0);
  const isConfirmValid = confirmOrderId.trim() === workOrderId.trim();

  const handle = async () => {
    if (!isConfirmValid) {
      setError('Sagsnummer matcher ikke');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await onConfirm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Noget gik galt');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Bekræft og send tilbud</h2>
          <p className="text-xs text-gray-400 mt-0.5">Gennemgå inden du sender</p>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-400 mb-0.5">Sag</p>
              <p className="font-bold text-gray-900">#{workOrderId}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-400 mb-0.5">Kunde</p>
              <p className="font-semibold text-gray-900 text-sm truncate">{customerName}</p>
              <p className="text-xs text-gray-500">{customerPhone}</p>
            </div>
          </div>

          {/* Templates */}
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Valgte ydelser ({templates.length})
            </p>
            <div className="space-y-1">
              {templates.map((t) => (
                <div key={t.id} className="flex items-center gap-2 py-1.5">
                  <MarkerBadge marker={t.marker} compact />
                  <span className="flex-1 text-sm text-gray-800">{t.title}</span>
                  <span className="text-sm text-gray-500 flex-shrink-0">
                    {t.price > 0 ? formatPrice(t.price) : '—'}
                  </span>
                </div>
              ))}
            </div>
            {total > 0 && (
              <div className="flex justify-between items-center pt-3 mt-2 border-t border-gray-100">
                <span className="text-sm font-medium text-gray-700">Total</span>
                <span className="font-bold text-gray-900">{formatPrice(total)}</span>
              </div>
            )}
          </div>

          {/* Expiry */}
          <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 rounded-xl p-3">
            <span className="text-gray-400">⏱</span>
            Tilbuddet udløber om {expiryHours} timer
          </div>

          {/* Confirm order number */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5 flex items-center gap-1.5">
              <AlertTriangle size={12} className="text-amber-500" />
              Bekræft sagsnummer
            </label>
            <input
              type="text"
              value={confirmOrderId}
              onChange={(e) => setConfirmOrderId(e.target.value)}
              placeholder={workOrderId}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
            {confirmOrderId && !isConfirmValid && (
              <p className="text-xs text-red-500 mt-1">Matcher ikke — tjek sagsnummeret</p>
            )}
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm rounded-lg p-3">{error}</div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 disabled:opacity-40"
          >
            Tilbage
          </button>
          <button
            onClick={handle}
            disabled={loading || !isConfirmValid}
            className="flex-1 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            Send tilbud
          </button>
        </div>
      </div>
    </div>
  );
}
