import { NextResponse } from "next/server";
import { authorizeCatalogOperator } from "@/lib/catalog/admin-authorization";
import { listCoupons, saveCoupon } from "@/lib/coupons/service";
import { parseCouponInput } from "@/lib/coupons/validation";

export async function GET() {
  const auth = await authorizeCatalogOperator();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (auth.identity.role !== "admin")
    return NextResponse.json({ error: "admin_role_required" }, { status: 403 });
  try {
    return NextResponse.json(
      { coupons: await listCoupons() },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return NextResponse.json({ error: "coupon_list_failed" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const auth = await authorizeCatalogOperator(true);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (auth.identity.role !== "admin")
    return NextResponse.json({ error: "admin_role_required" }, { status: 403 });
  const payload = await request.json().catch(() => null);
  const input = parseCouponInput(payload);
  if (!input) return NextResponse.json({ error: "invalid_coupon" }, { status: 400 });
  try {
    return NextResponse.json({ coupon: await saveCoupon(input) }, { status: 201 });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "coupon_save_failed";
    return NextResponse.json(
      { error: reason },
      { status: reason === "coupon_code_conflict" ? 409 : 503 },
    );
  }
}
