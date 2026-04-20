'use client';

import { useId, useState } from 'react';
import type { OfferSettings } from '@/types';
import { DEFAULT_SMS_TEMPLATE, validateSmsTemplate } from '@/lib/offer-sms';
import { Check, ChevronDown, Loader2, Search, X } from 'lucide-react';

interface Props {
  settings: OfferSettings;
  availableTags: { id: number; label: string }[];
  availableTemplateTypes: { value: string; label: string }[];
}

export default function SettingsClient({
  settings: initial,
  availableTags,
  availableTemplateTypes,
}: Props) {
  const [s, setS] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (patch: Partial<OfferSettings>) => setS((prev) => ({ ...prev, ...patch }));

  const handleSave = async () => {
    setSaved(false);
    setError(null);

    const smsTemplateError = validateSmsTemplate(s.sms_template);
    if (smsTemplateError) {
      setError(smsTemplateError);
      return;
    }

    setLoading(true);
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
        <p className="mt-0.5 text-sm text-gray-400">Tilbudsmodul konfiguration</p>
      </div>

      {error && <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</div>}
      {saved && <div className="mb-4 rounded-xl bg-green-50 p-3 text-sm text-green-700">Indstillinger gemt</div>}

      <div className="max-w-2xl space-y-5">
        <Section title="Tilbudsudløb">
          <Field label="Udløb (timer)">
            <input
              type="number"
              min={1}
              max={720}
              value={s.expiry_hours}
              onChange={(event) => update({ expiry_hours: parseInt(event.target.value, 10) || 72 })}
              className={inputCls}
            />
          </Field>
        </Section>

        <Section title="Kontaktinfo på udløbet side">
          <Field label="Telefonnummer">
            <input
              type="text"
              value={s.expired_phone}
              onChange={(event) => update({ expired_phone: event.target.value })}
              placeholder="+45 12 34 56 78"
              className={inputCls}
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              value={s.expired_email}
              onChange={(event) => update({ expired_email: event.target.value })}
              placeholder="service@b-bikes.dk"
              className={inputCls}
            />
          </Field>
        </Section>

        <Section title="SMS">
          <Field label="SMS-skabelon til kunden">
            <textarea
              value={s.sms_template}
              onChange={(event) => update({ sms_template: event.target.value })}
              placeholder={DEFAULT_SMS_TEMPLATE}
              rows={8}
              className={`${inputCls} min-h-44 resize-y`}
            />
          </Field>
          <p className="text-xs text-gray-400">
            Tilgængelige felter: {'{customerName}'}, {'{workOrderId}'}, {'{offerLink}'} og {'{expiry}'}.
          </p>
        </Section>

        <Section title="Skabeloner">
          <Field label="Hovedgruppe der må vises for mekanikeren">
            <SearchableSingleSelect
              options={availableTemplateTypes}
              value={s.template_ticket_type}
              onChange={(value) => update({ template_ticket_type: value, template_group_id: null })}
              placeholder="Vælg hovedgruppe"
              emptyText="Ingen hovedgrupper fundet"
            />
          </Field>
        </Section>

        <Section title="Mærkning (tags)">
          <TagsField
            label="Tags tilføjes ved afsendelse"
            value={s.tags_on_sent}
            onChange={(value) => update({ tags_on_sent: value })}
            available={availableTags}
          />
          <TagsField
            label="Tags tilføjes ved accept"
            value={s.tags_on_accepted}
            onChange={(value) => update({ tags_on_accepted: value })}
            available={availableTags}
          />
          <TagsField
            label="Tags fjernes ved accept"
            value={s.tags_remove_on_accepted}
            onChange={(value) => update({ tags_remove_on_accepted: value })}
            available={availableTags}
          />
          <TagsField
            label="Tags tilføjes ved afvisning"
            value={s.tags_on_rejected}
            onChange={(value) => update({ tags_on_rejected: value })}
            available={availableTags}
          />
          <TagsField
            label="Tags fjernes ved afvisning"
            value={s.tags_remove_on_rejected}
            onChange={(value) => update({ tags_remove_on_rejected: value })}
            available={availableTags}
          />
        </Section>

        <button
          onClick={handleSave}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl bg-gray-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-40"
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
    <div className="space-y-3 rounded-2xl border border-gray-100 bg-white p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</p>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-600">{label}</label>
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
  onChange: (value: number[]) => void;
  available: { id: number; label: string }[];
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium text-gray-600">{label}</p>
      {available.length === 0 ? (
        <p className="text-xs text-gray-400">Ingen tags tilgængelige</p>
      ) : (
        <SearchableMultiSelect
          options={available.map((tag) => ({ value: String(tag.id), label: tag.label }))}
          values={value.map(String)}
          onChange={(values) => onChange(values.map((item) => parseInt(item, 10)).filter(Number.isFinite))}
          placeholder="Vælg tags"
          emptyText="Ingen tags matcher søgningen"
        />
      )}
    </div>
  );
}

function SearchableSingleSelect({
  options,
  value,
  onChange,
  placeholder,
  emptyText,
}: {
  options: { value: string; label: string }[];
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder: string;
  emptyText: string;
}) {
  const searchId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const filtered = options.filter((option) => option.label.toLowerCase().includes(query.trim().toLowerCase()));
  const selected = options.find((option) => option.value === value) ?? null;

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between rounded-xl border border-gray-200 px-3 py-2.5 text-left text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
      >
        <span className={selected ? 'text-gray-900' : 'text-gray-400'}>{selected?.label ?? placeholder}</span>
        <ChevronDown size={16} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              id={searchId}
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Søg..."
              className="w-full rounded-xl border border-gray-200 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>

          <div className="max-h-56 space-y-1 overflow-y-auto">
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setOpen(false);
                setQuery('');
              }}
              className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm ${
                value === null ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span>Vis alle hovedgrupper</span>
              {value === null && <Check size={15} />}
            </button>

            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-sm text-gray-400">{emptyText}</p>
            ) : (
              filtered.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                    setQuery('');
                  }}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm ${
                    value === option.value ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span>{option.label}</span>
                  {value === option.value && <Check size={15} />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SearchableMultiSelect({
  options,
  values,
  onChange,
  placeholder,
  emptyText,
}: {
  options: { value: string; label: string }[];
  values: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
  emptyText: string;
}) {
  const searchId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const filtered = options.filter((option) => option.label.toLowerCase().includes(query.trim().toLowerCase()));
  const selectedLabels = options.filter((option) => values.includes(option.value));

  const toggle = (optionValue: string) => {
    if (values.includes(optionValue)) {
      onChange(values.filter((value) => value !== optionValue));
    } else {
      onChange([...values, optionValue]);
    }
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between rounded-xl border border-gray-200 px-3 py-2.5 text-left text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
      >
        <span className={selectedLabels.length > 0 ? 'text-gray-900' : 'text-gray-400'}>
          {selectedLabels.length > 0 ? `${selectedLabels.length} valgt` : placeholder}
        </span>
        <ChevronDown size={16} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {selectedLabels.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedLabels.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => toggle(option.value)}
              className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200"
            >
              <span>{option.label}</span>
              <X size={12} />
            </button>
          ))}
        </div>
      )}

      {open && (
        <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              id={searchId}
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Søg..."
              className="w-full rounded-xl border border-gray-200 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>

          <div className="max-h-64 space-y-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-sm text-gray-400">{emptyText}</p>
            ) : (
              filtered.map((option) => {
                const checked = values.includes(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => toggle(option.value)}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm ${
                      checked ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span>{option.label}</span>
                    {checked && <Check size={15} />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const inputCls =
  'w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900';
