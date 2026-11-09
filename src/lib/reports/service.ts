import "server-only";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { aggregateOperationsReport } from "./aggregate";
import type { OperationsReport, ReportFilters } from "./types";

const PAGE_SIZE = 1000;
const MAX_ROWS = 20_000;

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
  line_status: string;
};
type OrderEventRow = {
  order_id: string;
  event_type: string;
  event_data: Record<string, unknown> | null;
};
type CartEventRow = { event_type: string; quantity_delta: number | null };
type ProductRow = { id: string; name: string };

async function readPages<T>(
  load: (
    from: number,
    to: number,
  ) => PromiseLike<{
    data: T[] | null;
    error: { message?: string } | null;
  }>,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; from <= MAX_ROWS; from += PAGE_SIZE) {
    const { data, error } = await load(from, Math.min(from + PAGE_SIZE - 1, MAX_ROWS));
    if (error) throw new Error("report_query_failed");
    const page = data ?? [];
    rows.push(...page);
    if (rows.length > MAX_ROWS) throw new Error("report_range_too_large");
    if (page.length < PAGE_SIZE) return rows;
  }
  return rows;
}

export async function getOperationsReport(filters: ReportFilters): Promise<OperationsReport> {
  const admin = getSupabaseAdminClient();
  const dateColumn = filters.basis === "created" ? "created_at" : "payment_confirmed_at";
  const orders = await readPages<OrderRow>((from, to) =>
    admin
      .from("orders")
      .select("id,status,total_brl,created_at,payment_confirmed_at")
      .not("payment_confirmed_at", "is", null)
      .gte(dateColumn, filters.startAt)
      .lt(dateColumn, filters.endAt)
      .order(dateColumn, { ascending: true })
      .order("id", { ascending: true })
      .range(from, to),
  );
  const ids = orders.map((order) => order.id);
  const items: ItemRow[] = [];
  const orderEvents: OrderEventRow[] = [];
  for (let index = 0; index < ids.length; index += 250) {
    const batch = ids.slice(index, index + 250);
    const [itemRows, eventRows] = await Promise.all([
      readPages<ItemRow>((from, to) =>
        admin
          .from("order_items")
          .select("id,order_id,product_id,product_name,quantity,line_status")
          .in("order_id", batch)
          .order("id", { ascending: true })
          .range(from, to),
      ),
      readPages<OrderEventRow>((from, to) =>
        admin
          .from("order_events")
          .select("order_id,event_type,event_data")
          .in("order_id", batch)
          .in("event_type", ["cancelled", "item_cancelled"])
          .order("id", { ascending: true })
          .range(from, to),
      ),
    ]);
    items.push(...itemRows);
    orderEvents.push(...eventRows);
  }
  const cartEvents = await readPages<CartEventRow>((from, to) =>
    admin
      .from("cart_events")
      .select("event_type,quantity_delta")
      .gte("created_at", filters.startAt)
      .lt("created_at", filters.endAt)
      .order("id", { ascending: true })
      .range(from, to),
  );
  const products = await readPages<ProductRow>((from, to) =>
    admin
      .from("catalog_products")
      .select("id,name")
      .eq("status", "published")
      .order("id")
      .range(from, to),
  );
  return aggregateOperationsReport(filters, orders, items, cartEvents, orderEvents, products);
}
