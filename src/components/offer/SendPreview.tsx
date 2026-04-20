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
  onConfirm: (confirmWorkOrderId: string) => Promise<void>;
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
      await onConfirm(confirmOrderId.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Noget gik galt');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-xl">
        <div className="border-b border-gray-100 px-6 py-5">
          <h2 className="text-base font-semibold text-gray-900">Bekræft og send tilbud</h2>
          <p className="mt-0.5 text-xs text-gray-400">Gennemgå inden du sender</p>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-gray-50 p-3">
              <p className="mb-0.5 text-xs text-gray-400">Sag</p>
              <p className="font-bold text-gray-900">#{workOrderId}</p>
            </div>
            <div className="rounded-xl bg-gray-50 p-3">
              <p className="mb-0.5 text-xs text-gray-400">Kunde</p>
              <p className="truncate text-sm font-semibold text-gray-900">{customerName}</p>
              <p className="text-xs text-gray-500">{customerPhone}</p>
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
              Valgte ydelser ({lineCount})
            </p>
            <div className="space-y-1">
              {templates.map((template) => (
                <div key={template.id} className="flex items-center gap-2 py-1.5">
                  <MarkerBadge marker={template.marker} compact />
                  <span className="flex-1 text-sm text-gray-800">{template.title}</span>
                  <span className="shrink-0 text-sm text-gray-500">
                    {template.price > 0 ? formatPrice(template.price) : '-'}
                  </span>
                </div>
              ))}

              {extraWorkItem && (
                <div className="flex items-center gap-2 py-1.5">
                  <MarkerBadge marker={extraWorkItem.marker} compact />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-800">{extraWorkItem.title}</p>
                    <p className="text-xs text-gray-400">{extraWorkItem.bb15Quantity} x 15 minutter</p>
                  </div>
                  {extraWorkTotal !== null && (
                    <span className="shrink-0 text-sm text-gray-500">{formatPrice(extraWorkTotal)}</span>
                  )}
                </div>
              )}
            </div>

            <div className="mt-2 flex items-center justify-between border-t border-gray-100 pt-3">
              <span className="text-sm font-medium text-gray-700">Total</span>
              <span className="font-bold text-gray-900">{formatPrice(total)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-xl bg-gray-50 p-3 text-xs text-gray-500">
            <span className="text-gray-400">⏱</span>
            Tilbuddet udløber om {expiryHours} timer
          </div>

          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-600">
              <AlertTriangle size={12} className="text-amber-500" />
              Bekræft sagsnummer
            </label>
            <input
              type="text"
              value={confirmOrderId}
              onChange={(event) => setConfirmOrderId(event.target.value)}
              placeholder="Indtast sagsnummer"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
            {confirmOrderId && !isConfirmValid && (
              <p className="mt-1 text-xs text-red-500">Matcher ikke - tjek sagsnummeret</p>
            )}
          </div>

          {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}
        </div>

        <div className="flex gap-3 border-t border-gray-100 px-6 py-4">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
          >
            Tilbage
          </button>
          <button
            onClick={handle}
            disabled={loading || !isConfirmValid}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gray-900 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-40"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            Send tilbud
          </button>
        </div>
      </div>
    </div>
  );
}
