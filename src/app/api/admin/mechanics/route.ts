import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createClient, createServiceClient } from '@/lib/supabase/server';

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const allowed = (process.env.ADMIN_EMAILS ?? '').split(',').map((e) => e.trim()).filter(Boolean);
  if (allowed.length > 0 && !allowed.includes(user.email ?? '')) return null;
  return user;
}

export async function POST(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ success: false, error: 'Ikke autoriseret' }, { status: 401 });
  }

  const body = await req.json();
  const { name, code, bikedesk_user_id } = body;

  if (!name || !code) {
    return NextResponse.json({ success: false, error: 'Navn og kode er påkrævet' }, { status: 400 });
  }

  if (code.length < 4 || !/^\d+$/.test(code)) {
    return NextResponse.json({ success: false, error: 'Kode skal være mindst 4 cifre' }, { status: 400 });
  }

  const code_hash = await bcrypt.hash(code, 10);
  const supabase = await createServiceClient();

  await supabase.from('mechanics').insert({
    name,
    code_hash,
    bikedesk_user_id: bikedesk_user_id ?? null,
    active: true,
  });

  const { data: mechanics } = await supabase.from('mechanics').select('id, name, bikedesk_user_id, active, created_at, updated_at').order('name');
  return NextResponse.json({ success: true, mechanics: mechanics ?? [] });
}

export async function PUT(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ success: false, error: 'Ikke autoriseret' }, { status: 401 });
  }

  const body = await req.json();
  const { id, name, code, bikedesk_user_id, active } = body;

  if (!id) return NextResponse.json({ success: false, error: 'ID mangler' }, { status: 400 });

  const supabase = await createServiceClient();
  const patch: Record<string, unknown> = { name, updated_at: new Date().toISOString() };

  if (typeof active === 'boolean') patch.active = active;
  if (bikedesk_user_id !== undefined) patch.bikedesk_user_id = bikedesk_user_id;
  if (code) {
    if (code.length < 4 || !/^\d+$/.test(code)) {
      return NextResponse.json({ success: false, error: 'Kode skal være mindst 4 cifre' }, { status: 400 });
    }
    patch.code_hash = await bcrypt.hash(code, 10);
  }

  await supabase.from('mechanics').update(patch).eq('id', id);
  const { data: mechanics } = await supabase.from('mechanics').select('id, name, bikedesk_user_id, active, created_at, updated_at').order('name');
  return NextResponse.json({ success: true, mechanics: mechanics ?? [] });
}
