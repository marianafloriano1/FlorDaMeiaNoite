import "server-only";
import {
  hasAdminStepUp,
  requireSameOrigin,
  requireSession,
  type VerifiedIdentity,
} from "@/lib/auth/http";
import { catalogAccessDenial } from "./authorization";

export type CatalogAuthorization =
  | { ok: true; identity: VerifiedIdentity }
  | { ok: false; status: 401 | 403 | 428; error: string };

export async function authorizeCatalogOperator(mutation = false): Promise<CatalogAuthorization> {
  if (mutation && !(await requireSameOrigin())) {
    return { ok: false, status: 403, error: "forbidden" };
  }
  const identity = await requireSession();
  const hasStepUp =
    mutation && identity?.role === "admin" ? await hasAdminStepUp(identity.uid) : false;
  const denial = catalogAccessDenial(identity?.role ?? null, mutation, hasStepUp);
  if (denial) return { ok: false, ...denial };
  if (!identity) return { ok: false, status: 401, error: "authentication_required" };
  return { ok: true, identity };
}
