import { NextResponse } from "next/server";
import { requireSameOrigin, requireSession } from "@/lib/auth/http";
import { getOrCreateCustomerCart } from "@/lib/cart/service";
import { parseReservationInput } from "@/lib/cart/validation";
import { getSupabaseServerClient } from "@/lib/supabase/server";

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

export async function GET() {
  try {
    const identity = await requireSession();
    if (identity?.role !== "customer") return json({ error: "authentication_required" }, 401);
    const supabase = await getSupabaseServerClient();
    const { data: reservation, error } = await supabase
      .from("reservations")
      .select("id,status,expires_at,created_at")
      .eq("customer_id", identity.uid)
      .eq("status", "active")
      .maybeSingle();
    if (error) return json({ error: "reservation_unavailable" }, 503);
    if (!reservation) return json({ reservation: null });
    const { data: items, error: itemsError } = await supabase
      .from("reservation_items")
      .select("product_id,quantity")
      .eq("reservation_id", reservation.id);
    if (itemsError || !items) return json({ error: "reservation_unavailable" }, 503);
    return json({ reservation: { ...reservation, items } });
  } catch {
    return json({ error: "reservation_unavailable" }, 503);
  }
}

export async function POST(request: Request) {
  if (!(await requireSameOrigin())) return json({ error: "forbidden" }, 403);
  const identity = await requireSession();
  if (identity?.role !== "customer") return json({ error: "authentication_required" }, 401);
  const input = parseReservationInput(await request.json().catch(() => null));
  if (!input) return json({ error: "invalid_reservation_request" }, 400);

  try {
    const supabase = await getSupabaseServerClient();
    const cartId = await getOrCreateCustomerCart(supabase, identity.uid);
    const { data, error } = await supabase.rpc("create_cart_reservation", {
      p_cart_id: cartId,
      p_selected_product_ids: input.productIds,
      p_idempotency_key: input.idempotencyKey,
    });
    if (error) {
      if (error.message.includes("active_reservation_exists"))
        return json({ error: "active_reservation_exists" }, 409);
      if (error.message.includes("product_unavailable"))
        return json({ error: "product_unavailable" }, 409);
      if (
        error.message.includes("invalid_cart_selection") ||
        error.message.includes("duplicate_selected_product") ||
        error.message.includes("invalid_reservation_request")
      )
        return json({ error: "invalid_reservation_request" }, 400);
      if (error.message.includes("cart_not_found")) return json({ error: "cart_not_found" }, 404);
      return json({ error: "reservation_unavailable" }, 503);
    }
    const reservation = data as { id: string; status: string; expires_at: string };
    if (reservation.status !== "active")
      return json({ error: "reservation_request_already_closed" }, 409);
    return json({ reservation }, 201);
  } catch {
    return json({ error: "reservation_unavailable" }, 503);
  }
}
