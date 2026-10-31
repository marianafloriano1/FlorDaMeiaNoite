import { NextResponse } from "next/server";
import { authorizeCatalogOperator } from "@/lib/catalog/admin-authorization";
import { saveCoupon } from "@/lib/coupons/service";
import { parseCouponInput } from "@/lib/coupons/validation";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  const auth = await authorizeCatalogOperator(true);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (auth.identity.role !== "admin")
    return NextResponse.json({ error: "admin_role_required" }, { status: 403 });
  const { id } = await context.params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))
    return NextResponse.json({ error: "invalid_coupon" }, { status: 400 });
  const input = parseCouponInput(await request.json().catch(() => null), true);
  if (!input || !Object.keys(input).length)
    return NextResponse.json({ error: "invalid_coupon" }, { status: 400 });
  try {
    return NextResponse.json({ coupon: await saveCoupon(input, id) });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "coupon_save_failed";
    return NextResponse.json(
      { error: reason },
      { status: reason === "coupon_not_found" ? 404 : 503 },
    );
  }
}
