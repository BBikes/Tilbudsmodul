import { NextResponse } from 'next/server';
import { findTicketByWorkOrderNumber, getCustomer } from '@/lib/bikedesk';
import { validateMechanicSession } from '@/lib/session';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const mechanic = await validateMechanicSession();
  if (!mechanic) {
    return NextResponse.json({ success: false, error: 'Ikke logget ind' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const ticket = await findTicketByWorkOrderNumber(id);
    if (!ticket) {
      return NextResponse.json({ success: false, error: 'Sag ikke fundet' }, { status: 404 });
    }

    const customer = await getCustomer(ticket.customerid as number);

    return NextResponse.json({ success: true, ticket, customer });
  } catch (err) {
    console.error('[workorder]', err);
    return NextResponse.json({ success: false, error: 'Kunne ikke hente sag' }, { status: 500 });
  }
}
