import type { OfferMarker } from '@/types';

const config: Record<OfferMarker, { label: string; icon: string; bg: string; text: string; border: string }> = {
  red: {
    label: 'Nødvendig',
    icon: '▲',
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
  },
  yellow: {
    label: 'Anbefales',
    icon: '▲',
    bg: 'bg-yellow-50',
    text: 'text-yellow-700',
    border: 'border-yellow-200',
  },
  green: {
    label: 'Inden næste service',
    icon: '●',
    bg: 'bg-green-50',
    text: 'text-green-700',
    border: 'border-green-200',
  },
};

export function MarkerBadge({ marker, compact = false }: { marker: OfferMarker; compact?: boolean }) {
  const c = config[marker];
  if (compact) {
    return (
      <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${c.text}`}>
        <span>{c.icon}</span>
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${c.bg} ${c.text} ${c.border}`}
    >
      <span className="text-[10px]">{c.icon}</span>
      {c.label}
    </span>
  );
}

export const MARKER_OPTIONS: { value: OfferMarker; label: string; icon: string; color: string }[] = [
  { value: 'red', label: 'Nødvendig', icon: '▲', color: 'text-red-600' },
  { value: 'yellow', label: 'Anbefales', icon: '▲', color: 'text-yellow-500' },
  { value: 'green', label: 'Inden næste service', icon: '●', color: 'text-green-600' },
];
