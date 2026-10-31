import assert from "node:assert/strict";
import { mock, test } from "node:test";
import type { Coupon } from "@/lib/coupons/types";

let authorization:
  | { ok: true; identity: { role: "admin" | "employee" | "customer" } }
  | { ok: false; status: 401 | 403 | 428; error: string } = {
  ok: false,
  status: 401,
  error: "authentication_required",
};
const saved: Array<Record<string, unknown>> = [];
const coupon = {
  id: "11111111-1111-4111-8111-111111111111",
  code: "BEMVINDO",
  active: true,
} as Coupon;

mock.module("@/lib/catalog/admin-authorization", {
  namedExports: { authorizeCatalogOperator: async () => authorization },
});
mock.module("@/lib/coupons/service", {
  namedExports: {
    listCoupons: async () => [coupon],
    saveCoupon: async (input: Record<string, unknown>) => {
      saved.push(input);
      return coupon;
    },
  },
});

const validCoupon = {
  code: "bemvindo",
  discountType: "percentage",
  discountValue: 10,
  validFrom: "2026-01-01T00:00:00Z",
  validUntil: "2027-01-01T00:00:00Z",
};
const request = (body: unknown) =>
  new Request("http://localhost/api/admin/coupons", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

test("TASK-008: administração HTTP de cupons exige role admin, same-origin e MFA recente", async (t) => {
  const collection = await import("@/app/api/admin/coupons/route");
  const item = await import("@/app/api/admin/coupons/[id]/route");
  await t.test("sessão ausente recebe 401", async () => {
    authorization = { ok: false, status: 401, error: "authentication_required" };
    assert.equal((await collection.POST(request(validCoupon))).status, 401);
  });
  await t.test("cross-origin recebe 403", async () => {
    authorization = { ok: false, status: 403, error: "forbidden" };
    assert.equal((await collection.POST(request(validCoupon))).status, 403);
  });
  await t.test("employee não pode administrar cupons", async () => {
    authorization = { ok: true, identity: { role: "employee" } };
    assert.equal((await collection.POST(request(validCoupon))).status, 403);
  });
  await t.test("admin sem MFA recebe 428", async () => {
    authorization = { ok: false, status: 428, error: "admin_mfa_required" };
    assert.equal((await collection.POST(request(validCoupon))).status, 428);
  });
  await t.test("admin com MFA cria e altera status via endpoint", async () => {
    authorization = { ok: true, identity: { role: "admin" } };
    const created = await collection.POST(request(validCoupon));
    assert.equal(created.status, 201);
    assert.equal(saved.at(-1)?.code, "BEMVINDO");
    const updated = await item.PATCH(
      new Request("http://localhost/api/admin/coupons/id", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ active: false }),
      }),
      { params: Promise.resolve({ id: coupon.id }) },
    );
    assert.equal(updated.status, 200);
    assert.equal(saved.at(-1)?.active, false);
  });
  await t.test("payload inválido é recusado antes do serviço", async () => {
    authorization = { ok: true, identity: { role: "admin" } };
    const count = saved.length;
    assert.equal(
      (await collection.POST(request({ ...validCoupon, discountValue: -1 }))).status,
      400,
    );
    assert.equal(saved.length, count);
  });
});
