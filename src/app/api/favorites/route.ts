import { NextResponse } from "next/server";
import { requireSameOrigin, requireSession } from "@/lib/auth/http";
import { parseProductSlugInput } from "@/lib/cart/validation";
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
    const { data: favorites, error } = await supabase
      .from("favorites")
      .select("product_id")
      .eq("customer_id", identity.uid)
      .order("created_at", { ascending: false });
    if (error || !favorites) return json({ error: "favorites_unavailable" }, 503);
    const productIds = favorites.map((favorite) => favorite.product_id as string);
    const { data: products, error: productError } = productIds.length
      ? await supabase
          .from("public_catalog_products")
          .select("id,slug,name,price_brl")
          .in("id", productIds)
      : { data: [], error: null };
    if (productError || !products) return json({ error: "favorites_unavailable" }, 503);
    const byId = new Map(products.map((product) => [product.id, product]));
    return json({
      items: favorites.map((favorite) => ({
        productId: favorite.product_id,
        product: byId.get(favorite.product_id as string) ?? null,
      })),
    });
  } catch {
    return json({ error: "favorites_unavailable" }, 503);
  }
}

export async function POST(request: Request) {
  if (!(await requireSameOrigin())) return json({ error: "forbidden" }, 403);
  const identity = await requireSession();
  if (identity?.role !== "customer") return json({ error: "authentication_required" }, 401);
  const productSlug = parseProductSlugInput(await request.json().catch(() => null));
  if (!productSlug) return json({ error: "invalid_product" }, 400);

  try {
    const supabase = await getSupabaseServerClient();
    const { data: product, error: productError } = await supabase
      .from("public_catalog_products")
      .select("id")
      .eq("slug", productSlug)
      .maybeSingle();
    if (productError) return json({ error: "favorites_unavailable" }, 503);
    if (!product) return json({ error: "product_unavailable" }, 409);
    const { error } = await supabase
      .from("favorites")
      .upsert(
        { customer_id: identity.uid, product_id: product.id },
        { onConflict: "customer_id,product_id", ignoreDuplicates: true },
      );
    return error ? json({ error: "favorites_update_failed" }, 503) : json({ ok: true });
  } catch {
    return json({ error: "favorites_update_failed" }, 503);
  }
}

export async function DELETE(request: Request) {
  if (!(await requireSameOrigin())) return json({ error: "forbidden" }, 403);
  const identity = await requireSession();
  if (identity?.role !== "customer") return json({ error: "authentication_required" }, 401);
  const productSlug = parseProductSlugInput(await request.json().catch(() => null));
  if (!productSlug) return json({ error: "invalid_product" }, 400);

  try {
    const supabase = await getSupabaseServerClient();
    const { data: product, error: productError } = await supabase
      .from("public_catalog_products")
      .select("id")
      .eq("slug", productSlug)
      .maybeSingle();
    if (productError) return json({ error: "favorites_update_failed" }, 503);
    if (!product) return json({ ok: true });
    const { error } = await supabase
      .from("favorites")
      .delete()
      .eq("customer_id", identity.uid)
      .eq("product_id", product.id);
    return error ? json({ error: "favorites_update_failed" }, 503) : json({ ok: true });
  } catch {
    return json({ error: "favorites_update_failed" }, 503);
  }
}
