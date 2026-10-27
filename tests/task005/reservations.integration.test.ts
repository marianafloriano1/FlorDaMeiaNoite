import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.TASK005_TEST_SUPABASE_URL;
const anonKey = process.env.TASK005_TEST_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.TASK005_TEST_SUPABASE_SERVICE_ROLE_KEY;
const configured = Boolean(url && anonKey && serviceRoleKey);

type TestCustomer = { id: string; client: SupabaseClient; cartId: string };

async function createCustomer(
  admin: SupabaseClient,
  supabaseUrl: string,
  publicKey: string,
  cleanupUserIds: string[],
): Promise<TestCustomer> {
  const email = `task005-${randomUUID()}@example.invalid`;
  const password = `T5-${randomUUID()}-Aa1!`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role: "customer" },
  });
  if (error || !data.user) {
    throw new Error(`synthetic_customer_creation_failed: ${error?.message ?? "user_not_returned"}`);
  }

  cleanupUserIds.push(data.user.id);

  const client = createClient(supabaseUrl, publicKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) {
    throw new Error(`synthetic_customer_login_failed: ${signInError.message}`);
  }
  const { data: cart, error: cartError } = await client
    .from("carts")
    .insert({ customer_id: data.user.id })
    .select("id")
    .single();
  if (cartError || !cart) throw new Error("synthetic_cart_creation_failed");
  return { id: data.user.id, client, cartId: cart.id as string };
}

async function createProduct(
  admin: SupabaseClient,
  stock: number,
  cleanupProductIds: string[],
): Promise<string> {
  const { data, error } = await admin
    .from("catalog_products")
    .insert({
      slug: `task005-${randomUUID()}`,
      name: "Fixture sintética TASK-005",
      product_type: "fixture",
      description: "Dado sintético para validação local.",
      price_brl: 1,
      category_name: "Flores",
      stock_quantity: stock,
      status: "published",
    })
    .select("id")
    .single();
  if (error || !data) {
    throw new Error(
      `synthetic_product_creation_failed: ${JSON.stringify({
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
      })}`,
    );
  }
  cleanupProductIds.push(data.id as string);
  return data.id as string;
}

async function addCartItem(customer: TestCustomer, productId: string, quantity = 1) {
  const { error } = await customer.client
    .from("cart_items")
    .insert({ cart_id: customer.cartId, product_id: productId, quantity });
  if (error) throw new Error("synthetic_cart_item_creation_failed");
}

async function readStock(admin: SupabaseClient, productId: string): Promise<number> {
  const { data, error } = await admin
    .from("catalog_products")
    .select("stock_quantity")
    .eq("id", productId)
    .single();
  if (error || !data) throw new Error("synthetic_stock_read_failed");
  return data.stock_quantity as number;
}

const suite = test("TASK-005: Supabase isolado valida RLS, atomicidade, rollback e idempotência", {
  skip: configured
    ? false
    : "NOT RUN: configure URL/chaves exclusivamente de Supabase local isolado.",
}, async (t) => {
  const parsedUrl = new URL(url as string);
  assert.ok(
    ["localhost", "127.0.0.1", "::1"].includes(parsedUrl.hostname),
    "testes TASK-005 recusam endpoints remotos",
  );

  const admin = createClient(url as string, serviceRoleKey as string, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const users: string[] = [];
  const products: string[] = [];

  try {
    const customerA = await createCustomer(admin, url as string, anonKey as string, users);
    const customerB = await createCustomer(admin, url as string, anonKey as string, users);

    await t.test("última unidade: exatamente uma reserva concorrente vence", async () => {
      const productId = await createProduct(admin, 1, products);
      await addCartItem(customerA, productId);
      await addCartItem(customerB, productId);
      const requests = await Promise.all([
        customerA.client.rpc("create_cart_reservation", {
          p_cart_id: customerA.cartId,
          p_selected_product_ids: [productId],
          p_idempotency_key: randomUUID(),
        }),
        customerB.client.rpc("create_cart_reservation", {
          p_cart_id: customerB.cartId,
          p_selected_product_ids: [productId],
          p_idempotency_key: randomUUID(),
        }),
      ]);
      assert.equal(requests.filter((result) => !result.error).length, 1);
      assert.equal(
        requests.filter((result) => result.error?.message.includes("product_unavailable")).length,
        1,
      );
      assert.equal(await readStock(admin, productId), 0);
      const { count, error } = await admin
        .from("reservations")
        .select("id", { count: "exact", head: true })
        .in("customer_id", [customerA.id, customerB.id])
        .eq("status", "active");
      assert.equal(error, null);
      assert.equal(count, 1);
      const winnerIndex = requests.findIndex((result) => !result.error);
      const winner = winnerIndex === 0 ? customerA : customerB;
      const reservationId = (requests[winnerIndex].data as { id: string }).id;
      const cancelled = await winner.client.rpc("cancel_cart_reservation", {
        p_reservation_id: reservationId,
      });
      assert.equal(cancelled.data, true);
      assert.equal(await readStock(admin, productId), 1);
    });

    await t.test(
      "uma reserva ativa por cliente e cancelamento repetido não liberam duas vezes",
      async () => {
        const productId = await createProduct(admin, 3, products);
        await addCartItem(customerA, productId);
        const idempotencyKey = randomUUID();
        const first = await customerA.client.rpc("create_cart_reservation", {
          p_cart_id: customerA.cartId,
          p_selected_product_ids: [productId],
          p_idempotency_key: idempotencyKey,
        });
        assert.equal(first.error, null);
        const second = await customerA.client.rpc("create_cart_reservation", {
          p_cart_id: customerA.cartId,
          p_selected_product_ids: [productId],
          p_idempotency_key: randomUUID(),
        });
        assert.match(second.error?.message ?? "", /active_reservation_exists/);
        const reservationId = (first.data as { id: string }).id;
        const cancelled = await customerA.client.rpc("cancel_cart_reservation", {
          p_reservation_id: reservationId,
        });
        const repeated = await customerA.client.rpc("cancel_cart_reservation", {
          p_reservation_id: reservationId,
        });
        assert.equal(cancelled.data, true);
        assert.equal(repeated.data, false);
        assert.equal(await readStock(admin, productId), 3);
        const { count, error } = await admin
          .from("inventory_ledger")
          .select("id", { count: "exact", head: true })
          .eq("reservation_id", reservationId)
          .eq("event_type", "cancelled_release");
        assert.equal(error, null);
        assert.equal(count, 1);
      },
    );

    await t.test("expiração repetida muda o estado e devolve saldo uma única vez", async () => {
      const productId = await createProduct(admin, 2, products);
      await addCartItem(customerB, productId);
      const result = await customerB.client.rpc("create_cart_reservation", {
        p_cart_id: customerB.cartId,
        p_selected_product_ids: [productId],
        p_idempotency_key: randomUUID(),
      });
      assert.equal(result.error, null);
      const reservationId = (result.data as { id: string }).id;
      const { error: expireDateError } = await admin
        .from("reservations")
        .update({ expires_at: new Date(Date.now() - 60_000).toISOString() })
        .eq("id", reservationId);
      assert.equal(expireDateError, null);
      const first = await admin.rpc("expire_due_reservations", { p_limit: 100 });
      const second = await admin.rpc("expire_due_reservations", { p_limit: 100 });
      assert.equal(first.data, 1);
      assert.equal(second.data, 0);
      assert.equal(await readStock(admin, productId), 2);
      const { count, error } = await admin
        .from("inventory_ledger")
        .select("id", { count: "exact", head: true })
        .eq("reservation_id", reservationId)
        .eq("event_type", "expired_release");
      assert.equal(error, null);
      assert.equal(count, 1);
    });

    await t.test("falha em um item reverte toda a reserva e o estoque", async () => {
      const availableId = await createProduct(admin, 2, products);
      const emptyId = await createProduct(admin, 0, products);
      await addCartItem(customerA, availableId);
      await addCartItem(customerA, emptyId);
      const result = await customerA.client.rpc("create_cart_reservation", {
        p_cart_id: customerA.cartId,
        p_selected_product_ids: [availableId, emptyId],
        p_idempotency_key: randomUUID(),
      });
      assert.match(result.error?.message ?? "", /product_unavailable/);
      assert.equal(await readStock(admin, availableId), 2);
      assert.equal(await readStock(admin, emptyId), 0);
      const { count, error } = await admin
        .from("reservations")
        .select("id", { count: "exact", head: true })
        .eq("customer_id", customerA.id)
        .eq("status", "active");
      assert.equal(error, null);
      assert.equal(count, 0);
    });

    await t.test("anon não pode criar carrinho", async () => {
      const anonymous = createClient(url as string, anonKey as string, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const result = await anonymous.from("carts").insert({ customer_id: customerA.id });
      assert.ok(result.error);
    });
  } finally {
    await Promise.all(users.map((id) => admin.from("reservations").delete().eq("customer_id", id)));
    await Promise.all(users.map((id) => admin.auth.admin.deleteUser(id)));
    await Promise.all(products.map((id) => admin.from("catalog_products").delete().eq("id", id)));
  }
});

void suite;
