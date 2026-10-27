export type AdminRole = "admin" | "employee" | "customer" | null;

const MFA_FRESHNESS_WINDOW_MS = 5 * 60 * 1000;

export function getRecentMfaTimestamp(
  claims: Record<string, unknown>,
  now = Date.now(),
): Date | null {
  if (claims.aal !== "aal2" || !Array.isArray(claims.amr)) return null;
  const timestamps = claims.amr
    .filter(
      (entry): entry is { method: string; timestamp: number } =>
        typeof entry === "object" &&
        entry !== null &&
        "method" in entry &&
        (entry.method === "otp" || entry.method === "totp" || entry.method === "mfa/phone") &&
        "timestamp" in entry &&
        typeof entry.timestamp === "number" &&
        Number.isFinite(entry.timestamp),
    )
    .map((entry) => entry.timestamp * 1000)
    .filter((timestamp) => timestamp <= now && now - timestamp <= MFA_FRESHNESS_WINDOW_MS);
  const latest = Math.max(...timestamps);
  return Number.isFinite(latest) ? new Date(latest) : null;
}

export function getAdminMutationDenial(
  role: AdminRole,
  hasStepUp: boolean,
): { error: "admin_role_required" | "admin_mfa_required"; status: 403 | 428 } | null {
  if (role !== "admin") return { error: "admin_role_required", status: 403 };
  if (!hasStepUp) return { error: "admin_mfa_required", status: 428 };
  return null;
}

export function getAdminSessionInsertOptions() {
  return { onConflict: "session_id", ignoreDuplicates: true } as const;
}
