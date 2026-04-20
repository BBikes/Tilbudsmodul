import type { OfferMarker } from '@/types';

const config: Record<OfferMarker, { label: string; icon: string; bg: string; text: string; border: string; circle: string; ring: string }> = {
  red: {
    label: 'Nødvendig',
    icon: '▲',
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
    circle: 'bg-red-500',
    ring: 'ring-red-500',
  },
  yellow: {
    label: 'Anbefales',
    icon: '▲',
    bg: 'bg-yellow-50',
    text: 'text-yellow-700',
    border: 'border-yellow-200',
    circle: 'bg-amber-400',
    ring: 'ring-amber-400',
  },
  green: {
    label: 'Inden næste service',
    icon: '●',
    bg: 'bg-green-50',
    text: 'text-green-700',
    border: 'border-green-200',
    circle: 'bg-green-500',
    ring: 'ring-green-500',
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

export function MarkerCircleButton({
  marker,
  active,
  onClick,
  title,
}: {
  marker: OfferMarker;
  active: boolean;
  onClick: () => void;
  title?: string;
}) {
  const c = config[marker];
  return (
    <button
      type="button"
      title={title ?? c.label}
      onClick={onClick}
      className={`w-5 h-5 rounded-full flex-shrink-0 transition-all ${c.circle} ${
        active ? `ring-2 ring-offset-1 ${c.ring}` : 'opacity-30 hover:opacity-60'
      }`}
    />
  );
}

export const MARKER_OPTIONS: { value: OfferMarker; label: string; icon: string; color: string }[] = [
  { value: 'red', label: 'Nødvendig', icon: '▲', color: 'text-red-600' },
  { value: 'yellow', label: 'Anbefales', icon: '▲', color: 'text-yellow-500' },
  { value: 'green', label: 'Inden næste service', icon: '●', color: 'text-green-600' },
];
