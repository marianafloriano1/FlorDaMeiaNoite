import { NextResponse } from "next/server";
import { authorizeCatalogOperator } from "@/lib/catalog/admin-authorization";
import { updateCatalogProduct } from "@/lib/catalog/admin-service";
import { parseCatalogProductInput } from "@/lib/catalog/admin-validation";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type Context = { params: Promise<{ productId: string }> };
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const productColumns =
  "id,slug,name,product_type,description,colors,price_brl,category_name,stock_quantity,occasion,size,materials,care_instructions,flower_meaning,pet_toxicity,shelf_life,content_version,status,created_at,updated_at";

export async function GET(_request: Request, context: Context) {
  const authorization = await authorizeCatalogOperator();
  if (!authorization.ok)
    return NextResponse.json({ error: authorization.error }, { status: authorization.status });
  const { productId } = await context.params;
  if (!uuidPattern.test(productId))
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  const { data, error } = await getSupabaseAdminClient()
    .from("catalog_products")
    .select(productColumns)
    .eq("id", productId)
    .maybeSingle();
  if (error) return NextResponse.json({ error: "catalog_admin_read_failed" }, { status: 503 });
  if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ product: data });
}

export async function PATCH(request: Request, context: Context) {
  const authorization = await authorizeCatalogOperator(true);
  if (!authorization.ok)
    return NextResponse.json({ error: authorization.error }, { status: authorization.status });
  const { productId } = await context.params;
  if (!uuidPattern.test(productId))
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  const input = parseCatalogProductInput(await request.json().catch(() => null), true);
  if (!input || Object.keys(input).length === 0)
    return NextResponse.json({ error: "invalid_catalog_product" }, { status: 400 });
  try {
    const product = await updateCatalogProduct(productId, input);
    if (!product) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ product });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (
      message === "catalog_product_slug_conflict" ||
      message === "catalog_product_changed_concurrently"
    )
      return NextResponse.json({ error: message }, { status: 409 });
    return NextResponse.json({ error: "catalog_admin_update_failed" }, { status: 503 });
  }
}
