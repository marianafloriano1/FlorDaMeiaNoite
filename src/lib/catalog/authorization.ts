export function catalogAccessDenial(
  role: string | null,
  mutation: boolean,
  adminStepUp: boolean,
): { status: 401 | 403 | 428; error: string } | null {
  if (role === null) return { status: 401, error: "authentication_required" };
  if (role !== "employee" && role !== "admin")
    return { status: 403, error: "catalog_operator_required" };
  if (mutation && role === "admin" && !adminStepUp)
    return { status: 428, error: "admin_mfa_required" };
  return null;
}
