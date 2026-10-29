import { NextResponse } from "next/server";
import { authorizeCatalogOperator } from "@/lib/catalog/admin-authorization";
import { uploadCatalogProductImage } from "@/lib/storage/catalog-products";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type Context = { params: Promise<{ productId: string }> };
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request, context: Context) {
  const authorization = await authorizeCatalogOperator(true);
  if (!authorization.ok)
    return NextResponse.json({ error: authorization.error }, { status: authorization.status });
  const { productId } = await context.params;
  if (!uuidPattern.test(productId))
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const altText = form?.get("altText");
  const width = Number(form?.get("width"));
  const height = Number(form?.get("height"));
  if (!(file instanceof File) || typeof altText !== "string" || file.size > 10 * 1024 * 1024)
    return NextResponse.json({ error: "invalid_catalog_image" }, { status: 400 });

  const { data: product, error: productError } = await getSupabaseAdminClient()
    .from("catalog_products")
    .select("id")
    .eq("id", productId)
    .maybeSingle();
  if (productError)
    return NextResponse.json({ error: "catalog_image_unavailable" }, { status: 503 });
  if (!product) return NextResponse.json({ error: "not_found" }, { status: 404 });

  try {
    const image = await uploadCatalogProductImage({
      productId,
      content: Buffer.from(await file.arrayBuffer()),
      contentType: file.type,
      altText,
      width,
      height,
    });
    return NextResponse.json({ image }, { status: 201 });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "";
    const validationErrors = new Set([
      "catalog_image_not_allowed",
      "catalog_image_signature_invalid",
      "catalog_image_alt_invalid",
      "catalog_image_dimensions_invalid",
    ]);
    return NextResponse.json(
      { error: validationErrors.has(reason) ? reason : "catalog_image_upload_failed" },
      { status: validationErrors.has(reason) ? 400 : 503 },
    );
  }
}
