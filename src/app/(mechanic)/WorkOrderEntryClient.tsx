'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Search, LogOut } from 'lucide-react';

export default function WorkOrderEntryClient({ mechanicName }: { mechanicName: string }) {
  const [workOrderId, setWorkOrderId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workOrderId.trim()) return;
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`/api/workorder/${encodeURIComponent(workOrderId.trim())}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error ?? 'Sag ikke fundet');
        setLoading(false);
        return;
      }

      router.push(`/send?workorder=${encodeURIComponent(workOrderId.trim())}`);
    } catch {
      setError('Noget gik galt. Prøv igen.');
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/mechanic/logout', { method: 'POST' });
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-100 px-4">
        <div className="max-w-xl mx-auto flex items-center justify-between h-14">
          <img
            src="https://b-bikes.dk/wp-content/uploads/Logo-Wide.svg"
            alt="B-Bikes"
            className="h-7"
          />
          <div className="flex items-center gap-3">
            {mechanicName && (
              <span className="text-sm text-gray-500">{mechanicName}</span>
            )}
            <button
              onClick={handleLogout}
              className="text-gray-400 hover:text-gray-700 p-1"
              title="Log ud"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-xs">
          <h1 className="text-xl font-bold text-gray-900 mb-1">Opret tilbud</h1>
          <p className="text-sm text-gray-400 mb-8">Indtast sagsnummeret fra Bikedesk</p>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm rounded-xl p-3 mb-4">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
              <input
                ref={inputRef}
                type="text"
                inputMode="numeric"
                value={workOrderId}
                onChange={(e) => setWorkOrderId(e.target.value)}
                placeholder="Sagsnummer"
                required
                className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-4 text-lg font-medium focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !workOrderId}
              className="w-full py-4 bg-gray-900 text-white rounded-xl font-medium text-base hover:bg-gray-800 disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              Hent sag
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
