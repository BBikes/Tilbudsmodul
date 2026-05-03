import { createHash, randomUUID } from 'crypto';
import { createServiceClient } from './supabase/server';
import { cookies } from 'next/headers';
import type { Mechanic } from '@/types';

const COOKIE_NAME = 'mechanic_session';
const SESSION_HOURS = 8;

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function createMechanicSession(mechanicId: string): Promise<string> {
  const token = randomUUID();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_HOURS * 60 * 60 * 1000).toISOString();

  const supabase = await createServiceClient();
  const { error } = await supabase.from('mechanic_sessions').insert({
    mechanic_id: mechanicId,
    token_hash: tokenHash,
    expires_at: expiresAt,
  });

  if (error) throw new Error(`Kunne ikke oprette session: ${error.message}`);

  return token;
}

export async function validateMechanicSession(): Promise<Mechanic | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const tokenHash = hashToken(token);
  const supabase = await createServiceClient();

  const { data: session } = await supabase
    .from('mechanic_sessions')
    .select('mechanic_id, expires_at')
    .eq('token_hash', tokenHash)
    .single();

  if (!session) return null;
  if (new Date(session.expires_at) < new Date()) return null;

  const { data: mechanic } = await supabase
    .from('offer_mechanics')
    .select('*')
    .eq('id', session.mechanic_id)
    .eq('active', true)
    .single();

  return mechanic ?? null;
}

export async function deleteMechanicSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return;

  const tokenHash = hashToken(token);
  const supabase = await createServiceClient();
  await supabase.from('mechanic_sessions').delete().eq('token_hash', tokenHash);
}

export const SESSION_COOKIE = COOKIE_NAME;
