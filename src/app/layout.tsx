import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'B-Bikes Tilbudsmodul',
  description: 'Internt tilbudsmodul for mekanikere',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="da" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-gray-50">{children}</body>
    </html>
  );
}
