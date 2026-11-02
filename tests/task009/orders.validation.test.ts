import assert from "node:assert/strict";
import test from "node:test";
import { parseAdminOrderAction } from "@/lib/orders/validation";

const orderItemId = "8f8b289a-56ae-4aa2-9448-7c3c643c37e7";

test("TASK-009 validates lifecycle actions and rejects malformed input", async (t) => {
  await t.test("pickup schedule must be a future timestamp", () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    assert.deepEqual(
      parseAdminOrderAction({ action: "schedule_pickup", scheduledPickupAt: future }),
      {
        action: "schedule_pickup",
        scheduledPickupAt: future,
      },
    );
    assert.equal(
      parseAdminOrderAction({ action: "schedule_pickup", scheduledPickupAt: "not-a-date" }),
      null,
    );
    assert.equal(
      parseAdminOrderAction({
        action: "schedule_pickup",
        scheduledPickupAt: "2020-01-01T00:00:00Z",
      }),
      null,
    );
  });

  await t.test("classification accepts only a UUID and explicit perishability", () => {
    assert.deepEqual(
      parseAdminOrderAction({ action: "classify_item", orderItemId, perishable: true }),
      { action: "classify_item", orderItemId, perishable: true },
    );
    assert.equal(
      parseAdminOrderAction({ action: "classify_item", orderItemId, perishable: "yes" }),
      null,
    );
  });

  await t.test("paid cancellation validates agreement and item quantities", () => {
    assert.deepEqual(
      parseAdminOrderAction({
        action: "cancel",
        customerAgreementConfirmed: true,
        usedQuantities: [{ orderItemId, quantityUsed: 1 }],
      }),
      {
        action: "cancel",
        customerAgreementConfirmed: true,
        usedQuantities: [{ orderItemId, quantityUsed: 1 }],
      },
    );
    assert.equal(
      parseAdminOrderAction({
        action: "cancel",
        usedQuantities: [{ orderItemId, quantityUsed: -1 }],
      }),
      null,
    );
    assert.equal(parseAdminOrderAction({ action: "cancel", usedQuantities: "all" }), null);
  });

  await t.test("issue records require a supported type and idempotency key", () => {
    const idempotencyKey = "be8e8617-0bd4-485b-a088-d654b4bb7560";
    assert.deepEqual(
      parseAdminOrderAction({
        action: "record_issue",
        orderItemId,
        issueType: "damage",
        idempotencyKey,
      }),
      { action: "record_issue", orderItemId, issueType: "damage", idempotencyKey },
    );
    assert.equal(
      parseAdminOrderAction({
        action: "record_issue",
        orderItemId,
        issueType: "free_text",
        idempotencyKey,
      }),
      null,
    );
  });
});
