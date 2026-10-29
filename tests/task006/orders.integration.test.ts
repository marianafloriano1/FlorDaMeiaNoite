import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import test from "node:test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.TASK006_TEST_SUPABASE_URL;
const anonKey = process.env.TASK006_TEST_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.TASK006_TEST_SUPABASE_SERVICE_ROLE_KEY;
const configured = Boolean(url && anonKey && serviceRoleKey);

function decodeBase32(secret: string) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const character of secret.toUpperCase().replace(/=+$/, "")) {
    const index = alphabet.indexOf(character);
    if (index < 0) throw new Error("invalid_totp_secret");
    bits += index.toString(2).padStart(5, "0");
  }
  const bytes: number[] = [];
  for (let offset = 0; offset + 8 <= bits.length; offset += 8)
    bytes.push(Number.parseInt(bits.slice(offset, offset + 8), 2));
  return Buffer.from(bytes);
}

function currentTotp(secret: string) {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30_000)));
  const digest = createHmac("sha1", decodeBase32(secret)).update(counter).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const value = digest.readUInt32BE(offset) & 0x7fffffff;
  return String(value % 1_000_000).padStart(6, "0");
}

test("TASK-006: Supabase isolado valida cotação, consentimento, pedido, papéis e expiração", {
  skip: !configured,
}, async (t) => {
  const admin = createClient(url as string, serviceRoleKey as string, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const anonymous = createClient(url as string, anonKey as string, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const createdUsers: string[] = [];
  const createdProducts: string[] = [];
  async function createCustomer() {
    const email = `task006-${randomUUID()}@example.invalid`;
    const password = `T6-${randomUUID()}-Aa1!`;
    const result = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: { role: "customer" },
    });
    assert.equal(result.error, null);
    assert.ok(result.data.user);
    const id = result.data.user.id;
    createdUsers.push(id);
    const client = createClient(url as string, anonKey as string, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const login = await client.auth.signInWithPassword({ email, password });
    assert.equal(login.error, null);
    const cart = await client.from("carts").insert({ customer_id: id }).select("id").single();
    assert.equal(cart.error, null);
    return { id, client, cartId: cart.data.id as string };
  }
  async function createProduct(stock: number, price: number) {
    const slug = `task006-${randomUUID()}`;
    const result = await admin
      .from("catalog_products")
      .insert({
        slug,
        name: "Fixture TASK-006",
        product_type: "fixture",
        description: "Dado sintético.",
        price_brl: price,
        category_name: "Arranjos",
        stock_quantity: stock,
        status: "published",
      })
      .select("id")
      .single();
    assert.equal(result.error, null);
    createdProducts.push(result.data.id as string);
    return result.data.id as string;
  }
  async function reserve(
    customer: { id: string; client: SupabaseClient; cartId: string },
    productId: string,
  ) {
    assert.equal(
      (
        await customer.client
          .from("cart_items")
          .insert({ cart_id: customer.cartId, product_id: productId, quantity: 1 })
      ).error,
      null,
    );
    const result = await customer.client.rpc("create_cart_reservation", {
      p_cart_id: customer.cartId,
      p_selected_product_ids: [productId],
      p_idempotency_key: randomUUID(),
    });
    assert.equal(result.error, null);
    return (result.data as { id: string }).id;
  }
  async function quoteAndCreate(customer: { client: SupabaseClient }, reservationId: string) {
    const quoted = await customer.client.rpc("create_order_quote", {
      p_reservation_id: reservationId,
    });
    assert.equal(quoted.error, null);
    const quote = quoted.data as {
      quote_id: string;
      price_changed: boolean;
      total_brl: number;
      items: Array<{ selected_unit_price_brl: number; current_unit_price_brl: number }>;
    };
    const created = await customer.client.rpc("create_order_from_quote", {
      p_quote_id: quote.quote_id,
      p_idempotency_key: randomUUID(),
      p_consent: true,
    });
    assert.equal(created.error, null);
    return {
      quote,
      order: created.data as { id: string; reference: string; status: string; total_brl: number },
    };
  }
  async function createAdmin() {
    const email = `task006-admin-${randomUUID()}@example.invalid`;
    const password = `T6-${randomUUID()}-Aa1!`;
    const user = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: { role: "admin" },
    });
    assert.equal(user.error, null);
    assert.ok(user.data.user);
    createdUsers.push(user.data.user.id);
    const client = createClient(url as string, anonKey as string, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const login = await client.auth.signInWithPassword({ email, password });
    assert.equal(login.error, null);
    const enrolled = await client.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "TASK-006 CI synthetic",
    });
    assert.equal(enrolled.error, null);
    assert.ok(enrolled.data.totp?.secret);
    const verified = await client.auth.mfa.challengeAndVerify({
      factorId: enrolled.data.id,
      code: currentTotp(enrolled.data.totp.secret),
    });
    assert.equal(verified.error, null);
    const { data: refreshed } = await client.auth.getSession();
    const session = refreshed.session;
    assert.ok(session);
    const claims = JSON.parse(
      Buffer.from(session.access_token.split(".")[1], "base64url").toString("utf8"),
    ) as { session_id: string };
    const inserted = await admin.from("admin_auth_sessions").insert({
      session_id: claims.session_id,
      user_id: user.data.user.id,
      mfa_verified_at: new Date().toISOString(),
      last_activity_at: new Date().toISOString(),
      revoked_at: null,
    });
    assert.equal(inserted.error, null);
    return client;
  }

  try {
    const customer = await createCustomer();
    const other = await createCustomer();
    const adminClient = await createAdmin();
    const product = await createProduct(2, 10);
    const reservationId = await reserve(customer, product);
    assert.equal(
      (await admin.from("catalog_products").update({ price_brl: 12 }).eq("id", product)).error,
      null,
    );

    await t.test(
      "preço mudou desde a seleção: diferença indicada e consentimento explícito cria snapshot atualizado",
      async () => {
        const quoted = await customer.client.rpc("create_order_quote", {
          p_reservation_id: reservationId,
        });
        assert.equal(quoted.error, null);
        const quote = quoted.data as {
          quote_id: string;
          price_changed: boolean;
          total_brl: number;
          items: Array<{ selected_unit_price_brl: number; current_unit_price_brl: number }>;
        };
        assert.equal(quote.price_changed, true);
        assert.equal(quote.total_brl, 12);
        assert.equal(quote.items[0].selected_unit_price_brl, 10);
        assert.equal(quote.items[0].current_unit_price_brl, 12);
        const denied = await customer.client.rpc("create_order_from_quote", {
          p_quote_id: quote.quote_id,
          p_idempotency_key: randomUUID(),
          p_consent: false,
        });
        assert.match(denied.error?.message ?? "", /order_consent_required/);
        const created = await customer.client.rpc("create_order_from_quote", {
          p_quote_id: quote.quote_id,
          p_idempotency_key: randomUUID(),
          p_consent: true,
        });
        assert.equal(created.error, null);
        const order = created.data as {
          id: string;
          reference: string;
          status: string;
          total_brl: number;
        };
        assert.equal(order.total_brl, 12);
        assert.equal(order.status, "awaiting_payment");
        const lines = await customer.client
          .from("order_items")
          .select("unit_price_brl,quantity")
          .eq("order_id", order.id)
          .single();
        assert.equal(lines.data?.unit_price_brl, 12);
        const hidden = await other.client.from("orders").select("id").eq("id", order.id);
        assert.equal(hidden.data?.length ?? 0, 0);
        const forbiddenPayment = await other.client.rpc("confirm_order_payment", {
          p_order_id: order.id,
        });
        assert.match(forbiddenPayment.error?.message ?? "", /admin_role_required/);
        const anonRead = await anonymous.from("orders").select("id");
        assert.ok(anonRead.error);
      },
    );

    await t.test(
      "retry concorrente com a mesma idempotency key devolve o mesmo pedido",
      async () => {
        const retryCustomer = await createCustomer();
        const retryProduct = await createProduct(1, 14);
        const retryReservation = await reserve(retryCustomer, retryProduct);
        const quoteResult = await retryCustomer.client.rpc("create_order_quote", {
          p_reservation_id: retryReservation,
        });
        assert.equal(quoteResult.error, null);
        const quote = quoteResult.data as { quote_id: string };
        const idempotencyKey = randomUUID();
        const createOrder = () =>
          retryCustomer.client.rpc("create_order_from_quote", {
            p_quote_id: quote.quote_id,
            p_idempotency_key: idempotencyKey,
            p_consent: true,
          });
        const [first, second] = await Promise.all([createOrder(), createOrder()]);
        assert.equal(first.error, null);
        assert.equal(second.error, null);
        const orders = [first.data, second.data] as Array<{
          id: string;
          reference: string;
          idempotent_replay: boolean;
        }>;
        assert.equal(orders[0].id, orders[1].id);
        assert.equal(orders[0].reference, orders[1].reference);
        assert.deepEqual(orders.map((order) => order.idempotent_replay).sort(), [false, true]);
        const persisted = await admin
          .from("orders")
          .select("id")
          .eq("customer_id", retryCustomer.id)
          .eq("idempotency_key", idempotencyKey);
        assert.equal(persisted.error, null);
        assert.equal(persisted.data?.length, 1);
        const items = await admin.from("order_items").select("id").eq("order_id", orders[0].id);
        assert.equal(items.error, null);
        assert.equal(items.data?.length, 1);
      },
    );

    await t.test(
      "preço alterado após a cotação aborta o commit sem consumir reserva nem cotação",
      async () => {
        const priceCustomer = await createCustomer();
        const priceProduct = await createProduct(1, 14);
        const priceReservation = await reserve(priceCustomer, priceProduct);
        const quoteResult = await priceCustomer.client.rpc("create_order_quote", {
          p_reservation_id: priceReservation,
        });
        assert.equal(quoteResult.error, null);
        const quote = quoteResult.data as { quote_id: string };
        const idempotencyKey = randomUUID();
        assert.equal(
          (await admin.from("catalog_products").update({ price_brl: 15 }).eq("id", priceProduct))
            .error,
          null,
        );
        const rejected = await priceCustomer.client.rpc("create_order_from_quote", {
          p_quote_id: quote.quote_id,
          p_idempotency_key: idempotencyKey,
          p_consent: true,
        });
        assert.match(rejected.error?.message ?? "", /order_quote_changed/);
        const persisted = await admin
          .from("orders")
          .select("id")
          .eq("customer_id", priceCustomer.id)
          .eq("idempotency_key", idempotencyKey);
        assert.equal(persisted.error, null);
        assert.equal(persisted.data?.length, 0);
        const unchangedReservation = await admin
          .from("reservations")
          .select("status")
          .eq("id", priceReservation)
          .single();
        assert.equal(unchangedReservation.data?.status, "active");
        const unusedQuote = await admin
          .from("order_quotes")
          .select("used_at")
          .eq("id", quote.quote_id)
          .single();
        assert.equal(unusedQuote.data?.used_at, null);
        const refreshedQuote = await priceCustomer.client.rpc("create_order_quote", {
          p_reservation_id: priceReservation,
        });
        assert.equal(refreshedQuote.error, null);
        assert.equal((refreshedQuote.data as { total_brl: number }).total_brl, 15);
      },
    );

    const orderData = await customer.client
      .from("orders")
      .select("id,reservation_id,status")
      .eq("reservation_id", reservationId)
      .single();
    assert.equal(orderData.error, null);
    const orderId = orderData.data.id as string;
    await t.test(
      "inspeção, step-up do admin e pagamento concluem reserva sem devolver estoque",
      async () => {
        const inspection = await adminClient.rpc("record_order_inspection", {
          p_order_id: orderId,
          p_items_confirmed: true,
        });
        assert.equal(inspection.error, null);
        const approved = await adminClient.rpc("approve_order_inspection", { p_order_id: orderId });
        assert.equal(approved.error, null);
        const paid = await adminClient.rpc("confirm_order_payment", { p_order_id: orderId });
        assert.equal(paid.error, null);
        const repeated = await adminClient.rpc("confirm_order_payment", { p_order_id: orderId });
        assert.equal(repeated.error, null);
        const reservation = await admin
          .from("reservations")
          .select("status")
          .eq("id", reservationId)
          .single();
        assert.equal(reservation.data?.status, "completed");
        const inventory = await admin
          .from("catalog_products")
          .select("stock_quantity")
          .eq("id", product)
          .single();
        assert.equal(inventory.data?.stock_quantity, 1);
        const after = await admin.rpc("expire_due_reservations", { p_limit: 100 });
        assert.equal(after.error, null);
      },
    );

    const expiringProduct = await createProduct(1, 25);
    const expiringReservation = await reserve(customer, expiringProduct);
    const created = await quoteAndCreate(customer, expiringReservation);
    await admin
      .from("reservations")
      .update({ expires_at: new Date(Date.now() - 60_000).toISOString() })
      .eq("id", expiringReservation);
    const first = await admin.rpc("expire_due_reservations", { p_limit: 100 });
    const second = await admin.rpc("expire_due_reservations", { p_limit: 100 });
    assert.equal(first.data, 1);
    assert.equal(second.data, 0);
    const expiredOrder = await admin
      .from("orders")
      .select("status,cancellation_reason,payment_confirmed_at")
      .eq("id", created.order.id)
      .single();
    assert.equal(expiredOrder.data?.status, "cancelled");
    assert.equal(expiredOrder.data?.cancellation_reason, "reservation_expired");
    assert.equal(expiredOrder.data?.payment_confirmed_at, null);
    assert.match(
      (await adminClient.rpc("confirm_order_payment", { p_order_id: created.order.id })).error
        ?.message ?? "",
      /order_not_payable/,
    );
    const releasedStock = await admin
      .from("catalog_products")
      .select("stock_quantity")
      .eq("id", expiringProduct)
      .single();
    assert.equal(releasedStock.data?.stock_quantity, 1);
    await t.test(
      "expiração libera estoque uma vez e cancela irrevogavelmente pedido não pago",
      () => {
        assert.equal(expiredOrder.data?.status, "cancelled");
        assert.equal(expiredOrder.data?.cancellation_reason, "reservation_expired");
        assert.equal(releasedStock.data?.stock_quantity, 1);
      },
    );

    await t.test(
      "conversão concorrente com expiração produz apenas um resultado consistente",
      async () => {
        const productId = await createProduct(1, 30);
        const resId = await reserve(customer, productId);
        const made = await quoteAndCreate(customer, resId);
        assert.equal(
          (
            await adminClient.rpc("record_order_inspection", {
              p_order_id: made.order.id,
              p_items_confirmed: true,
            })
          ).error,
          null,
        );
        assert.equal(
          (await adminClient.rpc("approve_order_inspection", { p_order_id: made.order.id })).error,
          null,
        );
        const [paymentResult] = await Promise.all([
          adminClient.rpc("confirm_order_payment", { p_order_id: made.order.id }),
          (async () => {
            await admin
              .from("reservations")
              .update({ expires_at: new Date(Date.now() - 1).toISOString() })
              .eq("id", resId);
            return admin.rpc("expire_due_reservations", { p_limit: 100 });
          })(),
        ]);
        await admin.rpc("expire_due_reservations", { p_limit: 100 });
        const finalOrder = await admin
          .from("orders")
          .select("status,payment_confirmed_at,cancellation_reason")
          .eq("id", made.order.id)
          .single();
        const finalReservation = await admin
          .from("reservations")
          .select("status")
          .eq("id", resId)
          .single();
        const finalStock = await admin
          .from("catalog_products")
          .select("stock_quantity")
          .eq("id", productId)
          .single();
        if (finalReservation.data?.status === "completed") {
          assert.equal(paymentResult.error, null);
          assert.ok(finalOrder.data?.payment_confirmed_at);
          assert.notEqual(finalOrder.data?.status, "cancelled");
          assert.equal(finalStock.data?.stock_quantity, 0);
        } else {
          assert.equal(finalReservation.data?.status, "expired");
          assert.ok(paymentResult.error);
          assert.equal(finalOrder.data?.status, "cancelled");
          assert.equal(finalOrder.data?.payment_confirmed_at, null);
          assert.equal(finalStock.data?.stock_quantity, 1);
        }
      },
    );
  } finally {
    // The CI database is ephemeral. FK/ledger history intentionally prevents destructive fixture cleanup.
    void createdProducts;
    void createdUsers;
  }
});
