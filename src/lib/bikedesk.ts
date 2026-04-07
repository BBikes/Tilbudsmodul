import { getBikedeskAuthHeaders, getBikedeskBaseUrl } from './bikedesk-config';
import type {
  BikedeskCustomer,
  BikedeskTicket,
  BikedeskTicketTemplate,
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
        id: ticket.id,
        customerid: ticket.customerid,
        description: ticket.description,
        type: ticket.type,
        status: ticket.status,
        startTime: ticket.startTime,
        pickup: ticket.pickup,
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
// Templates
// ---------------------------------------------------------------------------

export async function getTicketTemplates(): Promise<BikedeskTicketTemplate[]> {
  return bdFetch<BikedeskTicketTemplate[]>('/ticket-templates');
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

export async function createTicketSmsComment(data: {
  ticketId: number;
  smsLogId: number;
  userId: number;
  comment?: string;
  autocomment?: string;
}): Promise<void> {
  await bdFetch<unknown>('/tickets/comments', {
    method: 'POST',
    body: JSON.stringify({
      content: {
        autocomment: data.autocomment ?? 'sms_other',
        comment: data.comment ?? '',
        userid: data.userId,
        taskid: data.ticketId,
        smslogid: data.smsLogId,
      },
    }),
  });
}
