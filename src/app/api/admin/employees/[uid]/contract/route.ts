import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/http";
import { readEmployeeContract } from "@/lib/storage/employee-contracts";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET(_request: Request, context: { params: Promise<{ uid: string }> }) {
  const admin = await requireSession();
  if (admin?.role !== "admin") return new Response(null, { status: 404 });
  const { uid } = await context.params;
  const { data: employee } = await getSupabaseAdminClient()
    .from("employee_profiles")
    .select("contract_object_key")
    .eq("id", uid)
    .maybeSingle();
  if (!employee?.contract_object_key) return new Response(null, { status: 404 });
  try {
    const data = await readEmployeeContract(employee.contract_object_key);
    await getSupabaseAdminClient().from("identity_audit_events").insert({
      actor_uid: admin.uid,
      target_uid: uid,
      action: "employee.contract_viewed",
    });
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": "attachment",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}
