'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const links = [
  { href: '/admin', label: 'Tilbud' },
  { href: '/admin/mechanics', label: 'Mekanikere' },
  { href: '/admin/templates', label: 'Skabeloner' },
  { href: '/admin/settings', label: 'Indstillinger' },
];

export default function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/admin/login');
  };

  return (
    <nav className="bg-white border-b border-gray-100 px-4">
      <div className="max-w-6xl mx-auto flex items-center justify-between h-14">
        <div className="flex items-center gap-1">
          <img
            src="https://b-bikes.dk/wp-content/uploads/Logo-Wide.svg"
            alt="B-Bikes"
            className="h-7 mr-4"
          />
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                pathname === l.href || (l.href !== '/admin' && pathname.startsWith(l.href))
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              {l.label}
            </Link>
          ))}
        </div>
        <button
          onClick={logout}
          className="text-sm text-gray-400 hover:text-gray-700"
        >
          Log ud
        </button>
      </div>
    </nav>
  );
}
