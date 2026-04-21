// ============================================
// Tilbudsmodul — Type Definitions
// ============================================

// --- Mechanic ---

export interface Mechanic {
  id: string;
  name: string;
  code_hash: string;
  bikedesk_user_id: number | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

// --- Offer Templates (synced from BikeDesk) ---

export interface OfferTemplate {
  id: number;
  bikedesk_template_id: number;
  title: string;
  price: number;
  group_id: number | null;
  group_name: string | null;
  active: boolean;
  position: number;
  synced_at: string | null;
}

// --- Offer ---

export type OfferStatus =
  | 'sent'
  | 'opened'
  | 'accepted'
  | 'accepted_partial'
  | 'rejected'
  | 'expired';

export type OfferMarker = 'red' | 'yellow' | 'green';

export interface OfferTemplateSnapshot {
  id: number;              // bikedesk_template_id
  title: string;
  price: number;
  marker: OfferMarker;
}

export interface OfferExtraWorkItemInput {
  title: string;
  bb15Quantity: number;
  marker: OfferMarker;
}

export interface OfferExtraWorkItemSnapshot {
  title: string;
  bb15_quantity: number;
  product_code: string;
  bikedesk_product_id: number | null;
  unit_price: number;
  total_price: number;
  marker?: OfferMarker;
}

export interface OfferImageSnapshot {
  url: string;
  filename: string;
}

export interface OfferResponsePayload {
  accepted_ids: number[];
  rejected_ids: number[];
  extra_work_item_accepted?: boolean;
}

export interface Offer {
  id: string;
  token: string;
  public_slug: string | null;
  work_order_id: string;
  mechanic_id: string | null;
  mechanic_name: string;
  bikedesk_customer_id: number | null;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  status: OfferStatus;
  sent_at: string;
  expires_at: string;
  opened_at: string | null;
  responded_at: string | null;
  templates_snapshot: OfferTemplateSnapshot[];
  extra_work_item_snapshot: OfferExtraWorkItemSnapshot | null;
  images_snapshot: OfferImageSnapshot[];
  total_amount: number | null;
  work_order_total: number | null;
  response_payload: OfferResponsePayload | null;
  bikedesk_sms_batch_id: number | null;
  bikedesk_comment_reference: string | null;
  resend_of: string | null;
  created_at: string;
  updated_at: string;
}

// --- Offer Settings ---

export interface OfferSettings {
  expiry_hours: number;
  expired_phone: string;
  expired_email: string;
  template_group_id: number | null;
  template_ticket_type: string | null;
  sms_template: string;
  tags_on_sent: number[];
  tags_on_accepted: number[];
  tags_on_rejected: number[];
  tags_remove_on_accepted: number[];
  tags_remove_on_rejected: number[];
}

export const DEFAULT_OFFER_SETTINGS: OfferSettings = {
  expiry_hours: 72,
  expired_phone: '',
  expired_email: '',
  template_group_id: null,
  template_ticket_type: null,
  sms_template: '',
  tags_on_sent: [],
  tags_on_accepted: [],
  tags_on_rejected: [],
  tags_remove_on_accepted: [],
  tags_remove_on_rejected: [],
};

// --- BikeDesk API Types (minimal set needed) ---

export interface BikedeskCustomer {
  id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
  zipcode: string;
  city: string;
}

export interface BikedeskTicket {
  id: number;
  number?: number;
  cardno?: string | null;
  autoincrementno?: number | null;
  customerid: number;
  description: string;
  type: string;
  status: string;
  startTime: string;
  pickup: string;
  storeid?: number;
  assignee?: number;
  tagids: number[];
  total: number;
}

export interface BikedeskTicketTemplate {
  id: number;
  label: string;
  groupid: number;
  position: number;
  price: number | undefined;
  raw_price?: number | null;
  computed_price?: number | null;
  note: string;
  duration: number;
}

export interface BikedeskTicketTemplateGroup {
  id: number;
  name: string;
  label?: string;
  position: number;
  tickettype: string;
  visible: boolean;
}

export interface BikedeskTicketTemplateMaterial {
  id: number;
  templateid?: number;
  amount: number;
  price: number;
  derivedprice?: number | null;
  amountpaid?: number;
}

export interface BikedeskProduct {
  id: number;
  title: string;
  productno: string;
  price: number;
  pricewithoutvat?: number | null;
  barcode?: string | null;
  recommendedretailprice?: number | null;
}

export interface BikedeskTicketMaterial {
  id: number;
  taskid?: number;
  ticketid?: number;
  productid?: number | null;
  productno?: string | null;
  title?: string | null;
  amount: number;
  price?: number | null;
  amountpaid?: number;
  product?: Partial<BikedeskProduct> | null;
  raw?: Record<string, unknown>;
}

export interface BikedeskUser {
  id: number;
  name?: string;
  username?: string;
  email?: string;
  deleted?: number;
}

// --- API Response helpers ---

export interface ApiResult<T = undefined> {
  success: boolean;
  data?: T;
  error?: string;
}
