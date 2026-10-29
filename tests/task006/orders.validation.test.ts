import assert from "node:assert/strict";
import test from "node:test";
import {
  parseAdminOrderAction,
  parseCreateOrderInput,
  parseOrderQuoteInput,
} from "@/lib/orders/validation";
import { buildWhatsAppOrderLink } from "@/lib/orders/whatsapp";

const uuid = "8f8b289a-56ae-4aa2-9448-7c3c643c37e7";

test("TASK-006 validation and WhatsApp link", async (t) => {
  await t.test("quote and create payloads require valid UUIDs and explicit consent", () => {
    assert.deepEqual(parseOrderQuoteInput({ reservationId: uuid }), { reservationId: uuid });
    assert.equal(parseOrderQuoteInput({ reservationId: "bad" }), null);
    assert.equal(
      parseCreateOrderInput({ quoteId: uuid, idempotencyKey: uuid, consent: false }),
      null,
    );
    assert.deepEqual(
      parseCreateOrderInput({ quoteId: uuid, idempotencyKey: uuid, consent: true }),
      {
        quoteId: uuid,
        idempotencyKey: uuid,
        consent: true,
      },
    );
  });

  await t.test("admin actions accept only the defined operation and state values", () => {
    assert.deepEqual(parseAdminOrderAction({ action: "inspect", itemsConfirmed: true }), {
      action: "inspect",
      itemsConfirmed: true,
    });
    assert.equal(parseAdminOrderAction({ action: "transition", status: "cancelled" }), null);
    assert.deepEqual(parseAdminOrderAction({ action: "transition", status: "preparing" }), {
      action: "transition",
      status: "preparing",
    });
    assert.deepEqual(parseAdminOrderAction({ action: "confirm_payment" }), {
      action: "confirm_payment",
    });
  });

  await t.test("link generation fails closed without an official E.164 store number", () => {
    const prior = process.env.WHATSAPP_STORE_NUMBER;
    delete process.env.WHATSAPP_STORE_NUMBER;
    const order = {
      id: uuid,
      reference: uuid,
      reservation_id: uuid,
      status: "awaiting_payment" as const,
      total_brl: 1,
      items: [],
    };
    assert.equal(buildWhatsAppOrderLink(order, "https://shop.example.invalid"), null);
    if (prior) process.env.WHATSAPP_STORE_NUMBER = prior;
  });

  await t.test("WhatsApp URL is manual, encoded, BRL and contains no customer PII", () => {
    process.env.WHATSAPP_STORE_NUMBER = "+15555550199";
    const url = buildWhatsAppOrderLink(
      {
        id: uuid,
        reference: "06da7f4f-f61e-4e2a-9f57-3064c28f4d4c",
        reservation_id: uuid,
        status: "awaiting_payment",
        total_brl: 125.5,
        items: [
          {
            product_id: uuid,
            product_name: "Rosas",
            product_slug: "rosas",
            quantity: 2,
            selected_unit_price_brl: 62.75,
            current_unit_price_brl: 62.75,
            line_total_brl: 125.5,
          },
        ],
      },
      "https://shop.example.invalid",
    );
    assert.ok(url);
    const parsed = new URL(url);
    assert.equal(parsed.hostname, "wa.me");
    assert.equal(parsed.pathname, "/15555550199");
    const message = parsed.searchParams.get("text") ?? "";
    assert.match(message, /R\$\s*125,50/);
    assert.match(message, /https:\/\/shop\.example\.invalid\/orders\//);
    assert.doesNotMatch(message, /cpf|email|phone|token|password/i);
    delete process.env.WHATSAPP_STORE_NUMBER;
  });
});
