import { NextResponse } from "next/server";
import { getReportsAdmin } from "@/lib/reports/authorization";
import { parseReportFilters } from "@/lib/reports/periods";
import { getOperationsReport } from "@/lib/reports/service";

export async function GET(request: Request) {
  const authorization = await getReportsAdmin();
  if (!authorization.ok)
    return NextResponse.json({ error: authorization.error }, { status: authorization.status });
  const filters = parseReportFilters(new URL(request.url).searchParams);
  if (!filters) return NextResponse.json({ error: "invalid_report_filters" }, { status: 400 });
  try {
    return NextResponse.json(await getOperationsReport(filters), {
      headers: { "cache-control": "private, no-store" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return NextResponse.json(
      { error: message === "report_range_too_large" ? message : "report_unavailable" },
      { status: message === "report_range_too_large" ? 413 : 503 },
    );
  }
}
