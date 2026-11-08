import assert from "node:assert/strict";
import { mock, test } from "node:test";
import type { CreatedOrder } from "@/lib/orders/types";

let buildLink: () => string | null = () => null;
let rpcCalls = 0;
const order = {
  id: "order-id",
  reference: "FMN-TEST",
  reservation_id: "reservation-id",
  status: "awaiting_payment",
  total_brl: 120,
  items: [],
} as CreatedOrder;

mock.module("@/lib/auth/http", {
  namedExports: {
    requireSameOrigin: async () => true,
    requireSession: async () => ({ uid: "customer-id", role: "customer" }),
  },
});
mock.module("@/lib/supabase/server", {
  namedExports: {
    getSupabaseServerClient: async () => ({
      rpc: async () => {
        rpcCalls += 1;
        return { data: order, error: null };
      },
    }),
  },
});
mock.module("@/lib/orders/whatsapp", {
  namedExports: { buildWhatsAppOrderLink: () => buildLink() },
});

const request = () =>
  new Request("http://localhost/api/orders", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      quoteId: "11111111-1111-4111-8111-111111111111",
      idempotencyKey: "22222222-2222-4222-8222-222222222222",
      consent: true,
    }),
  });

test("order persistence does not depend on optional WhatsApp", async (t) => {
  const originalPhone = process.env.WHATSAPP_STORE_NUMBER;
  delete process.env.WHATSAPP_STORE_NUMBER;
  t.after(() => {
    if (originalPhone === undefined) delete process.env.WHATSAPP_STORE_NUMBER;
    else process.env.WHATSAPP_STORE_NUMBER = originalPhone;
  });
  const route = await import("@/app/api/orders/route");

  await t.test("missing WhatsApp configuration still returns the persisted order", async () => {
    buildLink = () => null;
    const before = rpcCalls;
    const response = await route.POST(request());
    const body = (await response.json()) as { order?: CreatedOrder; whatsappUrl?: string | null };

    assert.equal(response.status, 201);
    assert.equal(body.order?.id, order.id);
    assert.equal(body.whatsappUrl, null);
    assert.equal(rpcCalls, before + 1);
  });

  await t.test(
    "a link-generation exception does not turn a committed order into an error",
    async () => {
      buildLink = () => {
        throw new Error("synthetic WhatsApp link failure");
      };
      const before = rpcCalls;
      const response = await route.POST(request());
      const body = (await response.json()) as {
        order?: CreatedOrder;
        whatsappUrl?: string | null;
      };

      assert.equal(response.status, 201);
      assert.equal(body.order?.id, order.id);
      assert.equal(body.whatsappUrl, null);
      assert.equal(rpcCalls, before + 1);
    },
  );
});
