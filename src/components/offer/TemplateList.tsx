'use client';

import type { OfferTemplate, OfferMarker, OfferTemplateSnapshot } from '@/types';
import { MARKER_OPTIONS, MarkerCircleButton } from './MarkerBadge';

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
  const sorted = [...templates].sort((a, b) => {
    const groupCompare = (a.group_name ?? 'zzzz').localeCompare(b.group_name ?? 'zzzz', 'da');
    if (groupCompare !== 0) return groupCompare;
    if (a.position !== b.position) return a.position - b.position;
    return a.title.localeCompare(b.title, 'da');
  });

  if (sorted.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400 text-sm">
        Ingen skabeloner fundet. Tjek indstillinger for skabelonegruppe.
      </div>
    );
  }

  const sections = new Map<string, OfferTemplate[]>();
  for (const template of sorted) {
    const key = template.group_name?.trim() || 'Andre';
    sections.set(key, [...(sections.get(key) ?? []), template]);
  }

  return (
    <div className="space-y-5">
      {Array.from(sections.entries()).map(([sectionTitle, sectionTemplates]) => (
        <section key={sectionTitle} className="space-y-2">
          <div className="sticky top-0 z-10 -mx-1 px-1 py-1 bg-white/95 backdrop-blur-sm">
            <div className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
              {sectionTitle}
            </div>
          </div>

          <div className="divide-y divide-gray-50 rounded-2xl border border-gray-100 overflow-hidden">
            {sectionTemplates.map((t) => {
              const isSelected = selected.has(t.bikedesk_template_id);
              const marker = selected.get(t.bikedesk_template_id) ?? 'yellow';

              return (
                <div
                  key={t.bikedesk_template_id}
                  className={`flex items-center gap-3 py-3 px-3 transition-colors ${isSelected ? 'bg-gray-50' : 'hover:bg-gray-50/50'}`}
                >
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

                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${isSelected ? 'text-gray-900' : 'text-gray-600'}`}>
                      {t.title}
                    </p>
                  </div>

                  <span className="text-sm text-gray-500 flex-shrink-0 w-20 text-right">
                    {t.price > 0 ? formatPrice(t.price) : '—'}
                  </span>

                  {isSelected && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {MARKER_OPTIONS.map((opt) => (
                        <MarkerCircleButton
                          key={opt.value}
                          marker={opt.value}
                          active={marker === opt.value}
                          onClick={() => onMarkerChange(t.bikedesk_template_id, opt.value)}
                          title={opt.label}
                        />
                      ))}
                    </div>
                  )}

                  {!isSelected && <div className="w-[88px] flex-shrink-0" />}
                </div>
              );
            })}
          </div>
        </section>
      ))}
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
