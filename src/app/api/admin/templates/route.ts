import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const allowed = (process.env.ADMIN_EMAILS ?? '').split(',').map((e) => e.trim()).filter(Boolean);
  if (allowed.length > 0 && !allowed.includes(user.email ?? '')) return null;
  return user;
}

export async function PUT(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ success: false, error: 'Ikke autoriseret' }, { status: 401 });
  }

  const body = await req.json();
  const { id, active } = body;
  if (!id) return NextResponse.json({ success: false, error: 'ID mangler' }, { status: 400 });

  const supabase = await createServiceClient();
  await supabase.from('offer_templates').update({ active }).eq('id', id);

  return NextResponse.json({ success: true });
}
