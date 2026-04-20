'use client';

import Image from 'next/image';
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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
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
      <header className="border-b border-gray-100 bg-white px-4">
        <div className="mx-auto flex h-14 max-w-xl items-center justify-between">
          <Image
            src="https://b-bikes.dk/wp-content/uploads/Logo-Wide.svg"
            alt="B-Bikes"
            width={160}
            height={28}
            unoptimized
            className="h-7 w-auto"
          />
          <div className="flex items-center gap-3">
            {mechanicName && <span className="text-sm text-gray-500">{mechanicName}</span>}
            <button
              onClick={handleLogout}
              className="p-1 text-gray-400 hover:text-gray-700"
              title="Log ud"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-xs">
          <h1 className="mb-1 text-xl font-bold text-gray-900">Opret tilbud</h1>
          <p className="mb-8 text-sm text-gray-400">Indtast sagsnummeret fra Bikedesk</p>

          {error && <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
              <input
                ref={inputRef}
                type="text"
                inputMode="numeric"
                value={workOrderId}
                onChange={(event) => setWorkOrderId(event.target.value)}
                placeholder="Sagsnummer"
                required
                className="w-full rounded-xl border border-gray-200 py-4 pl-10 pr-4 text-lg font-medium focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !workOrderId}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 py-4 text-base font-medium text-white hover:bg-gray-800 disabled:opacity-40"
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
