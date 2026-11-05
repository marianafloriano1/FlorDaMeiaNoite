import assert from "node:assert/strict";
import test from "node:test";
import { renderNotification } from "../../src/lib/notifications/templates.mjs";

const reference = "f61d7c16-8acb-4474-9f94-6930b38d1f67";

test("renders safe transactional order content in pt-BR, en, es and ru", () => {
  for (const locale of ["pt-BR", "en", "es", "ru"] as const) {
    const message = renderNotification({
      type: "ready_for_pickup",
      locale,
      orderReference: reference,
    });
    assert.ok(message.subject.length > 0);
    assert.ok(message.text.includes(reference));
    assert.doesNotMatch(message.text, /cpf|customer email|customer phone|otp|token|password/i);
  }
});

test("status template only accepts defined order states", () => {
  const message = renderNotification({
    type: "order_status",
    locale: "en",
    orderReference: reference,
    orderStatus: "ready_for_pickup",
  });
  assert.match(message.text, /ready for pickup/);
  assert.throws(
    () =>
      renderNotification({
        type: "order_status",
        locale: "en",
        orderReference: reference,
        orderStatus: "secret",
      }),
    /invalid_notification_order_status/,
  );
});

test("invalid references are rejected before rendering", () => {
  assert.throws(
    () =>
      renderNotification({
        type: "order_created",
        locale: "pt-BR",
        orderReference: "not-a-reference",
      }),
    /invalid_notification_order_reference/,
  );
});
