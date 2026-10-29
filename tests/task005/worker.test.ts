import assert from "node:assert/strict";
import test from "node:test";
import { parsePollInterval, runExpirationCycle } from "@/workers/reservation-expiration.mjs";

test("TASK-005: intervalo do worker valida configuração e usa default configurável", () => {
  assert.equal(parsePollInterval(undefined), 60_000);
  assert.equal(parsePollInterval("15000"), 15_000);
  for (const input of ["0", "999", "3600001", "invalid"]) {
    assert.throws(() => parsePollInterval(input), /invalid_reservation_expiry_poll_interval/);
  }
});

test("TASK-005: worker chama apenas a RPC idempotente de expiração", async () => {
  const calls: Array<{ name: string; args: unknown }> = [];
  const count = await runExpirationCycle({
    async rpc(name: string, args: unknown) {
      calls.push({ name, args });
      return { data: 0, error: null };
    },
  });
  assert.equal(count, 0);
  assert.deepEqual(calls, [{ name: "expire_due_reservations", args: { p_limit: 100 } }]);
  await assert.rejects(
    runExpirationCycle({
      async rpc() {
        return { data: null, error: { code: "XX000" } };
      },
    }),
    /reservation_expiration_cycle_failed/,
  );
});
