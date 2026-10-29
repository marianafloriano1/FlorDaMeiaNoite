import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/http";
import { parseUuid } from "@/lib/orders/validation";
import { getSupabaseServerClient } from "@/lib/supabase/server";

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

export async function GET(_request: Request, context: { params: Promise<{ reference: string }> }) {
  const identity = await requireSession();
  if (identity?.role !== "customer") return json({ error: "authentication_required" }, 401);
  const reference = parseUuid((await context.params).reference);
  if (!reference) return json({ error: "order_not_found" }, 404);
  try {
    const supabase = await getSupabaseServerClient();
    const { data: order, error } = await supabase
      .from("orders")
      .select(
        "id,public_reference,status,total_brl,payment_confirmed_at,preparation_window_start,preparation_window_end,cancellation_reason,created_at",
      )
      .eq("public_reference", reference)
      .maybeSingle();
    if (error || !order) return json({ error: "order_not_found" }, 404);
    const [items, events] = await Promise.all([
      supabase
        .from("order_items")
        .select("product_id,product_name,product_slug,quantity,unit_price_brl")
        .eq("order_id", order.id),
      supabase
        .from("order_events")
        .select("id,event_type,from_status,to_status,event_data,created_at")
        .eq("order_id", order.id)
        .order("created_at"),
    ]);
    if (items.error || events.error) return json({ error: "order_unavailable" }, 503);
    return json({
      order,
      items: items.data ?? [],
      events: events.data ?? [],
      cancellationPolicyText: process.env.ORDER_CANCELLATION_POLICY_TEXT?.trim() || null,
    });
  } catch {
    return json({ error: "order_unavailable" }, 503);
  }
}
