import { NextResponse } from 'next/server';
import { deleteMechanicSession, SESSION_COOKIE } from '@/lib/session';

export async function POST() {
  try {
    await deleteMechanicSession();
  } catch {
    // Ignore errors on logout
  }

  const res = NextResponse.json({ success: true });
  res.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });

  return res;
}
