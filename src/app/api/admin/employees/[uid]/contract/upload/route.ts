import { NextResponse } from "next/server";
import { hasAdminStepUp, requireSameOrigin, requireSession } from "@/lib/auth/http";
import { deleteEmployeeContract, writeEmployeeContract } from "@/lib/storage/employee-contracts";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request, context: { params: Promise<{ uid: string }> }) {
  if (!(await requireSameOrigin()))
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const admin = await requireSession();
  if (admin?.role !== "admin" || !(await hasAdminStepUp(admin.uid))) {
    return NextResponse.json({ error: "admin_mfa_required" }, { status: 428 });
  }
  const { uid } = await context.params;
  const adminClient = getSupabaseAdminClient();
  const { data: employee } = await adminClient
    .from("employee_profiles")
    .select("id,contract_object_key")
    .eq("id", uid)
    .maybeSingle();
  if (!employee) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File))
    return NextResponse.json({ error: "file_required" }, { status: 400 });
  const maximum = Number(process.env.EMPLOYEE_CONTRACT_MAX_BYTES);
  if (!Number.isSafeInteger(maximum) || maximum < 1) {
    return NextResponse.json({ error: "contract_storage_not_configured" }, { status: 503 });
  }
  if (file.size > maximum)
    return NextResponse.json({ error: "file_size_not_allowed" }, { status: 400 });
  const body = Buffer.from(await file.arrayBuffer());
  try {
    const objectKey = await writeEmployeeContract(uid, file.name, body, file.type);
    try {
      const { error: profileError } = await adminClient
        .from("employee_profiles")
        .update({ contract_object_key: objectKey, updated_at: new Date().toISOString() })
        .eq("id", uid);
      if (profileError) throw profileError;
      const { error: auditError } = await adminClient.from("identity_audit_events").insert({
        actor_uid: admin.uid,
        target_uid: uid,
        action: "employee.contract_uploaded",
      });
      if (auditError) throw auditError;
      if (employee.contract_object_key) {
        await deleteEmployeeContract(employee.contract_object_key).catch(() => undefined);
      }
    } catch (error) {
      await deleteEmployeeContract(objectKey).catch(() => undefined);
      throw error;
    }
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "";
    return NextResponse.json(
      {
        error:
          reason === "file_size_not_allowed" || reason === "file_type_not_allowed"
            ? reason
            : "contract_upload_unavailable",
      },
      {
        status:
          reason === "file_size_not_allowed" || reason === "file_type_not_allowed" ? 400 : 503,
      },
    );
  }
}
