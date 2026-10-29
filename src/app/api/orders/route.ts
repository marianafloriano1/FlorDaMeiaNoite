import { NextResponse } from "next/server";
import { requireSameOrigin, requireSession } from "@/lib/auth/http";
import type { CreatedOrder } from "@/lib/orders/types";
import { parseCreateOrderInput } from "@/lib/orders/validation";
import { buildWhatsAppOrderLink } from "@/lib/orders/whatsapp";
import { getSupabaseServerClient } from "@/lib/supabase/server";

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

export async function GET() {
  const identity = await requireSession();
  if (identity?.role !== "customer") return json({ error: "authentication_required" }, 401);
  try {
    const supabase = await getSupabaseServerClient();
    const { data, error } = await supabase
      .from("orders")
      .select(
        "id,public_reference,reservation_id,status,total_brl,payment_confirmed_at,preparation_window_start,preparation_window_end,cancellation_reason,created_at,order_items(product_name,product_slug,quantity,unit_price_brl)",
      )
      .eq("customer_id", identity.uid)
      .order("created_at", { ascending: false });
    if (error) return json({ error: "orders_unavailable" }, 503);
    return json({
      orders: (data ?? []).map((order) => ({
        ...order,
        reference: order.public_reference,
      })),
    });
  } catch {
    return json({ error: "orders_unavailable" }, 503);
  }
}

export async function POST(request: Request) {
  if (!(await requireSameOrigin())) return json({ error: "forbidden" }, 403);
  const identity = await requireSession();
  if (identity?.role !== "customer") return json({ error: "authentication_required" }, 401);
  const input = parseCreateOrderInput(await request.json().catch(() => null));
  if (!input) return json({ error: "invalid_order_request" }, 400);
  const phone = process.env.WHATSAPP_STORE_NUMBER;
  if (!phone || !/^\+[1-9]\d{7,14}$/.test(phone))
    return json({ error: "whatsapp_not_configured" }, 503);
  try {
    const supabase = await getSupabaseServerClient();
    const { data, error } = await supabase.rpc("create_order_from_quote", {
      p_quote_id: input.quoteId,
      p_idempotency_key: input.idempotencyKey,
      p_consent: input.consent,
    });
    if (error) {
      if (error.message.includes("order_quote_changed"))
        return json({ error: "order_quote_changed" }, 409);
      if (error.message.includes("reservation_expired"))
        return json({ error: "reservation_expired" }, 409);
      if (error.message.includes("order_quote_expired"))
        return json({ error: "order_quote_expired" }, 409);
      if (error.message.includes("order_idempotency_key_reused"))
        return json({ error: "idempotency_key_reused" }, 409);
      return json({ error: "order_create_failed" }, 503);
    }
    const order = data as CreatedOrder;
    const whatsappUrl = buildWhatsAppOrderLink(order, new URL(request.url).origin);
    if (!whatsappUrl) return json({ error: "whatsapp_not_configured" }, 503);
    return json({ order, whatsappUrl }, order.idempotent_replay ? 200 : 201);
  } catch {
    return json({ error: "order_create_failed" }, 503);
  }
}
