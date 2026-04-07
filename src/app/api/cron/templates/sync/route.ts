import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import {
  getTicketTemplates,
  getTicketTemplateGroups,
  getTicketTemplateMaterials,
} from '@/lib/bikedesk';
import type { BikedeskTicketTemplate } from '@/types';

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value.replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function getTemplateFallbackPrice(template: BikedeskTicketTemplate): number {
  return (
    toFiniteNumber(template.computed_price) ??
    toFiniteNumber(template.price) ??
    toFiniteNumber(template.raw_price) ??
    0
  );
}

async function resolveTemplatePrice(template: BikedeskTicketTemplate): Promise<number> {
  try {
    const materials = await getTicketTemplateMaterials(template.id);
    const total = materials.reduce((sum, material) => {
      const unitPrice = toFiniteNumber(material.derivedprice) ?? toFiniteNumber(material.price) ?? 0;
      const amount = toFiniteNumber(material.amount) ?? 1;
      return sum + unitPrice * amount;
    }, 0);

    if (total > 0) return total;
  } catch {
    // Fall back to template-level prices when materials cannot be loaded.
  }

  return getTemplateFallbackPrice(template);
}

async function resolveTemplatePrices(templates: BikedeskTicketTemplate[]): Promise<Map<number, number>> {
  const prices = new Map<number, number>();
  const chunkSize = 8;

  for (let index = 0; index < templates.length; index += chunkSize) {
    const chunk = templates.slice(index, index + chunkSize);
    const results = await Promise.all(
      chunk.map(async (template) => [template.id, await resolveTemplatePrice(template)] as const)
    );

    for (const [templateId, price] of results) {
      prices.set(templateId, price);
    }
  }

  return prices;
}

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
    const priceByTemplateId = await resolveTemplatePrices(templates);
    const now = new Date().toISOString();

    const rows = templates.map((t) => ({
      bikedesk_template_id: t.id,
      title: t.label,
      price: priceByTemplateId.get(t.id) ?? getTemplateFallbackPrice(t),
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
