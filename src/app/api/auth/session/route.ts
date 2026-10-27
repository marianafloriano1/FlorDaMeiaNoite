import { NextResponse } from "next/server";
import {
  clearSessionCookie,
  registerAdminSession,
  requireSameOrigin,
  requireSession,
} from "@/lib/auth/http";

export async function POST() {
  if (!(await requireSameOrigin()))
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const identity = await requireSession();
  if (!identity) return NextResponse.json({ error: "account_not_provisioned" }, { status: 403 });
  try {
    await registerAdminSession(identity);
    return NextResponse.json({ uid: identity.uid, role: identity.role });
  } catch {
    return NextResponse.json({ error: "invalid_session" }, { status: 401 });
  }
}

export async function DELETE() {
  if (!(await requireSameOrigin()))
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
