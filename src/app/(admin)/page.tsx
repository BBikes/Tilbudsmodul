import { createServiceClient } from '@/lib/supabase/server';
import type { Offer } from '@/types';
import OffersClient from './OffersClient';

export default async function AdminOffersPage() {
  const supabase = await createServiceClient();

  const { data: offers } = await supabase
    .from('offers')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);

  return <OffersClient offers={(offers ?? []) as Offer[]} />;
}
