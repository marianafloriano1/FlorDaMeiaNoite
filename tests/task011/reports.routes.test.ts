import assert from "node:assert/strict";
import { mock, test } from "node:test";

type Role = "admin" | "employee" | "customer";
let sameOrigin = true;
let identity: { uid: string; role: Role } | null = null;
const reportCalls: unknown[] = [];
const audits: unknown[] = [];
const report = {
  filters: {
    period: "week",
    basis: "created",
    anchor: "2026-11-02",
    startAt: "2026-11-02T03:00:00.000Z",
    endAt: "2026-11-09T03:00:00.000Z",
  },
  paidOrderCount: 2,
  revenueBrl: 80,
  postPaymentCancelledOrderCount: 0,
  products: [],
  cartItemAddedEvents: 1,
  cartUnitsAdded: 1,
  favoriteAddedEvents: 0,
};

mock.module("@/lib/auth/http", {
  namedExports: {
    requireSameOrigin: async () => sameOrigin,
    requireSession: async () => identity,
  },
});
mock.module("@/lib/reports/authorization", {
  namedExports: {
    getReportsAdmin: async () => {
      if (!identity) return { ok: false, status: 401, error: "authentication_required" };
      if (identity.role !== "admin")
        return { ok: false, status: 403, error: "admin_role_required" };
      return { ok: true, identity };
    },
  },
});
mock.module("@/lib/reports/service", {
  namedExports: {
    getOperationsReport: async (filters: unknown) => {
      reportCalls.push(filters);
      return report;
    },
  },
});
mock.module("@/lib/reports/export", {
  namedExports: { createReportExport: async () => Buffer.from("%PDF-synthetic") },
});
mock.module("@/lib/supabase/admin", {
  namedExports: {
    getSupabaseAdminClient: () => ({
      from: () => ({
        insert: async (row: unknown) => {
          audits.push(row);
          return { error: null };
        },
      }),
    }),
  },
});

test("TASK-011: API de relatórios exige sessão e role admin", async (t) => {
  const route = await import("@/app/api/admin/reports/route");
  const request = new Request(
    "http://localhost/api/admin/reports?period=week&basis=created&anchor=2026-11-02",
  );
  await t.test("sem sessão recebe 401", async () => {
    identity = null;
    assert.equal((await route.GET(request)).status, 401);
  });
  await t.test("customer e employee recebem 403", async () => {
    identity = { uid: "synthetic-customer", role: "customer" };
    assert.equal((await route.GET(request)).status, 403);
    identity = { uid: "synthetic-employee", role: "employee" };
    assert.equal((await route.GET(request)).status, 403);
  });
  await t.test("admin obtém os dados e filtros inválidos são rejeitados", async () => {
    identity = { uid: "synthetic-admin", role: "admin" };
    const response = await route.GET(request);
    assert.equal(response.status, 200);
    assert.equal((await response.json()).revenueBrl, 80);
    const calls = reportCalls.length;
    assert.equal(
      (await route.GET(new Request("http://localhost/api/admin/reports?period=year"))).status,
      400,
    );
    assert.equal(reportCalls.length, calls);
  });
});

test("TASK-011: exportação exige same-origin/admin e audita formato/filtros sem PII", async (t) => {
  const route = await import("@/app/api/admin/reports/export/route");
  const makeRequest = () => {
    const body = new FormData();
    body.set("period", "week");
    body.set("basis", "created");
    body.set("anchor", "2026-11-02");
    body.set("format", "pdf");
    return new Request("http://localhost/api/admin/reports/export", { method: "POST", body });
  };
  await t.test("cross-origin recebe 403", async () => {
    sameOrigin = false;
    identity = { uid: "synthetic-admin", role: "admin" };
    assert.equal((await route.POST(makeRequest())).status, 403);
  });
  await t.test("sem sessão recebe 401", async () => {
    sameOrigin = true;
    identity = null;
    assert.equal((await route.POST(makeRequest())).status, 401);
  });
  await t.test("employee recebe 403", async () => {
    identity = { uid: "synthetic-employee", role: "employee" };
    assert.equal((await route.POST(makeRequest())).status, 403);
  });
  await t.test("admin recebe arquivo sem cache e gera metadado mínimo de auditoria", async () => {
    identity = { uid: "synthetic-admin", role: "admin" };
    const response = await route.POST(makeRequest());
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-disposition") ?? "", /relatorio-week-created\.pdf/);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    assert.equal(audits.length, 1);
    const audit = audits[0] as Record<string, unknown>;
    assert.equal(audit.actor_uid, "synthetic-admin");
    assert.equal(audit.export_format, "pdf");
    assert.deepEqual(Object.keys(audit).sort(), [
      "actor_uid",
      "date_basis",
      "export_format",
      "period_end",
      "period_kind",
      "period_start",
    ]);
  });
});
