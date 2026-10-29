import { NextResponse } from "next/server";
import { authorizeCatalogOperator } from "@/lib/catalog/admin-authorization";
import { createCatalogProduct, listAdminCatalogProducts } from "@/lib/catalog/admin-service";
import { parseCatalogProductInput } from "@/lib/catalog/admin-validation";

export async function GET() {
  const authorization = await authorizeCatalogOperator();
  if (!authorization.ok)
    return NextResponse.json({ error: authorization.error }, { status: authorization.status });
  try {
    return NextResponse.json({ products: await listAdminCatalogProducts() });
  } catch {
    return NextResponse.json({ error: "catalog_admin_list_failed" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const authorization = await authorizeCatalogOperator(true);
  if (!authorization.ok)
    return NextResponse.json({ error: authorization.error }, { status: authorization.status });
  const input = parseCatalogProductInput(await request.json().catch(() => null));
  if (!input) return NextResponse.json({ error: "invalid_catalog_product" }, { status: 400 });
  try {
    const product = await createCatalogProduct(input);
    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "catalog_product_slug_conflict")
      return NextResponse.json({ error: "catalog_product_slug_conflict" }, { status: 409 });
    return NextResponse.json({ error: "catalog_admin_create_failed" }, { status: 503 });
  }
}
