import { NextResponse } from "next/server";
import { requireSameOrigin } from "@/lib/auth/http";
import { getReportsAdmin } from "@/lib/reports/authorization";
import { createReportExport } from "@/lib/reports/export";
import { parseReportFilters } from "@/lib/reports/periods";
import { getOperationsReport } from "@/lib/reports/service";
import { parseReportFormat, safeReportFilename } from "@/lib/reports/validation";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  if (!(await requireSameOrigin()))
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const authorization = await getReportsAdmin();
  if (!authorization.ok)
    return NextResponse.json({ error: authorization.error }, { status: authorization.status });
  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "invalid_report_filters" }, { status: 400 });
  const params = new URLSearchParams();
  for (const key of ["period", "basis", "anchor"]) {
    const value = form.get(key);
    if (typeof value === "string") params.set(key, value);
  }
  const filters = parseReportFilters(params);
  const format = parseReportFormat(form.get("format"));
  if (!filters || !format)
    return NextResponse.json({ error: "invalid_report_filters" }, { status: 400 });
  try {
    const report = await getOperationsReport(filters);
    const file = await createReportExport(report, format);
    const { error } = await getSupabaseAdminClient().from("report_export_audit").insert({
      actor_uid: authorization.identity.uid,
      period_kind: filters.period,
      date_basis: filters.basis,
      period_start: filters.startAt,
      period_end: filters.endAt,
      export_format: format,
    });
    if (error) throw new Error("report_audit_failed");
    const contentType =
      format === "xlsx"
        ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        : "application/pdf";
    return new Response(new Uint8Array(file), {
      headers: {
        "content-type": contentType,
        "content-disposition": `attachment; filename=${safeReportFilename(filters.period, filters.basis, format)}`,
        "cache-control": "private, no-store",
        "x-content-type-options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "report_export_unavailable" }, { status: 503 });
  }
}
