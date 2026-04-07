'use client';

import { useState } from 'react';
import type { OfferSettings } from '@/types';
import { Loader2 } from 'lucide-react';

interface Props {
  settings: OfferSettings;
  availableTags: { id: number; label: string }[];
}

export default function SettingsClient({ settings: initial, availableTags }: Props) {
  const [s, setS] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (patch: Partial<OfferSettings>) => setS((prev) => ({ ...prev, ...patch }));

  const handleSave = async () => {
    setLoading(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(s),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error ?? 'Fejl');
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fejl');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Indstillinger</h1>
        <p className="text-sm text-gray-400 mt-0.5">Tilbudsmodul konfiguration</p>
      </div>

      {error && <div className="bg-red-50 text-red-600 text-sm rounded-xl p-3 mb-4">{error}</div>}
      {saved && <div className="bg-green-50 text-green-700 text-sm rounded-xl p-3 mb-4">Indstillinger gemt</div>}

      <div className="space-y-5 max-w-2xl">
        {/* Expiry */}
        <Section title="Tilbudsudløb">
          <Field label="Udløb (timer)">
            <input
              type="number"
              min={1}
              max={720}
              value={s.expiry_hours}
              onChange={(e) => update({ expiry_hours: parseInt(e.target.value) || 72 })}
              className={inputCls}
            />
          </Field>
        </Section>

        {/* Contact for expired page */}
        <Section title="Kontaktinfo på udløbet side">
          <Field label="Telefonnummer">
            <input
              type="text"
              value={s.expired_phone}
              onChange={(e) => update({ expired_phone: e.target.value })}
              placeholder="+45 12 34 56 78"
              className={inputCls}
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              value={s.expired_email}
              onChange={(e) => update({ expired_email: e.target.value })}
              placeholder="service@b-bikes.dk"
              className={inputCls}
            />
          </Field>
        </Section>

        {/* Template group */}
        <Section title="Skabeloner">
          <Field label="BikeDesk gruppe-ID (lad tom for at vise alle)">
            <input
              type="number"
              value={s.template_group_id ?? ''}
              onChange={(e) =>
                update({ template_group_id: e.target.value ? parseInt(e.target.value) : null })
              }
              className={inputCls}
              placeholder="f.eks. 42"
            />
          </Field>
        </Section>

        {/* Tag mappings */}
        <Section title="Mærkning (Tags)">
          <TagsField
            label="Tags tilføjes ved afsendelse"
            value={s.tags_on_sent}
            onChange={(v) => update({ tags_on_sent: v })}
            available={availableTags}
          />
          <TagsField
            label="Tags tilføjes ved accept"
            value={s.tags_on_accepted}
            onChange={(v) => update({ tags_on_accepted: v })}
            available={availableTags}
          />
          <TagsField
            label="Tags fjernes ved accept"
            value={s.tags_remove_on_accepted}
            onChange={(v) => update({ tags_remove_on_accepted: v })}
            available={availableTags}
          />
          <TagsField
            label="Tags tilføjes ved afvisning"
            value={s.tags_on_rejected}
            onChange={(v) => update({ tags_on_rejected: v })}
            available={availableTags}
          />
          <TagsField
            label="Tags fjernes ved afvisning"
            value={s.tags_remove_on_rejected}
            onChange={(v) => update({ tags_remove_on_rejected: v })}
            available={availableTags}
          />
        </Section>

        <button
          onClick={handleSave}
          disabled={loading}
          className="px-6 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-800 disabled:opacity-40 flex items-center gap-2"
        >
          {loading && <Loader2 size={14} className="animate-spin" />}
          Gem indstillinger
        </button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{title}</p>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  );
}

function TagsField({
  label,
  value,
  onChange,
  available,
}: {
  label: string;
  value: number[];
  onChange: (v: number[]) => void;
  available: { id: number; label: string }[];
}) {
  const toggle = (id: number) => {
    if (value.includes(id)) {
      onChange(value.filter((v) => v !== id));
    } else {
      onChange([...value, id]);
    }
  };

  return (
    <div>
      <p className="text-xs font-medium text-gray-600 mb-2">{label}</p>
      {available.length === 0 ? (
        <p className="text-xs text-gray-400">Ingen tags tilgængelige</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {available.map((tag) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => toggle(tag.id)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                value.includes(tag.id)
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
              }`}
            >
              {tag.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const inputCls =
  'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900';
