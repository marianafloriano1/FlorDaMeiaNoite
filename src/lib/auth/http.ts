import { headers } from "next/headers";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { isAdminSessionWithinIdleWindow } from "./idle-window";
import { getAdminSessionInsertOptions, getRecentMfaTimestamp } from "./step-up";

export type VerifiedIdentity = {
  uid: string;
  role: "customer" | "employee" | "admin";
  email: string;
  emailVerified: boolean;
  phoneNumber: string | undefined;
  phoneVerified: boolean;
  sessionId: string;
  aal: "aal1" | "aal2";
  recentMfaAt: Date | null;
};

export async function requireSameOrigin(): Promise<boolean> {
  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin");
  const host = requestHeaders.get("host");
  const fetchSite = requestHeaders.get("sec-fetch-site");
  if (!origin || !host || (fetchSite && fetchSite !== "same-origin")) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

async function identityFromAccessToken(accessToken?: string): Promise<VerifiedIdentity | null> {
  const supabase = await getSupabaseServerClient();
  const userResult = accessToken
    ? await getSupabaseAdminClient().auth.getUser(accessToken)
    : await supabase.auth.getUser();
  const user = userResult.data.user;
  if (userResult.error || !user || user.is_anonymous || user.app_metadata.suspended === true)
    return null;

  const claimsResult = accessToken
    ? await getSupabaseAdminClient().auth.getClaims(accessToken)
    : await supabase.auth.getClaims();
  const claims = claimsResult.data?.claims as Record<string, unknown> | undefined;
  const sessionId = typeof claims?.session_id === "string" ? claims.session_id : "";
  if (!sessionId) return null;

  let role = user.app_metadata.role;
  if (role !== "admin" && role !== "employee" && role !== "customer") {
    const { data: profile } = await getSupabaseAdminClient()
      .from("customer_profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();
    if (profile) role = "customer";
  }
  if (role !== "admin" && role !== "employee" && role !== "customer") return null;

  if (role === "employee") {
    const { data: employee } = await getSupabaseAdminClient()
      .from("employee_profiles")
      .select("account_status")
      .eq("id", user.id)
      .maybeSingle();
    if (employee?.account_status !== "active") return null;
  }

  return {
    uid: user.id,
    role,
    email: user.email ?? "",
    emailVerified: Boolean(user.email_confirmed_at),
    phoneNumber: user.phone ?? undefined,
    phoneVerified: Boolean(user.phone_confirmed_at),
    sessionId,
    aal: claims?.aal === "aal2" ? "aal2" : "aal1",
    recentMfaAt: claims ? getRecentMfaTimestamp(claims) : null,
  };
}

export async function verifyBearer(request: Request): Promise<VerifiedIdentity | null> {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;
  return identityFromAccessToken(authorization.slice(7));
}

export async function requireSession(): Promise<VerifiedIdentity | null> {
  return identityFromAccessToken();
}

export async function registerAdminSession(identity: VerifiedIdentity): Promise<void> {
  if (identity.role !== "admin") return;
  const db = getSupabaseAdminClient();
  const { error } = await db.from("admin_auth_sessions").upsert({
    session_id: identity.sessionId,
    user_id: identity.uid,
    mfa_verified_at: identity.recentMfaAt?.toISOString() ?? null,
    last_activity_at: new Date().toISOString(),
    revoked_at: null,
  }, getAdminSessionInsertOptions());
  if (error) throw new Error("ADMIN_SESSION_REGISTRATION_FAILED");
}

export async function clearSessionCookie(): Promise<void> {
  const identity = await requireSession();
  if (identity?.role === "admin") {
    await getSupabaseAdminClient()
      .from("admin_auth_sessions")
      .update({ revoked_at: new Date().toISOString() })
      .eq("session_id", identity.sessionId)
      .eq("user_id", identity.uid);
  }
  const supabase = await getSupabaseServerClient();
  await supabase.auth.signOut({ scope: "local" });
}

export async function hasAdminStepUp(uid: string): Promise<boolean> {
  const identity = await requireSession();
  if (!identity || identity.uid !== uid || identity.role !== "admin" || identity.aal !== "aal2")
    return false;

  const db = getSupabaseAdminClient();
  const { data: record } = await db
    .from("admin_auth_sessions")
    .select("mfa_verified_at,last_activity_at,revoked_at")
    .eq("session_id", identity.sessionId)
    .eq("user_id", uid)
    .maybeSingle();
  if (!record?.mfa_verified_at || record.revoked_at) return false;
  if (!isAdminSessionWithinIdleWindow(new Date(record.last_activity_at), new Date())) return false;

  const { error } = await db
    .from("admin_auth_sessions")
    .update({ last_activity_at: new Date().toISOString() })
    .eq("session_id", identity.sessionId)
    .eq("user_id", uid)
    .is("revoked_at", null);
  return !error;
}

export async function recordAdminStepUp(uid: string): Promise<boolean> {
  const identity = await requireSession();
  if (!identity || identity.uid !== uid || identity.role !== "admin" || !identity.recentMfaAt)
    return false;
  const now = new Date().toISOString();
  const { error } = await getSupabaseAdminClient().from("admin_auth_sessions").upsert(
    {
      session_id: identity.sessionId,
      user_id: identity.uid,
      mfa_verified_at: identity.recentMfaAt.toISOString(),
      last_activity_at: now,
      revoked_at: null,
    },
    { onConflict: "session_id" },
  );
  return !error;
}
