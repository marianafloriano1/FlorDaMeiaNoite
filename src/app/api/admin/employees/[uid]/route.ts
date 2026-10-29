import { NextResponse } from "next/server";
import { hasAdminStepUp, requireSameOrigin, requireSession } from "@/lib/auth/http";
import { deleteEmployeeContract } from "@/lib/storage/employee-contracts";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type Context = { params: Promise<{ uid: string }> };

async function authorize() {
  const identity = await requireSession();
  if (identity?.role !== "admin" || !(await hasAdminStepUp(identity.uid))) return null;
  return identity;
}

export async function PATCH(request: Request, context: Context) {
  if (!(await requireSameOrigin()))
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const identity = await authorize();
  if (!identity) return NextResponse.json({ error: "admin_mfa_required" }, { status: 428 });
  const body = (await request.json().catch(() => null)) as {
    fullName?: string;
    age?: number;
    phoneNumber?: string;
    email?: string;
    hireDate?: string;
  } | null;
  const allowed = new Set(["fullName", "age", "phoneNumber", "email", "hireDate"]);
  if (!body || Object.keys(body).some((key) => !allowed.has(key)) || !Object.keys(body).length)
    return NextResponse.json({ error: "invalid_employee_update" }, { status: 400 });

  const changes: Record<string, unknown> = {};
  if (body.fullName !== undefined) {
    if (!body.fullName.trim() || body.fullName.length > 200)
      return NextResponse.json({ error: "invalid_name" }, { status: 400 });
    changes.full_name = body.fullName.trim();
  }
  if (body.age !== undefined) {
    if (!Number.isInteger(body.age) || body.age < 0 || body.age > 150)
      return NextResponse.json({ error: "invalid_age" }, { status: 400 });
    changes.age = body.age;
  }
  if (body.phoneNumber !== undefined) {
    if (!/^\+[1-9]\d{7,14}$/.test(body.phoneNumber))
      return NextResponse.json({ error: "invalid_phone" }, { status: 400 });
    changes.phone_e164 = body.phoneNumber;
  }
  if (body.email !== undefined) {
    if (!/^\S+@\S+\.\S+$/.test(body.email))
      return NextResponse.json({ error: "invalid_email" }, { status: 400 });
    changes.email = body.email.trim().toLowerCase();
  }
  if (body.hireDate !== undefined) {
    if (Number.isNaN(Date.parse(body.hireDate)))
      return NextResponse.json({ error: "invalid_hire_date" }, { status: 400 });
    changes.hire_date = body.hireDate;
  }

  const { uid } = await context.params;
  const admin = getSupabaseAdminClient();
  const { data: current } = await admin
    .from("employee_profiles")
    .select("account_status")
    .eq("id", uid)
    .maybeSingle();
  if (current?.account_status !== "active")
    return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (body.email || body.fullName || body.phoneNumber) {
    const { error } = await admin.auth.admin.updateUserById(uid, {
      ...(body.email ? { email: body.email.trim().toLowerCase(), email_confirm: true } : {}),
      ...(body.fullName ? { user_metadata: { full_name: body.fullName.trim() } } : {}),
      ...(body.phoneNumber ? { phone: body.phoneNumber, phone_confirm: true } : {}),
    });
    if (error) return NextResponse.json({ error: "employee_auth_update_failed" }, { status: 409 });
  }
  const { error: updateError } = await admin
    .from("employee_profiles")
    .update({
      ...changes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", uid);
  if (updateError)
    return NextResponse.json({ error: "employee_profile_update_failed" }, { status: 500 });
  const { error: auditError } = await admin.from("identity_audit_events").insert({
    actor_uid: identity.uid,
    target_uid: uid,
    action: "employee.updated",
    details: { fields: Object.keys(changes) },
  });
  if (auditError) return NextResponse.json({ error: "employee_audit_failed" }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, context: Context) {
  if (!(await requireSameOrigin()))
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const identity = await authorize();
  if (!identity) return NextResponse.json({ error: "admin_mfa_required" }, { status: 428 });
  const { uid } = await context.params;
  const mode = new URL(request.url).searchParams.get("mode");
  const admin = getSupabaseAdminClient();
  const { data: employee } = await admin
    .from("employee_profiles")
    .select("*")
    .eq("id", uid)
    .maybeSingle();
  if (!employee) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (mode === "freeze") {
    const now = new Date();
    const deleteAfter = new Date(now);
    deleteAfter.setMonth(deleteAfter.getMonth() + 3);
    if (deleteAfter.getDate() < now.getDate()) deleteAfter.setDate(0);
    const { error: authError } = await admin.auth.admin.updateUserById(uid, {
      app_metadata: { role: "employee", suspended: true },
    });
    if (authError) return NextResponse.json({ error: "employee_freeze_failed" }, { status: 500 });
    const { error: profileError } = await admin
      .from("employee_profiles")
      .update({
        account_status: "frozen",
        frozen_at: now.toISOString(),
        delete_after: deleteAfter.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq("id", uid);
    if (profileError) {
      await admin.auth.admin.updateUserById(uid, {
        app_metadata: { role: "employee", suspended: false },
      });
      return NextResponse.json({ error: "employee_freeze_failed" }, { status: 500 });
    }
    await admin
      .from("identity_audit_events")
      .insert({ actor_uid: identity.uid, target_uid: uid, action: "employee.frozen" });
    return NextResponse.json({ ok: true, deleteAfter });
  }

  if (
    mode !== "delete" ||
    employee.account_status !== "frozen" ||
    !employee.delete_after ||
    new Date(employee.delete_after) > new Date()
  ) {
    return NextResponse.json({ error: "employee_not_eligible_for_deletion" }, { status: 409 });
  }
  const { error: auditError } = await admin.from("identity_audit_events").insert({
    actor_uid: identity.uid,
    target_uid: uid,
    action: "employee.deleted",
  });
  if (auditError) return NextResponse.json({ error: "employee_delete_failed" }, { status: 500 });
  if (employee.contract_object_key) await deleteEmployeeContract(employee.contract_object_key);
  const { error } = await admin.auth.admin.deleteUser(uid);
  if (error) return NextResponse.json({ error: "employee_delete_failed" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
