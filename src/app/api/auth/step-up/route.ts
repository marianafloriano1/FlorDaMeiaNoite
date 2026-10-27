import { NextResponse } from "next/server";
import { recordAdminStepUp, requireSameOrigin, requireSession } from "@/lib/auth/http";

export async function POST(_request: Request) {
  if (!(await requireSameOrigin()))
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const identity = await requireSession();
  if (identity?.role !== "admin")
    return NextResponse.json({ error: "admin_role_required" }, { status: 403 });
  try {
    const ok = await recordAdminStepUp(identity.uid);
    return ok
      ? NextResponse.json({ ok: true })
      : NextResponse.json({ error: "mfa_required" }, { status: 428 });
  } catch {
    return NextResponse.json({ error: "invalid_mfa_proof" }, { status: 401 });
  }
}
