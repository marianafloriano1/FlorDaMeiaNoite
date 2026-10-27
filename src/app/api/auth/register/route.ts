import { NextResponse } from "next/server";
import { normalizeAndValidateCpf } from "@/lib/auth/cpf";
import { requireSameOrigin } from "@/lib/auth/http";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { normalizePhoneNumber } from "@/lib/auth/phone";

export async function POST(request: Request) {
  if (!(await requireSameOrigin()))
    return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = (await request.json().catch(() => null)) as {
    fullName?: string;
    cpf?: string;
    phoneNumber?: string;
  } | null;
  const fullName = body?.fullName?.trim();
  const cpf = typeof body?.cpf === "string" ? normalizeAndValidateCpf(body.cpf) : null;
  const phoneNumber = normalizePhoneNumber(body?.phoneNumber);
  if (
    !fullName ||
    fullName.length > 200 ||
    !cpf ||
    !phoneNumber
  ) {
    return NextResponse.json({ error: "invalid_profile" }, { status: 400 });
  }

  const supabase = await getSupabaseServerClient();
  const { data: authResult, error: authError } = await supabase.auth.getUser();
  const user = authResult.user;
  if (authError || !user || !user.email || !user.email_confirmed_at || !user.phone_confirmed_at) {
    return NextResponse.json({ error: "verification_required" }, { status: 409 });
  }
  const verifiedPhone = user.phone?.startsWith("+") ? user.phone : `+${user.phone ?? ""}`;
  if (verifiedPhone !== phoneNumber) {
    return NextResponse.json({ error: "verified_phone_mismatch" }, { status: 409 });
  }

  const admin = getSupabaseAdminClient();
  const existingRole = user.app_metadata.role;
  if (existingRole && existingRole !== "customer") {
    return NextResponse.json({ error: "account_already_provisioned" }, { status: 409 });
  }
  try {
    const { error: profileError } = await admin.from("customer_profiles").upsert(
      {
        id: user.id,
        full_name: fullName,
        cpf,
        email: user.email,
        phone_e164: verifiedPhone,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );
    if (profileError) throw { operation: "customer_profiles.upsert", error: profileError };
    const { error: roleError } = await admin.auth.admin.updateUserById(user.id, {
      app_metadata: { ...user.app_metadata, role: "customer" },
      user_metadata: { ...user.user_metadata, full_name: fullName },
    });
    if (roleError) throw { operation: "auth.admin.updateUserById", error: roleError };
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (failure) {
    const error =
      typeof failure === "object" && failure !== null && "error" in failure
        ? failure.error
        : failure;
    const operation =
      typeof failure === "object" && failure !== null && "operation" in failure
        ? String(failure.operation)
        : "unknown";
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? String(error.code)
        : "unknown";
    const message =
      typeof error === "object" && error !== null && "message" in error
        ? String(error.message)
        : error instanceof Error
          ? error.message
          : "unknown";
    const sanitizedMessage = message
      .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted-email]")
      .replace(/\+?[1-9]\d{7,14}/g, "[redacted-phone]")
      .replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, "[redacted-cpf]")
      .replace(/\bBearer\s+\S+/gi, "Bearer [redacted]")
      .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, "[redacted-token]");
    console.error("[auth/register] Supabase operation failed", {
      operation,
      code,
      message: sanitizedMessage,
    });
    const conflict =
      message.toLowerCase().includes("unique") || message.toLowerCase().includes("duplicate");
    return NextResponse.json(
      { error: conflict ? "profile_conflict" : "registration_failed" },
      { status: conflict ? 409 : 400 },
    );
  }
}
