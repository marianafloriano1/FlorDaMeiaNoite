import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/http";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

export async function GET() {
  const identity = await requireSession();
  if (identity?.role !== "employee" && identity?.role !== "admin")
    return json({ error: "forbidden" }, 403);
  try {
    const admin = getSupabaseAdminClient();
    const { data: orders, error } = await admin
      .from("orders")
      .select(
        "id,public_reference,customer_id,reservation_id,status,total_brl,payment_confirmed_at,preparation_window_start,preparation_window_end,cancellation_reason,created_at",
      )
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) return json({ error: "admin_orders_unavailable" }, 503);
    const ids = (orders ?? []).map((order) => order.id);
    const [items, inspections] = ids.length
      ? await Promise.all([
          admin
            .from("order_items")
            .select("order_id,product_id,product_name,product_slug,quantity,unit_price_brl")
            .in("order_id", ids),
          admin
            .from("order_inspections")
            .select("order_id,items_confirmed,inspected_by,inspected_at,approved_by,approved_at")
            .in("order_id", ids),
        ])
      : [
          { data: [], error: null },
          { data: [], error: null },
        ];
    if (items.error || inspections.error) return json({ error: "admin_orders_unavailable" }, 503);
    return json({
      orders: (orders ?? []).map((order) => ({
        ...order,
        items: (items.data ?? []).filter((item) => item.order_id === order.id),
        inspection:
          (inspections.data ?? []).find((inspection) => inspection.order_id === order.id) ?? null,
      })),
    });
  } catch {
    return json({ error: "admin_orders_unavailable" }, 503);
  }
}
