import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { normalizeAndValidateCpf } from "@/lib/auth/cpf";
import { hasAdminStepUp, requireSameOrigin, requireSession } from "@/lib/auth/http";
import { getAdminMutationDenial } from "@/lib/auth/step-up";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

async function administrator() {
  const identity = await requireSession();
  return identity?.role === "admin" ? identity : null;
}

export async function GET() {
  if (!(await administrator())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { data, error } = await getSupabaseAdminClient()
    .from("employee_profiles")
    .select("*")
    .order("full_name");
  if (error) return NextResponse.json({ error: "employee_list_failed" }, { status: 500 });
  return NextResponse.json({ employees: data ?? [] });
}

export async function POST(request: Request) {
  if (!(await requireSameOrigin()))
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const identity = await administrator();
  const denial = getAdminMutationDenial(
    identity?.role ?? null,
    identity ? await hasAdminStepUp(identity.uid) : false,
  );
  if (denial) return NextResponse.json({ error: denial.error }, { status: denial.status });
  if (!identity) return NextResponse.json({ error: "admin_role_required" }, { status: 403 });
  const body = (await request.json().catch(() => null)) as {
    fullName?: string;
    age?: number;
    phoneNumber?: string;
    email?: string;
    cpf?: string;
    hireDate?: string;
  } | null;
  const fullName = body?.fullName?.trim();
  const cpf = typeof body?.cpf === "string" ? normalizeAndValidateCpf(body.cpf) : null;
  const email = body?.email?.trim().toLowerCase();
  if (
    !fullName ||
    fullName.length > 200 ||
    !cpf ||
    !email ||
    !/^\S+@\S+\.\S+$/.test(email) ||
    typeof body?.age !== "number" ||
    !Number.isInteger(body.age) ||
    body.age < 0 ||
    body.age > 150 ||
    !body.phoneNumber ||
    !/^\+[1-9]\d{7,14}$/.test(body.phoneNumber) ||
    !body.hireDate ||
    Number.isNaN(Date.parse(body.hireDate))
  )
    return NextResponse.json({ error: "invalid_employee" }, { status: 400 });

  const admin = getSupabaseAdminClient();
  let uid = "";
  try {
    const { data: created, error: authError } = await admin.auth.admin.createUser({
      email,
      phone: body.phoneNumber,
      password: randomBytes(40).toString("base64url"),
      email_confirm: false,
      phone_confirm: false,
      user_metadata: { full_name: fullName },
      app_metadata: { role: "employee" },
    });
    if (authError || !created.user) throw authError ?? new Error("AUTH_USER_CREATE_FAILED");
    uid = created.user.id;
    const { error: profileError } = await admin.from("employee_profiles").insert({
      id: uid,
      full_name: fullName,
      age: body.age,
      phone_e164: body.phoneNumber,
      email,
      cpf,
      hire_date: body.hireDate,
      contract_object_key: null,
      account_status: "active",
    });
    if (profileError) throw profileError;
    const { error: auditError } = await admin.from("identity_audit_events").insert({
      actor_uid: identity.uid,
      target_uid: uid,
      action: "employee.created",
    });
    if (auditError) throw auditError;
    return NextResponse.json({ uid }, { status: 201 });
  } catch {
    if (uid) {
      await admin.from("employee_profiles").delete().eq("id", uid);
      await admin.auth.admin.deleteUser(uid);
    }
    return NextResponse.json({ error: "employee_creation_failed" }, { status: 409 });
  }
}
