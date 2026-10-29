import { NextResponse } from "next/server";
import { authorizeCatalogOperator } from "@/lib/catalog/admin-authorization";
import { adjustCatalogStock } from "@/lib/catalog/admin-service";
import { parseStockAdjustment } from "@/lib/catalog/admin-validation";

type Context = { params: Promise<{ productId: string }> };
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request, context: Context) {
  const authorization = await authorizeCatalogOperator(true);
  if (!authorization.ok)
    return NextResponse.json({ error: authorization.error }, { status: authorization.status });
  const { productId } = await context.params;
  if (!uuidPattern.test(productId))
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  const adjustment = parseStockAdjustment(await request.json().catch(() => null));
  if (!adjustment) return NextResponse.json({ error: "invalid_stock_adjustment" }, { status: 400 });
  try {
    const result = await adjustCatalogStock(
      productId,
      adjustment.newQuantity,
      adjustment.reason,
      authorization.identity.uid,
    );
    return NextResponse.json({ adjustment: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (
      message.includes("invalid_stock_adjustment_reason") ||
      message.includes("invalid_stock_quantity")
    )
      return NextResponse.json({ error: "invalid_stock_adjustment" }, { status: 400 });
    if (message.includes("catalog_operator_required"))
      return NextResponse.json({ error: "catalog_operator_required" }, { status: 403 });
    if (message.includes("catalog_product_not_found"))
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (message.includes("stock_quantity_unchanged"))
      return NextResponse.json({ error: "stock_quantity_unchanged" }, { status: 409 });
    return NextResponse.json({ error: "catalog_stock_adjustment_failed" }, { status: 503 });
  }
}
