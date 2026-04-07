'use client';

import type { OfferTemplate, OfferMarker, OfferTemplateSnapshot } from '@/types';
import { MARKER_OPTIONS } from './MarkerBadge';

interface TemplateListProps {
  templates: OfferTemplate[];
  selected: Map<number, OfferMarker>;
  onToggle: (templateId: number) => void;
  onMarkerChange: (templateId: number, marker: OfferMarker) => void;
}

function formatPrice(price: number) {
  return new Intl.NumberFormat('da-DK', { style: 'currency', currency: 'DKK', maximumFractionDigits: 0 }).format(price);
}

export function TemplateList({ templates, selected, onToggle, onMarkerChange }: TemplateListProps) {
  const sorted = [...templates].sort((a, b) => a.title.localeCompare(b.title, 'da'));

  if (sorted.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400 text-sm">
        Ingen skabeloner fundet. Tjek indstillinger for skabelonegruppe.
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-50">
      {sorted.map((t) => {
        const isSelected = selected.has(t.bikedesk_template_id);
        const marker = selected.get(t.bikedesk_template_id) ?? 'yellow';

        return (
          <div
            key={t.bikedesk_template_id}
            className={`flex items-center gap-3 py-3 px-1 rounded-lg transition-colors ${isSelected ? 'bg-gray-50' : 'hover:bg-gray-50/50'}`}
          >
            {/* Checkbox */}
            <button
              type="button"
              onClick={() => onToggle(t.bikedesk_template_id)}
              className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                isSelected
                  ? 'bg-gray-900 border-gray-900 text-white'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              {isSelected && (
                <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                  <path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>

            {/* Title */}
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium truncate ${isSelected ? 'text-gray-900' : 'text-gray-600'}`}>
                {t.title}
              </p>
            </div>

            {/* Price */}
            <span className="text-sm text-gray-500 flex-shrink-0 w-20 text-right">
              {t.price > 0 ? formatPrice(t.price) : '—'}
            </span>

            {/* Marker selector */}
            {isSelected && (
              <div className="flex items-center gap-1 flex-shrink-0">
                {MARKER_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    title={opt.label}
                    onClick={() => onMarkerChange(t.bikedesk_template_id, opt.value)}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center text-base transition-colors ${
                      marker === opt.value
                        ? `${opt.color} bg-white shadow-sm ring-1 ring-gray-200`
                        : 'text-gray-300 hover:text-gray-400'
                    }`}
                  >
                    <span className="text-xs">{opt.icon}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Placeholder when not selected */}
            {!isSelected && <div className="w-[88px] flex-shrink-0" />}
          </div>
        );
      })}
    </div>
  );
}

export function buildTemplateSnapshots(
  templates: OfferTemplate[],
  selected: Map<number, OfferMarker>
): OfferTemplateSnapshot[] {
  return Array.from(selected.entries()).map(([id, marker]) => {
    const t = templates.find((x) => x.bikedesk_template_id === id)!;
    return { id, title: t.title, price: t.price, marker };
  });
}
