import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createServiceClient } from '@/lib/supabase/server';
import { createMechanicSession, SESSION_COOKIE } from '@/lib/session';

export async function POST(req: Request) {
  try {
    const { code } = await req.json();
    if (!code || typeof code !== 'string') {
      return NextResponse.json({ success: false, error: 'Kode mangler' }, { status: 400 });
    }

    const supabase = await createServiceClient();
    const { data: mechanics } = await supabase
      .from('offer_mechanics')
      .select('id, name, code_hash, active')
      .eq('active', true);

    if (!mechanics || mechanics.length === 0) {
      return NextResponse.json({ success: false, error: 'Forkert kode' }, { status: 401 });
    }

    // Check code against all active mechanics
    let matched: { id: string; name: string } | null = null;
    for (const mechanic of mechanics) {
      const ok = await bcrypt.compare(code, mechanic.code_hash);
      if (ok) {
        matched = { id: mechanic.id, name: mechanic.name };
        break;
      }
    }

    if (!matched) {
      return NextResponse.json({ success: false, error: 'Forkert kode' }, { status: 401 });
    }

    const token = await createMechanicSession(matched.id);

    const res = NextResponse.json({ success: true, name: matched.name });
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 8 * 60 * 60, // 8 hours
    });

    return res;
  } catch (err) {
    console.error('[mechanic-login]', err);
    return NextResponse.json({ success: false, error: 'Serverfejl' }, { status: 500 });
  }
}
