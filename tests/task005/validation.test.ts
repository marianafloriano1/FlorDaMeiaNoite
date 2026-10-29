import assert from "node:assert/strict";
import test from "node:test";
import {
  isProductSlug,
  isUuid,
  parseCartItemInput,
  parseProductSlugInput,
  parseReservationInput,
} from "@/lib/cart/validation";

const productA = "4b9d3d33-8b90-4f2f-a24c-03a6590bfe01";
const productB = "ba750f35-09c3-4f76-a4c0-337c84f05002";
const requestId = "7d98ff32-055f-4a44-8f6c-8f6db4b56d18";

test("TASK-005: valida entrada de carrinho sem aceitar quantidade ou slug inválido", () => {
  assert.deepEqual(parseCartItemInput({ productSlug: "rosa-champagne", quantity: 1 }), {
    productSlug: "rosa-champagne",
    quantity: 1,
  });
  for (const quantity of [0, -1, 1.5, "1", Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal(parseCartItemInput({ productSlug: "rosa-champagne", quantity }), null);
  }
  assert.equal(
    parseCartItemInput({ productSlug: "rosa-champagne", quantity: 1, customerId: "other" }),
    null,
  );
  assert.equal(parseProductSlugInput({ productSlug: "rosa-champagne" }), "rosa-champagne");
  assert.equal(parseProductSlugInput({ productSlug: "rosa-champagne", owner: "other" }), null);
  assert.equal(isProductSlug("not a slug"), false);
  assert.equal(isUuid("not-a-uuid"), false);
});

test("TASK-005: reserva exige seleção não vazia, UUIDs únicos e chave idempotente", () => {
  assert.deepEqual(
    parseReservationInput({ productIds: [productA, productB], idempotencyKey: requestId }),
    {
      productIds: [productA, productB],
      idempotencyKey: requestId,
    },
  );
  assert.equal(parseReservationInput({ productIds: [], idempotencyKey: requestId }), null);
  assert.equal(
    parseReservationInput({ productIds: [productA, productA], idempotencyKey: requestId }),
    null,
  );
  assert.equal(parseReservationInput({ productIds: [productA], idempotencyKey: "invalid" }), null);
  assert.equal(
    parseReservationInput({
      productIds: [productA],
      idempotencyKey: requestId,
      customerId: "other",
    }),
    null,
  );
});
