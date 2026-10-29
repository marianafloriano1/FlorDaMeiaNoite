import assert from "node:assert/strict";
import { mock, test } from "node:test";

type Role = "admin" | "employee" | "customer";
type Identity = { uid: string; role: Role } | null;

let sameOrigin = true;
let identity: Identity = null;
let recentMfa = false;
let sessionCalls = 0;
const createdProducts: Array<Record<string, unknown>> = [];
const stockAdjustments: unknown[][] = [];

mock.module("@/lib/auth/http", {
  namedExports: {
    requireSameOrigin: async () => sameOrigin,
    requireSession: async () => {
      sessionCalls += 1;
      return identity;
    },
    hasAdminStepUp: async () => recentMfa,
  },
});
mock.module("@/lib/catalog/admin-service", {
  namedExports: {
    createCatalogProduct: async (input: Record<string, unknown>) => {
      createdProducts.push(input);
      return { id: "11111111-1111-4111-8111-111111111111", ...input };
    },
    listAdminCatalogProducts: async () => [],
    updateCatalogProduct: async () => null,
    adjustCatalogStock: async (...args: unknown[]) => {
      stockAdjustments.push(args);
      return { stockBefore: 8, stockAfter: 7, ledgerId: "synthetic-ledger-entry" };
    },
  },
});

const productInput = {
  slug: "rosa-sintetica",
  name: "Rosa sintética",
  productType: "Rosa",
  description: "Produto de teste sintético.",
  colors: ["vermelho"],
  priceBrl: 12.5,
  category: "Flores",
  occasion: null,
  size: null,
  materials: ["rosa"],
  careInstructions: "Informação não disponível.",
  flowerMeaning: "Informação não disponível.",
  petToxicity: "Informação não disponível.",
  shelfLife: "Informação não disponível.",
  status: "draft",
};

function productRequest() {
  return new Request("http://localhost/api/admin/catalog/products", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(productInput),
  });
}

function stockRequest() {
  return new Request(
    "http://localhost/api/admin/catalog/products/11111111-1111-4111-8111-111111111111/stock",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ newQuantity: 7, reason: "Contagem sintética" }),
    },
  );
}

function testIdentity(role: Role): Identity {
  return { uid: `synthetic-${role}-uid`, role };
}

test("TASK-007: handlers HTTP administrativos aplicam sessão, RBAC, same-origin e MFA", async (t) => {
  const products = await import("@/app/api/admin/catalog/products/route");
  const stock = await import("@/app/api/admin/catalog/products/[productId]/stock/route");

  await t.test("mutação cross-origin retorna 403 antes de consultar a sessão", async () => {
    sameOrigin = false;
    identity = null;
    sessionCalls = 0;
    const response = await products.POST(productRequest());
    assert.equal(response.status, 403);
    assert.deepEqual(await response.json(), { error: "forbidden" });
    assert.equal(sessionCalls, 0);
  });

  await t.test("sessão ausente retorna 401", async () => {
    sameOrigin = true;
    identity = null;
    const response = await products.POST(productRequest());
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { error: "authentication_required" });
  });

  await t.test("papel customer retorna 403", async () => {
    identity = testIdentity("customer");
    const response = await products.POST(productRequest());
    assert.equal(response.status, 403);
    assert.deepEqual(await response.json(), { error: "catalog_operator_required" });
  });

  await t.test("employee autorizado pode cadastrar produto", async () => {
    identity = testIdentity("employee");
    const response = await products.POST(productRequest());
    assert.equal(response.status, 201);
    assert.equal((await response.json()).product.name, productInput.name);
    assert.deepEqual(createdProducts.at(-1), productInput);
  });

  await t.test("admin sem step-up recente recebe 428", async () => {
    identity = testIdentity("admin");
    recentMfa = false;
    const response = await products.POST(productRequest());
    assert.equal(response.status, 428);
    assert.deepEqual(await response.json(), { error: "admin_mfa_required" });
  });

  await t.test("admin com step-up recente pode ajustar estoque", async () => {
    identity = testIdentity("admin");
    recentMfa = true;
    const response = await stock.POST(stockRequest(), {
      params: Promise.resolve({ productId: "11111111-1111-4111-8111-111111111111" }),
    });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).adjustment.stockAfter, 7);
    assert.deepEqual(stockAdjustments.at(-1), [
      "11111111-1111-4111-8111-111111111111",
      7,
      "Contagem sintética",
      "synthetic-admin-uid",
    ]);
  });
});
