'use client';

import { useState } from 'react';
import type { Mechanic } from '@/types';
import { Loader2, Plus, Pencil, ToggleLeft, ToggleRight } from 'lucide-react';

interface MechanicFormData {
  name: string;
  code: string;
  bikedesk_user_id: string;
}

export default function MechanicsClient({ mechanics: initial }: { mechanics: Mechanic[] }) {
  const [mechanics, setMechanics] = useState(initial);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<MechanicFormData>({ name: '', code: '', bikedesk_user_id: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openCreate = () => {
    setEditId(null);
    setForm({ name: '', code: '', bikedesk_user_id: '' });
    setError(null);
    setShowForm(true);
  };

  const openEdit = (m: Mechanic) => {
    setEditId(m.id);
    setForm({ name: m.name, code: '', bikedesk_user_id: String(m.bikedesk_user_id ?? '') });
    setError(null);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/admin/mechanics', {
        method: editId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editId,
          name: form.name,
          code: form.code || undefined,
          bikedesk_user_id: form.bikedesk_user_id ? parseInt(form.bikedesk_user_id) : null,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error ?? 'Fejl');

      setMechanics(data.mechanics);
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fejl');
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (m: Mechanic) => {
    const res = await fetch('/api/admin/mechanics', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: m.id, name: m.name, active: !m.active }),
    });
    const data = await res.json();
    if (data.success) setMechanics(data.mechanics);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Mekanikere</h1>
          <p className="text-sm text-gray-400 mt-0.5">{mechanics.length} mekanikere</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-800"
        >
          <Plus size={15} />
          Ny mekaniker
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">
            {editId ? 'Rediger mekaniker' : 'Ny mekaniker'}
          </h2>
          {error && (
            <div className="bg-red-50 text-red-600 text-sm rounded-lg p-3 mb-4">{error}</div>
          )}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Navn *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  {editId ? 'Ny PIN-kode (lad tom for at beholde)' : 'PIN-kode (4–6 cifre) *'}
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                  required={!editId}
                  minLength={4}
                  maxLength={10}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  BikeDesk bruger-ID (valgfri)
                </label>
                <input
                  type="number"
                  value={form.bikedesk_user_id}
                  onChange={(e) => setForm((f) => ({ ...f, bikedesk_user_id: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-gray-200 text-gray-700 text-sm rounded-xl hover:bg-gray-50"
              >
                Annuller
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-gray-900 text-white text-sm rounded-xl hover:bg-gray-800 disabled:opacity-40 flex items-center gap-1.5"
              >
                {loading && <Loader2 size={13} className="animate-spin" />}
                {editId ? 'Gem ændringer' : 'Opret'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {mechanics.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-sm">Ingen mekanikere endnu</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-400 uppercase tracking-wide border-b border-gray-50">
                <th className="text-left px-4 py-3 font-medium">Navn</th>
                <th className="text-left px-4 py-3 font-medium">BikeDesk ID</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-right px-4 py-3 font-medium">Handling</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {mechanics.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-medium text-gray-900">{m.name}</td>
                  <td className="px-4 py-3 text-gray-500">{m.bikedesk_user_id ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${m.active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {m.active ? 'Aktiv' : 'Inaktiv'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(m)} className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100" title="Rediger">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => toggleActive(m)} className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100" title={m.active ? 'Deaktiver' : 'Aktiver'}>
                        {m.active ? <ToggleRight size={15} className="text-green-600" /> : <ToggleLeft size={15} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
