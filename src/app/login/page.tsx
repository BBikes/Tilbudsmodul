'use client';

import Image from 'next/image';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function MechanicLoginPage() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/mechanic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error ?? 'Forkert kode');
        setCode('');
        inputRef.current?.focus();
        return;
      }

      router.push('/');
    } catch {
      setError('Noget gik galt. Prøv igen.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-xs bg-white rounded-2xl shadow-sm p-8">
        <Image
          src="https://b-bikes.dk/wp-content/uploads/Logo-Wide.svg"
          alt="B-Bikes"
          width={183}
          height={32}
          unoptimized
          className="h-8 w-auto mb-8"
        />

        <p className="text-sm font-medium text-gray-700 mb-1">Mekaniker login</p>
        <p className="text-xs text-gray-400 mb-6">Indtast din stempelkode</p>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm rounded-lg p-3 mb-4">{error}</div>
        )}

        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="0000"
            maxLength={10}
            required
            className="w-full border border-gray-200 rounded-xl px-4 py-4 text-2xl tracking-[0.5em] text-center focus:outline-none focus:ring-2 focus:ring-gray-900 mb-4"
          />
          <button
            type="submit"
            disabled={loading || !code}
            className="w-full py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            Log ind
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-gray-100 text-center">
          <Link href="/admin/login" className="text-xs text-gray-400 hover:text-gray-600">
            Admin login
          </Link>
        </div>
      </div>
    </div>
  );
}
