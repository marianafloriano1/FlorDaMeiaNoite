import "server-only";
import { requireSession } from "@/lib/auth/http";

export async function getReportsAdmin() {
  const identity = await requireSession();
  if (!identity)
    return { ok: false as const, status: 401 as const, error: "authentication_required" };
  if (identity.role !== "admin")
    return { ok: false as const, status: 403 as const, error: "admin_role_required" };
  return { ok: true as const, identity };
}
