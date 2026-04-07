import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import type { OfferSettings } from '@/types';

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const allowed = (process.env.ADMIN_EMAILS ?? '').split(',').map((e) => e.trim()).filter(Boolean);
  if (allowed.length > 0 && !allowed.includes(user.email ?? '')) return null;
  return user;
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ success: false, error: 'Ikke autoriseret' }, { status: 401 });
  }

  const supabase = await createServiceClient();
  const { data } = await supabase.from('system_settings').select('value').eq('key', 'offer_settings').single();
  return NextResponse.json({ success: true, settings: data?.value ?? null });
}

export async function POST(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ success: false, error: 'Ikke autoriseret' }, { status: 401 });
  }

  const settings: OfferSettings = await req.json();
  const supabase = await createServiceClient();

  await supabase.from('system_settings').upsert({
    key: 'offer_settings',
    value: settings,
    updated_at: new Date().toISOString(),
  });

  return NextResponse.json({ success: true });
}
