import { getBikedeskAuthHeaders, getBikedeskBaseUrl } from './bikedesk-config';
import type {
  BikedeskCustomer,
  BikedeskProduct,
  BikedeskTicket,
  BikedeskTicketMaterial,
  BikedeskTicketTemplate,
  BikedeskTicketTemplateMaterial,
  BikedeskTicketTemplateGroup,
  BikedeskUser,
} from '@/types';

const BASE_URL = getBikedeskBaseUrl();

type WrappedResponse<T> = { content?: T } | T;

function unwrapResponse<T>(payload: WrappedResponse<T>): T {
  if (payload && typeof payload === 'object' && 'content' in payload) {
    return (payload as { content?: T }).content as T;
  }
  return payload as T;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function getNestedValue(record: Record<string, unknown>, path: string[]): unknown {
  let current: unknown = record;

  for (const segment of path) {
    const currentRecord = asRecord(current);
    if (!currentRecord) {
      return undefined;
    }
    current = currentRecord[segment];
  }

  return current;
}

function firstDefinedValue(record: Record<string, unknown>, paths: string[][]): unknown {
  for (const path of paths) {
    const value = getNestedValue(record, path);
    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
  }

  return undefined;
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value.replace(',', '.').trim());
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function toInteger(value: unknown): number | null {
  const parsed = toFiniteNumber(value);
  return parsed === null ? null : Math.trunc(parsed);
}

function toTrimmedString(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  return null;
}

function extractObjectArray(payload: unknown): Record<string, unknown>[] {
  const unwrapped = unwrapResponse(payload as WrappedResponse<unknown>);

  if (Array.isArray(unwrapped)) {
    return unwrapped.filter((entry): entry is Record<string, unknown> => asRecord(entry) !== null);
  }

  const record = asRecord(unwrapped);
  if (!record) {
    return [];
  }

  const candidate = firstDefinedValue(record, [['content'], ['data'], ['items'], ['results']]);
  if (Array.isArray(candidate)) {
    return candidate.filter((entry): entry is Record<string, unknown> => asRecord(entry) !== null);
  }

  return [];
}

function normalizeProductRecord(raw: Record<string, unknown>): BikedeskProduct | null {
  const id = toInteger(firstDefinedValue(raw, [['id'], ['productid']]));
  const title = toTrimmedString(
    firstDefinedValue(raw, [['title'], ['name'], ['label'], ['product', 'title'], ['product', 'name']])
  );
  const productno = toTrimmedString(firstDefinedValue(raw, [['productno'], ['product_no'], ['itemno'], ['article_no']]));
  const price = toFiniteNumber(
    firstDefinedValue(raw, [
      ['price'],
      ['salesprice'],
      ['sales_price'],
      ['outprice'],
      ['salepricewithvat'],
      ['sale_price_with_vat'],
      ['recommendedretailprice'],
      ['recommended_retail_price'],
    ])
  );

  if (id === null || !title || !productno || price === null) {
    return null;
  }

  return {
    id,
    title,
    productno,
    price,
    pricewithoutvat: toFiniteNumber(firstDefinedValue(raw, [['pricewithoutvat'], ['price_without_vat']])),
    barcode: toTrimmedString(firstDefinedValue(raw, [['barcode']])),
    recommendedretailprice: toFiniteNumber(firstDefinedValue(raw, [['recommendedretailprice'], ['recommended_retail_price']])),
  };
}

function normalizeTicketMaterialRecord(raw: Record<string, unknown>): BikedeskTicketMaterial | null {
  const id = toInteger(firstDefinedValue(raw, [['id'], ['ticketmaterialid'], ['taskmaterialid']]));
  const amount = toFiniteNumber(firstDefinedValue(raw, [['amount'], ['quantity'], ['qty']]));

  if (id === null || amount === null) {
    return null;
  }

  return {
    id,
    taskid: toInteger(firstDefinedValue(raw, [['taskid'], ['ticketid'], ['ticket', 'id'], ['task', 'id']])) ?? undefined,
    ticketid: toInteger(firstDefinedValue(raw, [['ticketid'], ['taskid'], ['ticket', 'id'], ['task', 'id']])) ?? undefined,
    productid: toInteger(firstDefinedValue(raw, [['productid'], ['product', 'id']])) ?? undefined,
    productno: toTrimmedString(
      firstDefinedValue(raw, [
        ['productno'],
        ['product_no'],
        ['itemno'],
        ['article_no'],
        ['product', 'productno'],
        ['product', 'product_no'],
      ])
    ) ?? undefined,
    title: toTrimmedString(firstDefinedValue(raw, [['title'], ['product', 'title'], ['product', 'name']])) ?? undefined,
    amount,
    price: toFiniteNumber(firstDefinedValue(raw, [['price'], ['salesprice'], ['total_incl_vat'], ['totalinclvat']])),
    amountpaid: toFiniteNumber(firstDefinedValue(raw, [['amountpaid'], ['amount_paid']])) ?? undefined,
    product: asRecord(firstDefinedValue(raw, [['product']])) as Partial<BikedeskProduct> | null,
    raw,
  };
}

async function bdFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      ...getBikedeskAuthHeaders(),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Bikedesk ${options.method ?? 'GET'} ${path} fejlede: ${res.status} ${body}`);
  }

  const payload = (await res.json()) as WrappedResponse<T>;
  return unwrapResponse(payload);
}

// ---------------------------------------------------------------------------
// Customers
// ---------------------------------------------------------------------------

export async function getCustomer(customerId: number): Promise<BikedeskCustomer> {
  return bdFetch<BikedeskCustomer>(`/customers/${customerId}`);
}

// ---------------------------------------------------------------------------
// Tickets / Work orders
// ---------------------------------------------------------------------------

type BikedeskTicketRecord = BikedeskTicket & Record<string, unknown>;

export async function getTicket(ticketId: number | string): Promise<BikedeskTicketRecord> {
  return bdFetch<BikedeskTicketRecord>(`/tickets/${ticketId}`);
}

/**
 * BikeDesk tickets can be looked up by internal id OR by the visible card/work order number.
 * Mechanics typically know the visible number (autoincrementno / cardno).
 * We try numeric id first, then search by cardno.
 */
export async function findTicketByWorkOrderNumber(
  input: string
): Promise<BikedeskTicketRecord | null> {
  const trimmed = input.trim();

  // Try direct id lookup
  if (/^\d+$/.test(trimmed)) {
    try {
      return await getTicket(parseInt(trimmed, 10));
    } catch {
      // Fall through to search
    }
  }

  // Try fetching by cardno via search (if BikeDesk supports it)
  try {
    const results = await bdFetch<BikedeskTicketRecord[]>(
      `/tickets?cardno=${encodeURIComponent(trimmed)}`
    );
    if (Array.isArray(results) && results.length > 0) {
      return results[0];
    }
  } catch {
    // Fall through
  }

  return null;
}

export async function updateTicketTags(
  ticketId: number,
  ticket: BikedeskTicketRecord,
  tagidsToAdd: number[],
  tagidsToRemove: number[]
): Promise<void> {
  const current = (ticket.tagids as number[]) ?? [];
  const next = [...new Set([...current.filter((id) => !tagidsToRemove.includes(id)), ...tagidsToAdd])];

  await bdFetch<unknown>(`/tickets/${ticketId}`, {
    method: 'PUT',
    body: JSON.stringify({
      content: {
        ...ticket,
        tagids: next,
      },
    }),
  });
}

export async function attachTemplateToTicket(ticketId: number, templateId: number): Promise<void> {
  await bdFetch<unknown>(`/ticket/${ticketId}/templates`, {
    method: 'POST',
    body: JSON.stringify({ content: { templateid: templateId } }),
  });
}

// ---------------------------------------------------------------------------
// Products / Ticket materials
// ---------------------------------------------------------------------------

async function listProducts(path: string): Promise<BikedeskProduct[]> {
  const payload = await bdFetchRaw<unknown>(path);
  return extractObjectArray(payload)
    .map((entry) => normalizeProductRecord(entry))
    .filter((product): product is BikedeskProduct => product !== null);
}

export async function findProductByCode(productCode: string): Promise<BikedeskProduct | null> {
  const normalizedCode = normalizeSearchValue(productCode);
  const encoded = encodeURIComponent(productCode.trim());
  const attempts = [
    `/products?productno=${encoded}&paginationPageLength=25`,
    `/products?freetext=${encoded}&paginationPageLength=25`,
    `/products?search=${encoded}&paginationPageLength=25`,
  ];

  const seen = new Set<number>();
  const candidates: BikedeskProduct[] = [];

  for (const path of attempts) {
    try {
      const products = await listProducts(path);
      for (const product of products) {
        if (seen.has(product.id)) continue;
        seen.add(product.id);
        candidates.push(product);
      }
    } catch {
      // Try next query strategy.
    }
  }

  return (
    candidates.find((product) => normalizeSearchValue(product.productno) === normalizedCode) ??
    candidates.find((product) => normalizeSearchValue(product.title).includes(normalizedCode)) ??
    null
  );
}

export async function getTicketMaterials(ticketId: number): Promise<BikedeskTicketMaterial[]> {
  const payload = await bdFetchRaw<unknown>(
    `/tickets/materials?paginationPageLength=1000&withamountpaid=1&ticketid=${ticketId}`
  );

  return extractObjectArray(payload)
    .map((entry) => normalizeTicketMaterialRecord(entry))
    .filter((material): material is BikedeskTicketMaterial => material !== null);
}

type UpsertTicketMaterialInput = {
  ticketId: number;
  productId: number;
  productCode: string;
  title: string;
  amount: number;
  price?: number | null;
};

function buildTicketMaterialPayload(input: UpsertTicketMaterialInput) {
  return {
    content: {
      taskid: input.ticketId,
      ticketid: input.ticketId,
      productid: input.productId,
      productno: input.productCode,
      title: input.title,
      amount: input.amount,
      quantity: input.amount,
      ...(input.price !== undefined && input.price !== null ? { price: input.price } : {}),
    },
  };
}

export async function upsertTicketMaterial(input: UpsertTicketMaterialInput): Promise<void> {
  const normalizedCode = normalizeSearchValue(input.productCode);
  const existing = (await getTicketMaterials(input.ticketId)).find((material) => {
    const materialCode = material.productno ? normalizeSearchValue(material.productno) : null;
    return material.productid === input.productId || materialCode === normalizedCode;
  });

  if (existing) {
    await bdFetch<unknown>(`/tickets/materials/${existing.id}`, {
      method: 'PUT',
      body: JSON.stringify(buildTicketMaterialPayload(input)),
    });
    return;
  }

  await bdFetch<unknown>('/tickets/materials', {
    method: 'POST',
    body: JSON.stringify(buildTicketMaterialPayload(input)),
  });
}

export async function createTicketMaterial(input: UpsertTicketMaterialInput): Promise<void> {
  await bdFetch<unknown>('/tickets/materials', {
    method: 'POST',
    body: JSON.stringify(buildTicketMaterialPayload(input)),
  });
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

export async function getTicketTemplates(): Promise<BikedeskTicketTemplate[]> {
  return bdFetch<BikedeskTicketTemplate[]>('/ticket-templates');
}

export async function getTicketTemplateMaterials(
  templateId: number
): Promise<BikedeskTicketTemplateMaterial[]> {
  return bdFetch<BikedeskTicketTemplateMaterial[]>(`/ticket-templates/${templateId}/materials`);
}

export async function getTicketTemplateGroups(): Promise<BikedeskTicketTemplateGroup[]> {
  return bdFetch<BikedeskTicketTemplateGroup[]>('/ticket-templategroups');
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export async function getUsers(): Promise<BikedeskUser[]> {
  return bdFetch<BikedeskUser[]>('/users');
}

function normalizeSearchValue(value: string): string {
  return value
    .replace(/æ/gi, 'ae')
    .replace(/ø/gi, 'oe')
    .replace(/å/gi, 'aa')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/**
 * Finds the "Planlægningen" user in BikeDesk (same strategy as Booking project).
 * Used as a fallback comment author for SMS comments.
 */
export async function findPlannerUser(): Promise<BikedeskUser | null> {
  const users = await getUsers();
  const activeUsers = users.filter((u) => u.deleted !== 1);
  const exactMatch =
    activeUsers.find((u) => {
      const haystack = normalizeSearchValue(`${u.name ?? ''} ${u.username ?? ''}`.trim());
      return haystack === 'planlaegningen' || haystack === 'planlaegning';
    }) ?? null;

  if (exactMatch) return exactMatch;

  return (
    activeUsers.find((u) => {
      const haystack = normalizeSearchValue(`${u.name ?? ''} ${u.username ?? ''}`);
      return haystack.includes('planlaegning') || haystack.includes('planlaeg');
    }) ?? null
  );
}

// ---------------------------------------------------------------------------
// SMS
// ---------------------------------------------------------------------------

export type BikedeskSmsResponse = { batchid?: number };

export async function sendSms(data: {
  message: string;
  phone: string;
  customerid?: number;
  sync?: boolean;
}): Promise<BikedeskSmsResponse> {
  return bdFetch<BikedeskSmsResponse>('/sms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      content: {
        message: data.message,
        sendtime: null,
        template: 'SMSTemplateEmpty',
        items: [
          {
            content: {
              phone: data.phone,
              customerid: data.customerid,
            },
          },
        ],
        sync: data.sync ?? true,
      },
    }),
  });
}

export async function createTicketComment(data: {
  ticketId: number;
  smsLogId?: number;
  userId: number;
  comment?: string;
  autocomment?: string;
}): Promise<void> {
  await bdFetch<unknown>('/tickets/comments', {
    method: 'POST',
    body: JSON.stringify({
      content: {
        autocomment: data.autocomment ?? 'other',
        comment: data.comment ?? '',
        userid: data.userId,
        taskid: data.ticketId,
        ...(data.smsLogId && { smslogid: data.smsLogId }),
      },
    }),
  });
}

// ---------------------------------------------------------------------------
// SMS Log
// ---------------------------------------------------------------------------

export type BikedeskSmsLogEntry = {
  id: number;
  message?: string;
  gateway_status?: string | null;
  gateway_id?: number | string | null;
  error_status?: string | null;
};

export type BikedeskSmsLogBatch = {
  entries: BikedeskSmsLogEntry[];
  count: number;
  failedCount: number;
};

type BikedeskSmsLogBatchResponse = {
  content?: BikedeskSmsLogEntry[];
  count?: number;
  failed_count?: number;
};

async function bdFetchRaw<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      ...getBikedeskAuthHeaders(),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Bikedesk ${options.method ?? 'GET'} ${path} fejlede: ${res.status} ${body}`);
  }

  return (await res.json()) as T;
}

export async function getSmsLogBatch(batchId: number): Promise<BikedeskSmsLogBatch> {
  const payload = await bdFetchRaw<BikedeskSmsLogBatchResponse>(`/smslog/${batchId}`);
  return {
    entries: payload.content ?? [],
    count: payload.count ?? payload.content?.length ?? 0,
    failedCount: payload.failed_count ?? 0,
  };
}
