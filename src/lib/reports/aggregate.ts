import type { OperationsReport, ReportFilters } from "./types";

type OrderRow = {
  id: string;
  status: string;
  total_brl: string | number;
  created_at: string;
  payment_confirmed_at: string | null;
};
type ItemRow = {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
};
type EventRow = { event_type: string; quantity_delta: number | null };
type OrderEventRow = {
  order_id: string;
  event_type: string;
  event_data: Record<string, unknown> | null;
};
type ProductRow = { id: string; name: string };

export function aggregateOperationsReport(
  filters: ReportFilters,
  orders: OrderRow[],
  items: ItemRow[],
  cartEvents: EventRow[],
  orderEvents: OrderEventRow[],
  catalogProducts: ProductRow[],
): OperationsReport {
  const eligible = orders.filter((order) => Boolean(order.payment_confirmed_at));
  const cents = eligible.reduce((sum, order) => sum + Math.round(Number(order.total_brl) * 100), 0);
  const cancelled = new Set<string>();
  const fullyCancelled = new Set(
    eligible.filter((order) => order.status === "cancelled").map((order) => order.id),
  );
  for (const orderId of fullyCancelled) cancelled.add(orderId);
  for (const event of orderEvents) {
    if (event.event_type === "cancelled" || event.event_type === "item_cancelled")
      cancelled.add(event.order_id);
  }

  const returnedByItem = new Map<string, number>();
  for (const event of orderEvents) {
    if (event.event_type !== "item_cancelled" || !event.event_data) continue;
    const itemId = event.event_data.order_item_id;
    const returned = Number(event.event_data.quantity_returned ?? 0);
    if (typeof itemId === "string" && Number.isFinite(returned) && returned > 0)
      returnedByItem.set(itemId, (returnedByItem.get(itemId) ?? 0) + returned);
  }

  const orderMap = new Map(eligible.map((order) => [order.id, order]));
  const byProduct = new Map(
    catalogProducts.map((product) => [product.id, { productName: product.name, units: 0 }]),
  );
  for (const item of items) {
    if (!orderMap.has(item.order_id) || fullyCancelled.has(item.order_id)) continue;
    const returned = returnedByItem.get(item.id) ?? 0;
    const units = Math.max(0, item.quantity - returned);
    const current = byProduct.get(item.product_id) ?? { productName: item.product_name, units: 0 };
    current.units += units;
    byProduct.set(item.product_id, current);
  }

  const products = [...byProduct.values()]
    .map((product) => ({ productName: product.productName, unitsSold: product.units }))
    .sort(
      (a, b) => b.unitsSold - a.unitsSold || a.productName.localeCompare(b.productName, "pt-BR"),
    );

  const cartItemEvents = cartEvents.filter((event) => event.event_type === "cart_item_added");
  return {
    filters: {
      period: filters.period,
      basis: filters.basis,
      anchor: filters.anchor,
      startAt: filters.startAt,
      endAt: filters.endAt,
    },
    paidOrderCount: eligible.length,
    revenueBrl: cents / 100,
    postPaymentCancelledOrderCount: cancelled.size,
    products,
    cartItemAddedEvents: cartItemEvents.length,
    cartUnitsAdded: cartItemEvents.reduce((sum, event) => sum + (event.quantity_delta ?? 0), 0),
    favoriteAddedEvents: cartEvents.filter((event) => event.event_type === "favorite_added").length,
  };
}
