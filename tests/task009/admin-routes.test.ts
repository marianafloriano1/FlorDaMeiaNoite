import assert from "node:assert/strict";
import { mock, test } from "node:test";

type Role = "admin" | "employee" | "customer";
type Identity = { uid: string; role: Role } | null;
let sameOrigin = true;
let identity: Identity = null;
let recentMfa = false;
let sessionCalls = 0;
const rpcCalls: Array<{ name: string; args: Record<string, unknown> }> = [];

mock.module("@/lib/auth/http", {
  namedExports: {
    requireSameOrigin: async () => sameOrigin,
    requireSession: async () => {
      sessionCalls += 1;
      return identity;
    },
    hasAdminStepUp: async () => recentMfa,
  },
});
mock.module("@/lib/auth/step-up", {
  namedExports: {
    getAdminMutationDenial: (_role: string, verified: boolean) =>
      verified ? null : { error: "admin_mfa_required", status: 428 },
  },
});
mock.module("@/lib/supabase/server", {
  namedExports: {
    getSupabaseServerClient: async () => ({
      rpc: async (name: string, args: Record<string, unknown>) => {
        rpcCalls.push({ name, args });
        return { data: { accepted: true }, error: null };
      },
    }),
  },
});

const orderId = "8f8b289a-56ae-4aa2-9448-7c3c643c37e7";
const itemId = "06da7f4f-f61e-4e2a-9f57-3064c28f4d4c";
function request(body: unknown) {
  return new Request(`http://localhost/api/admin/orders/${orderId}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}
function testIdentity(role: Role): Identity {
  return { uid: `synthetic-${role}`, role };
}

test("TASK-009 order handler enforces origin, session, role and step-up", async (t) => {
  const route = await import("@/app/api/admin/orders/[id]/route");
  const context = { params: Promise.resolve({ id: orderId }) };

  await t.test("cross-origin request is denied before session lookup", async () => {
    sameOrigin = false;
    identity = null;
    sessionCalls = 0;
    const response = await route.PATCH(
      request({
        action: "schedule_pickup",
        scheduledPickupAt: new Date(Date.now() + 60_000).toISOString(),
      }),
      context,
    );
    assert.equal(response.status, 403);
    assert.equal(sessionCalls, 0);
  });

  await t.test("missing session and customer role are denied", async () => {
    sameOrigin = true;
    identity = null;
    assert.equal((await route.PATCH(request({ action: "cancel" }), context)).status, 401);
    identity = testIdentity("customer");
    assert.equal((await route.PATCH(request({ action: "cancel" }), context)).status, 403);
  });

  await t.test("employee cannot schedule or cancel, but can record an issue", async () => {
    identity = testIdentity("employee");
    const schedule = await route.PATCH(
      request({
        action: "schedule_pickup",
        scheduledPickupAt: new Date(Date.now() + 60_000).toISOString(),
      }),
      context,
    );
    assert.equal(schedule.status, 403);
    const cancel = await route.PATCH(request({ action: "cancel" }), context);
    assert.equal(cancel.status, 403);
    const issue = await route.PATCH(
      request({
        action: "record_issue",
        orderItemId: itemId,
        issueType: "defect",
        idempotencyKey: orderId,
      }),
      context,
    );
    assert.equal(issue.status, 200);
    assert.equal(rpcCalls.at(-1)?.name, "record_order_issue");
  });

  await t.test("admin requires recent MFA and calls the pickup RPC after step-up", async () => {
    identity = testIdentity("admin");
    recentMfa = false;
    const denied = await route.PATCH(
      request({
        action: "schedule_pickup",
        scheduledPickupAt: new Date(Date.now() + 60_000).toISOString(),
      }),
      context,
    );
    assert.equal(denied.status, 428);
    recentMfa = true;
    const at = new Date(Date.now() + 60_000).toISOString();
    const accepted = await route.PATCH(
      request({ action: "schedule_pickup", scheduledPickupAt: at }),
      context,
    );
    assert.equal(accepted.status, 200);
    assert.equal(rpcCalls.at(-1)?.name, "set_order_pickup_schedule");
  });
});
