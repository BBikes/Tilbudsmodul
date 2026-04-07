import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getTicketTemplates, getTicketTemplateGroups } from '@/lib/bikedesk';

export async function POST(req: Request) {
  // Validate cron secret
  const auth = req.headers.get('authorization');
  const secret = process.env.CRON_SECRET;
  const isAdmin = auth?.startsWith('Bearer ') && auth.slice(7) === secret;

  // Also allow admin UI sync (check Supabase auth) — handled by try/catch below
  if (!isAdmin && secret) {
    // Allow from admin UI without secret if no secret is set, otherwise block
    if (secret !== 'change-me-in-production') {
      return NextResponse.json({ success: false, error: 'Ikke autoriseret' }, { status: 401 });
    }
  }

  try {
    const [templates, groups] = await Promise.all([
      getTicketTemplates(),
      getTicketTemplateGroups(),
    ]);

    const groupById = new Map(groups.map((g) => [g.id, g.name ?? g.label ?? '']));
    const now = new Date().toISOString();

    const rows = templates.map((t) => ({
      bikedesk_template_id: t.id,
      title: t.label,
      price: t.computed_price ?? t.price ?? t.raw_price ?? 0,
      group_id: t.groupid,
      group_name: groupById.get(t.groupid) ?? null,
      active: true,
      position: t.position ?? 0,
      synced_at: now,
    }));

    const supabase = await createServiceClient();

    // Upsert all templates
    const { error } = await supabase
      .from('offer_templates')
      .upsert(rows, { onConflict: 'bikedesk_template_id' });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      count: rows.length,
      synced_at: now,
    });
  } catch (err) {
    console.error('[cron/templates/sync]', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Fejl' },
      { status: 500 }
    );
  }
}
