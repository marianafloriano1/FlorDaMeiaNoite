import { NextResponse } from "next/server";
import { requireSameOrigin, requireSession } from "@/lib/auth/http";
import { isUuid } from "@/lib/cart/validation";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await requireSameOrigin()))
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const identity = await requireSession();
  if (identity?.role !== "customer")
    return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  const { id } = await context.params;
  if (!isUuid(id)) return NextResponse.json({ error: "invalid_reservation" }, { status: 400 });

  try {
    const supabase = await getSupabaseServerClient();
    const { data, error } = await supabase.rpc("cancel_cart_reservation", {
      p_reservation_id: id,
    });
    if (error) {
      if (error.message.includes("reservation_not_found"))
        return NextResponse.json({ error: "reservation_not_found" }, { status: 404 });
      return NextResponse.json({ error: "reservation_unavailable" }, { status: 503 });
    }
    if (!data) return NextResponse.json({ error: "reservation_not_active" }, { status: 409 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "reservation_unavailable" }, { status: 503 });
  }
}
