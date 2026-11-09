export type OrderStatus =
  | "awaiting_payment"
  | "preparing"
  | "ready_for_pickup"
  | "picked_up"
  | "cancelled"
  | "resolved";

export type OrderItemLifecycle = {
  id: string;
  perishability: "perishable" | "non_perishable" | null;
  line_status: "open" | "picked_up" | "cancelled" | "discarded";
  quantity_used: number;
  resolved_at: string | null;
};

export type OrderQuoteLine = {
  product_id: string;
  product_name: string;
  product_slug: string;
  quantity: number;
  selected_unit_price_brl: number;
  current_unit_price_brl: number;
  line_total_brl: number;
};

export type OrderQuote = {
  quote_id: string;
  reservation_id: string;
  items: OrderQuoteLine[];
  total_brl: number;
  subtotal_brl?: number;
  coupon?: {
    code: string;
    eligible_subtotal_brl: number;
    discount_brl: number;
    total_brl: number;
  } | null;
  price_changed: boolean;
  expires_at: string;
};

export type CreatedOrder = {
  id: string;
  reference: string;
  reservation_id: string;
  status: OrderStatus;
  total_brl: number;
  subtotal_brl?: number;
  discount_brl?: number;
  coupon_code?: string | null;
  items: OrderQuoteLine[];
  idempotent_replay?: boolean;
};
