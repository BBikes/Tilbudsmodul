'use client';

import { useState } from 'react';
import type { OfferExtraWorkItemInput, OfferTemplateSnapshot } from '@/types';
import { MarkerBadge } from './MarkerBadge';
import { Loader2, AlertTriangle } from 'lucide-react';

function formatPrice(price: number) {
  return new Intl.NumberFormat('da-DK', {
    style: 'currency',
    currency: 'DKK',
    maximumFractionDigits: 0,
  }).format(price);
}

interface SendPreviewProps {
  workOrderId: string;
  customerName: string;
  customerPhone: string;
  templates: OfferTemplateSnapshot[];
  extraWorkItem: OfferExtraWorkItemInput | null;
  extraWorkUnitPrice: number | null;
  expiryHours: number;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

export function SendPreview({
  workOrderId,
  customerName,
  customerPhone,
  templates,
  extraWorkItem,
  extraWorkUnitPrice,
  expiryHours,
  onConfirm,
  onCancel,
}: SendPreviewProps) {
  const [confirmOrderId, setConfirmOrderId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const extraWorkTotal =
    extraWorkItem && extraWorkUnitPrice !== null
      ? extraWorkItem.bb15Quantity * extraWorkUnitPrice
      : null;
  const total = templates.reduce((sum, template) => sum + template.price, 0) + (extraWorkTotal ?? 0);
  const lineCount = templates.length + (extraWorkItem ? 1 : 0);
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
        <div className="px-6 py-5 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Bekraeft og send tilbud</h2>
          <p className="text-xs text-gray-400 mt-0.5">Gennemgaa inden du sender</p>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
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

          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Valgte ydelser ({lineCount})
            </p>
            <div className="space-y-1">
              {templates.map((template) => (
                <div key={template.id} className="flex items-center gap-2 py-1.5">
                  <MarkerBadge marker={template.marker} compact />
                  <span className="flex-1 text-sm text-gray-800">{template.title}</span>
                  <span className="text-sm text-gray-500 flex-shrink-0">
                    {template.price > 0 ? formatPrice(template.price) : '—'}
                  </span>
                </div>
              ))}

              {extraWorkItem && (
                <div className="flex items-center gap-2 py-1.5">
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-gray-100 px-2 text-[11px] font-semibold text-gray-600">
                    BB15
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800">{extraWorkItem.title}</p>
                    <p className="text-xs text-gray-400">{extraWorkItem.bb15Quantity} x 15 minutter</p>
                  </div>
                  {extraWorkTotal !== null && (
                    <span className="text-sm text-gray-500 flex-shrink-0">
                      {formatPrice(extraWorkTotal)}
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-3 mt-2 border-t border-gray-100">
              <span className="text-sm font-medium text-gray-700">Total</span>
              <span className="font-bold text-gray-900">{formatPrice(total)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 rounded-xl p-3">
            <span className="text-gray-400">⏱</span>
            Tilbuddet udloeber om {expiryHours} timer
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5 flex items-center gap-1.5">
              <AlertTriangle size={12} className="text-amber-500" />
              Bekraeft sagsnummer
            </label>
            <input
              type="text"
              value={confirmOrderId}
              onChange={(e) => setConfirmOrderId(e.target.value)}
              placeholder={workOrderId}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
            {confirmOrderId && !isConfirmValid && (
              <p className="text-xs text-red-500 mt-1">Matcher ikke - tjek sagsnummeret</p>
            )}
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm rounded-lg p-3">{error}</div>
          )}
        </div>

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
