import assert from "node:assert/strict";
import test from "node:test";
import { runNotificationCycle } from "../../src/workers/transactional-notifications.mjs";

const entry = {
  id: "e98c3916-aecb-442c-a271-128aa09cd584",
  order_id: "9dfafc56-2e2d-4a15-8c87-c809f3d8157e",
  order_item_id: null,
  notification_type: "ready_for_pickup",
  idempotency_key: "task010:event:test:ready_for_pickup",
  lease_token: "317b40ad-1cfb-4bdc-bd09-09e3836bfe5d",
};
const order = {
  id: entry.order_id,
  customer_id: "8d25387f-8a29-4dc8-ae45-b737ae77b438",
  public_reference: "f61d7c16-8acb-4474-9f94-6930b38d1f67",
  status: "ready_for_pickup",
  scheduled_pickup_at: null,
};
const payload = {
  order_reference: order.public_reference,
  order_status: order.status,
  scheduled_pickup_at: null,
};

function createClient({
  begin = true,
  channelStatus = { enabled: true, can_send: true, budget_alert: false },
} = {}) {
  const calls: Array<{ name: string; args?: unknown }> = [];
  return {
    calls,
    rpc(name: string, args?: unknown) {
      calls.push({ name, args });
      if (name === "notification_channel_status")
        return Promise.resolve({ data: channelStatus, error: null });
      if (name === "claim_notification_outbox")
        return Promise.resolve({ data: [entry], error: null });
      if (name === "begin_notification_dispatch")
        return Promise.resolve({ data: begin, error: null });
      if (name === "finish_notification_dispatch")
        return Promise.resolve({ data: true, error: null });
      if (name === "purge_notification_data") return Promise.resolve({ data: {}, error: null });
      throw new Error(`unexpected_rpc_${name}`);
    },
    from(table: string) {
      const query = {
        select() {
          return this;
        },
        eq() {
          return this;
        },
        maybeSingle() {
          if (table === "orders") return Promise.resolve({ data: order, error: null });
          if (table === "notification_payloads")
            return Promise.resolve({ data: { payload }, error: null });
          throw new Error(`unexpected_table_${table}`);
        },
      };
      return query;
    },
    auth: {
      admin: {
        getUserById: async () => ({
          data: {
            user: {
              email: "customer@example.invalid",
              user_metadata: { notification_locale: "en" },
            },
          },
          error: null,
        }),
      },
    },
  };
}

test("worker sends one safe localized transactional message and records provider acceptance", async () => {
  const client = createClient();
  const messages: unknown[] = [];
  const logs: unknown[] = [];
  const adapter = {
    send: async (message: unknown) => {
      messages.push(message);
      return { accepted: true, providerMessageId: "synthetic-message-1" };
    },
  };
  const logger = {
    info: (...args: unknown[]) => logs.push(args),
    warn: (...args: unknown[]) => logs.push(args),
    error: (...args: unknown[]) => logs.push(args),
  };

  const result = await runNotificationCycle(client, adapter, { logger });

  assert.deepEqual(result, { claimed: 1, sent: 1, failed: 0, disabled: false });
  assert.equal(messages.length, 1);
  assert.match((messages[0] as { text: string }).text, /Your order is ready for pickup/);
  assert.equal((messages[0] as { to: string }).to, "customer@example.invalid");
  const finishedCall = client.calls.find((call) => call.name === "finish_notification_dispatch");
  assert.ok(finishedCall);
  assert.equal((finishedCall.args as { p_outcome: string }).p_outcome, "accepted");
  assert.doesNotMatch(JSON.stringify(logs), /customer@example\.invalid/);
});

test("a failed begin-dispatch check prevents the external send", async () => {
  const client = createClient({ begin: false });
  let sends = 0;
  const result = await runNotificationCycle(
    client,
    {
      send: async () => {
        sends += 1;
        return { accepted: true };
      },
    },
    {
      logger: { info() {}, warn() {}, error() {} },
    },
  );
  assert.equal(result.sent, 0);
  assert.equal(sends, 0);
});

test("disabled channel does not claim or send queued messages", async () => {
  const client = createClient({
    channelStatus: { enabled: false, can_send: false, budget_alert: false },
  });
  let sends = 0;
  const result = await runNotificationCycle(
    client,
    {
      send: async () => {
        sends += 1;
        return { accepted: true };
      },
    },
    {
      logger: { info() {}, warn() {}, error() {} },
    },
  );
  assert.deepEqual(result, { claimed: 0, sent: 0, failed: 0, disabled: true });
  assert.equal(sends, 0);
  assert.equal(
    client.calls.some((call) => call.name === "claim_notification_outbox"),
    false,
  );
});

test("temporary provider failure is recorded for bounded retry", async () => {
  const client = createClient();
  const result = await runNotificationCycle(
    client,
    {
      send: async () => {
        throw Object.assign(new Error("synthetic temporary failure"), {
          code: "notification_smtp_temporary_failure",
        });
      },
    },
    { logger: { info() {}, warn() {}, error() {} } },
  );
  assert.equal(result.failed, 1);
  const finish = client.calls.find((call) => call.name === "finish_notification_dispatch");
  assert.ok(finish);
  assert.equal((finish.args as { p_outcome: string }).p_outcome, "retryable");
});

test("ambiguous provider acceptance is recorded as delivery unknown, never retried", async () => {
  const client = createClient();
  const result = await runNotificationCycle(
    client,
    {
      send: async () => {
        throw Object.assign(new Error("synthetic ambiguous DATA failure"), {
          code: "notification_delivery_unknown",
          retrySafe: false,
        });
      },
    },
    { logger: { info() {}, warn() {}, error() {} } },
  );
  assert.equal(result.failed, 0);
  const finish = client.calls.find((call) => call.name === "finish_notification_dispatch");
  assert.ok(finish);
  assert.equal((finish.args as { p_outcome: string }).p_outcome, "unknown");
});
