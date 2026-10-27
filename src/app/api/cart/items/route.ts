import { NextResponse } from "next/server";
import { requireSameOrigin, requireSession } from "@/lib/auth/http";
import { getOrCreateCustomerCart } from "@/lib/cart/service";
import { parseCartItemInput, parseProductIdInput } from "@/lib/cart/validation";
import { getSupabaseServerClient } from "@/lib/supabase/server";

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

export async function PUT(request: Request) {
  if (!(await requireSameOrigin())) return json({ error: "forbidden" }, 403);
  const identity = await requireSession();
  if (identity?.role !== "customer") return json({ error: "authentication_required" }, 401);
  const input = parseCartItemInput(await request.json().catch(() => null));
  if (!input) return json({ error: "invalid_cart_item" }, 400);

  try {
    const supabase = await getSupabaseServerClient();
    const { data: product, error: productError } = await supabase
      .from("public_catalog_products")
      .select("id")
      .eq("slug", input.productSlug)
      .maybeSingle();
    if (productError) return json({ error: "cart_unavailable" }, 503);
    if (!product) return json({ error: "product_unavailable" }, 409);
    const cartId = await getOrCreateCustomerCart(supabase, identity.uid);
    const { error } = await supabase
      .from("cart_items")
      .upsert(
        { cart_id: cartId, product_id: product.id, quantity: input.quantity },
        { onConflict: "cart_id,product_id" },
      );
    return error ? json({ error: "cart_update_failed" }, 503) : json({ ok: true });
  } catch {
    return json({ error: "cart_update_failed" }, 503);
  }
}

export async function DELETE(request: Request) {
  if (!(await requireSameOrigin())) return json({ error: "forbidden" }, 403);
  const identity = await requireSession();
  if (identity?.role !== "customer") return json({ error: "authentication_required" }, 401);
  const productId = parseProductIdInput(await request.json().catch(() => null));
  if (!productId) return json({ error: "invalid_cart_item" }, 400);

  try {
    const supabase = await getSupabaseServerClient();
    const cartId = await getOrCreateCustomerCart(supabase, identity.uid);
    const { error } = await supabase
      .from("cart_items")
      .delete()
      .eq("cart_id", cartId)
      .eq("product_id", productId);
    return error ? json({ error: "cart_update_failed" }, 503) : json({ ok: true });
  } catch {
    return json({ error: "cart_update_failed" }, 503);
  }
}
