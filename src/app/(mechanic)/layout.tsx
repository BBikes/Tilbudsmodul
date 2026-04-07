import { redirect } from 'next/navigation';
import { validateMechanicSession } from '@/lib/session';

export default async function MechanicLayout({ children }: { children: React.ReactNode }) {
  const mechanic = await validateMechanicSession();
  if (!mechanic) {
    redirect('/login');
  }

  return <>{children}</>;
}
