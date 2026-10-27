import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/http";
import { getOrCreateCustomerCart } from "@/lib/cart/service";
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
    const cartId = await getOrCreateCustomerCart(supabase, identity.uid);
    const { data: lines, error } = await supabase
      .from("cart_items")
      .select("product_id,quantity")
      .eq("cart_id", cartId)
      .order("created_at", { ascending: true });
    if (error || !lines) return json({ error: "cart_unavailable" }, 503);

    const productIds = lines.map((line) => line.product_id as string);
    const { data: products, error: productError } = productIds.length
      ? await supabase
          .from("public_catalog_products")
          .select("id,slug,name,price_brl")
          .in("id", productIds)
      : { data: [], error: null };
    if (productError || !products) return json({ error: "cart_unavailable" }, 503);

    const byId = new Map(products.map((product) => [product.id, product]));
    return json({
      cartId,
      items: lines.map((line) => ({
        productId: line.product_id,
        quantity: line.quantity,
        product: byId.get(line.product_id as string) ?? null,
      })),
    });
  } catch {
    return json({ error: "cart_unavailable" }, 503);
  }
}
