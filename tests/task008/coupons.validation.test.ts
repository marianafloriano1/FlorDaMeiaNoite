import assert from "node:assert/strict";
import test from "node:test";
import { callCouponAdminRpc } from "@/lib/coupons/admin-rpc";
import { normalizeCouponCode, parseCouponInput } from "@/lib/coupons/validation";

test("coupon input normalizes code and accepts optional campaign limits", () => {
  const parsed = parseCouponInput({
    code: " boas-vindas ",
    discountType: "percentage",
    discountValue: 15,
    validFrom: "2026-01-01T00:00:00Z",
    validUntil: "2027-01-01T00:00:00Z",
    minimumEligibleBrl: null,
    maximumRedemptions: null,
    maximumPerCustomer: 1,
    productIds: [],
    categories: [],
  });
  assert.equal(parsed?.code, "BOAS-VINDAS");
  assert.equal(parsed?.maximumPerCustomer, 1);
  assert.equal(normalizeCouponCode("cupom-1"), "CUPOM-1");
});

test("coupon validation rejects invalid ranges, stacking-shaped fields and invalid money", () => {
  const base = {
    code: "TESTE",
    discountType: "fixed",
    discountValue: 10,
    validFrom: "2026-01-02T00:00:00Z",
    validUntil: "2026-01-01T00:00:00Z",
  };
  assert.equal(parseCouponInput(base), null);
  assert.equal(
    parseCouponInput({
      ...base,
      validFrom: "2026-01-01T00:00:00Z",
      validUntil: "2026-02-01T00:00:00Z",
      discountValue: 1.005,
    }),
    null,
  );
  assert.equal(parseCouponInput({ ...base, otherCoupon: "SECOND" }), null);
  assert.equal(
    parseCouponInput({
      ...base,
      validFrom: "2026-01-01T00:00:00Z",
      validUntil: "2026-02-01T00:00:00Z",
      maximumRedemptions: 0,
    }),
    null,
  );
  assert.equal(normalizeCouponCode("bad code"), null);
});

test("coupon update allows only explicit active toggle", () => {
  assert.deepEqual(parseCouponInput({ active: false }, true), { active: false });
  assert.equal(parseCouponInput({}, true), null);
});

test("coupon admin RPC arguments match create and update signatures", async (t) => {
  const calls: Array<{ name: string; args?: Record<string, unknown> }> = [];
  const db = {
    rpc: async (name: string, args?: Record<string, unknown>) => {
      calls.push({ name, args });
      return { data: null, error: null };
    },
  };
  const input = { code: "BEMVINDO", active: true };

  await t.test("creation sends only p_coupon", async () => {
    await callCouponAdminRpc(db, input);
    assert.deepEqual(calls.at(-1), {
      name: "admin_create_coupon",
      args: { p_coupon: input },
    });
  });
  await t.test("update sends p_coupon_id and p_coupon", async () => {
    await callCouponAdminRpc(db, input, "coupon-id");
    assert.deepEqual(calls.at(-1), {
      name: "admin_update_coupon",
      args: { p_coupon_id: "coupon-id", p_coupon: input },
    });
  });
});
