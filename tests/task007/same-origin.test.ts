import assert from "node:assert/strict";
import { mock, test } from "node:test";

let requestHeaders = new Headers();
mock.module("next/headers", {
  namedExports: { headers: async () => requestHeaders },
});
mock.module("@/lib/supabase/admin", {
  namedExports: { getSupabaseAdminClient: () => ({}) },
});
mock.module("@/lib/supabase/server", {
  namedExports: { getSupabaseServerClient: () => ({}) },
});

test("TASK-007: verificação same-origin aceita apenas origem correspondente", async () => {
  const { requireSameOrigin } = await import("@/lib/auth/http");

  requestHeaders = new Headers({ origin: "https://shop.example", host: "shop.example" });
  assert.equal(await requireSameOrigin(), true);

  requestHeaders = new Headers({ origin: "https://attacker.example", host: "shop.example" });
  assert.equal(await requireSameOrigin(), false);

  requestHeaders = new Headers({ host: "shop.example" });
  assert.equal(await requireSameOrigin(), false);

  requestHeaders = new Headers({
    origin: "https://shop.example",
    host: "shop.example",
    "sec-fetch-site": "cross-site",
  });
  assert.equal(await requireSameOrigin(), false);

  requestHeaders = new Headers({ origin: "not a URL", host: "shop.example" });
  assert.equal(await requireSameOrigin(), false);
});
