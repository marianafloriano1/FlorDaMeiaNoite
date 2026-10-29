import { NextResponse } from "next/server";
import { requireSameOrigin, requireSession } from "@/lib/auth/http";
import { parseOrderQuoteInput } from "@/lib/orders/validation";
import { getSupabaseServerClient } from "@/lib/supabase/server";

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
  if (!(await requireSameOrigin())) return json({ error: "forbidden" }, 403);
  const identity = await requireSession();
  if (identity?.role !== "customer") return json({ error: "authentication_required" }, 401);
  const input = parseOrderQuoteInput(await request.json().catch(() => null));
  if (!input) return json({ error: "invalid_order_quote" }, 400);
  try {
    const supabase = await getSupabaseServerClient();
    const { data, error } = await supabase.rpc("create_order_quote", {
      p_reservation_id: input.reservationId,
    });
    if (error) {
      if (error.message.includes("reservation_not_found"))
        return json({ error: "reservation_not_found" }, 404);
      if (error.message.includes("reservation_expired"))
        return json({ error: "reservation_expired" }, 409);
      if (error.message.includes("order_product_unavailable"))
        return json({ error: "product_unavailable" }, 409);
      return json({ error: "order_quote_unavailable" }, 503);
    }
    return json({ quote: data });
  } catch {
    return json({ error: "order_quote_unavailable" }, 503);
  }
}
