import { createServiceClient } from '@/lib/supabase/server';
import type { Mechanic } from '@/types';
import MechanicsClient from '@/app/(admin)/mechanics/MechanicsClient';

export default async function MechanicsPage() {
  const supabase = await createServiceClient();
  const { data: mechanics } = await supabase
    .from('offer_mechanics')
    .select('id, name, bikedesk_user_id, active, created_at, updated_at')
    .order('name');

  return <MechanicsClient mechanics={(mechanics ?? []) as Mechanic[]} />;
}