import assert from "node:assert/strict";
import test from "node:test";
import { runCatalogStockAlertCycle } from "../../src/workers/catalog-stock-alerts.mjs";

function mockClient(event: Record<string, unknown>) {
  const completed: Array<Record<string, unknown>> = [];
  return {
    completed,
    async rpc(name: string, args: Record<string, unknown>) {
      if (name === "claim_catalog_stock_alerts") return { data: [event], error: null };
      if (name === "finish_catalog_stock_alert") {
        completed.push(args);
        return { data: true, error: null };
      }
      throw new Error("unexpected_rpc");
    },
    from(table: string) {
      assert.equal(table, "catalog_products");
      return {
        select() {
          return this;
        },
        eq() {
          return this;
        },
        async maybeSingle() {
          return { data: { name: "Rosa sintética", slug: "rosa-sintetica" }, error: null };
        },
      };
    },
  };
}

const event = {
  id: "event-1",
  product_id: "product-1",
  quantity_before: 8,
  quantity_after: 7,
  idempotency_key: "dedupe-key-1",
  attempt: 1,
};

test("TASK-007: worker envia evento de cruzamento com chave idempotente e sem PII de cliente", async () => {
  const client = mockClient(event);
  let request: { headers: Headers; body: string } | null = null;
  const result = await runCatalogStockAlertCycle(client, {
    endpoint: "https://mail-gateway.example.invalid/send",
    token: "synthetic-token",
    recipient: "staff@example.invalid",
    fetchImpl: async (_url: string, init: RequestInit) => {
      request = { headers: new Headers(init.headers), body: String(init.body) };
      return { ok: true, status: 202 } as Response;
    },
  });
  assert.deepEqual(result, { claimed: 1, sent: 1 });
  assert.equal(request?.headers.get("idempotency-key"), event.idempotency_key);
  assert.match(request?.body ?? "", /Rosa sintética/);
  assert.doesNotMatch(request?.body ?? "", /cpf|customerEmail|customerPhone/i);
  assert.equal(client.completed[0].p_sent, true);
});

test("TASK-007: falha do gateway registra retry sem marcar alerta como enviado", async () => {
  const client = mockClient(event);
  await runCatalogStockAlertCycle(client, {
    endpoint: "https://mail-gateway.example.invalid/send",
    token: "synthetic-token",
    recipient: "staff@example.invalid",
    fetchImpl: async () => ({ ok: false, status: 503 }) as Response,
  });
  assert.equal(client.completed[0].p_sent, false);
  assert.equal(client.completed[0].p_error_code, "provider_http_503");
});
