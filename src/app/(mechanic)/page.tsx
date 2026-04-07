import { validateMechanicSession } from '@/lib/session';
import WorkOrderEntryClient from './WorkOrderEntryClient';

export default async function MechanicHomePage() {
  const mechanic = await validateMechanicSession();

  return <WorkOrderEntryClient mechanicName={mechanic?.name ?? ''} />;
}
