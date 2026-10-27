import { NextResponse } from "next/server";
import { requireSameOrigin, requireSession } from "@/lib/auth/http";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const identity = await requireSession();
  if (identity?.role !== "customer")
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data: profile } = await getSupabaseAdminClient()
    .from("customer_profiles")
    .select("full_name,email,phone_e164")
    .eq("id", identity.uid)
    .maybeSingle();
  return profile
    ? NextResponse.json({
        full_name: profile.full_name,
        email: profile.email,
        phone_e164: profile.phone_e164,
      })
    : NextResponse.json({ error: "not_found" }, { status: 404 });
}

export async function PATCH(request: Request) {
  if (!(await requireSameOrigin()))
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const identity = await requireSession();
  if (identity?.role !== "customer")
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { fullName?: string } | null;
  if (
    Object.keys(body ?? {}).some((key) => key !== "fullName") ||
    !body?.fullName?.trim() ||
    body.fullName.length > 200
  ) {
    return NextResponse.json({ error: "only_name_can_be_changed_here" }, { status: 400 });
  }
  const { error } = await getSupabaseAdminClient()
    .from("customer_profiles")
    .update({ full_name: body.fullName.trim(), updated_at: new Date().toISOString() })
    .eq("id", identity.uid);
  return error
    ? NextResponse.json({ error: "profile_update_failed" }, { status: 500 })
    : NextResponse.json({ ok: true });
}

export async function PUT(request: Request) {
  if (!(await requireSameOrigin()))
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const identity = await requireSession();
  if (identity?.role !== "customer")
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || Object.keys(body).length) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  const supabase = await getSupabaseServerClient();
  const { data: result, error } = await supabase.auth.getUser();
  const user = result.user;
  if (error || !user?.email || !user.email_confirmed_at || !user.phone || !user.phone_confirmed_at)
    return NextResponse.json({ error: "verification_required" }, { status: 409 });
  const { error: updateError } = await getSupabaseAdminClient()
    .from("customer_profiles")
    .update({ email: user.email, phone_e164: user.phone, updated_at: new Date().toISOString() })
    .eq("id", identity.uid);
  return updateError
    ? NextResponse.json({ error: "profile_sync_failed" }, { status: 500 })
    : NextResponse.json({ ok: true });
}
