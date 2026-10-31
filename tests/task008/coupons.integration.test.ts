import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { createClient } from "@supabase/supabase-js";

const url = process.env.TASK008_TEST_SUPABASE_URL;
const anonKey = process.env.TASK008_TEST_SUPABASE_ANON_KEY;
const serviceKey = process.env.TASK008_TEST_SUPABASE_SERVICE_ROLE_KEY;
const configured = Boolean(url && anonKey && serviceKey);

test("TASK-008: Supabase isolado valida resgate, desconto, idempotência e CartEvent", {
  skip: !configured,
}, async () => {
  const admin = createClient(url as string, serviceKey as string, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const couponCode = `T8${randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`;
  const email = `task008-${randomUUID()}@example.invalid`;
  const password = `T8-${randomUUID()}-Aa1!`;
  const user = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role: "customer" },
  });
  assert.equal(user.error, null);
  const customerId = user.data.user?.id;
  assert.ok(customerId);
  const customer = createClient(url as string, anonKey as string, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  assert.equal((await customer.auth.signInWithPassword({ email, password })).error, null);
  const cart = await customer
    .from("carts")
    .insert({ customer_id: customerId })
    .select("id")
    .single();
  assert.equal(cart.error, null);
  const product = await admin
    .from("catalog_products")
    .insert({
      slug: `task008-${randomUUID()}`,
      name: "Fixture cupom",
      product_type: "fixture",
      description: "Sintético",
      price_brl: 100,
      category_name: "Arranjos",
      stock_quantity: 2,
      status: "published",
    })
    .select("id")
    .single();
  assert.equal(product.error, null);
  assert.ok(product.data?.id);
  assert.equal(
    (
      await customer
        .from("cart_items")
        .insert({ cart_id: cart.data.id, product_id: product.data.id, quantity: 1 })
    ).error,
    null,
  );
  const events = await admin
    .from("cart_events")
    .select("id,event_type")
    .eq("customer_id", customerId)
    .eq("product_id", product.data.id);
  assert.equal(events.error, null);
  assert.equal(
    events.data?.some((event) => event.event_type === "cart_item_added"),
    true,
  );
  const reservation = await customer.rpc("create_cart_reservation", {
    p_cart_id: cart.data.id,
    p_selected_product_ids: [product.data.id],
    p_idempotency_key: randomUUID(),
  });
  assert.equal(reservation.error, null);
  const deniedAdmin = await customer.rpc("admin_create_coupon", { p_coupon: {} });
  assert.match(deniedAdmin.error?.message ?? "", /admin_role_required/);
  const adminSession = await admin.auth.admin.createUser({
    email: `task008-admin-${randomUUID()}@example.invalid`,
    password,
    email_confirm: true,
    app_metadata: { role: "admin" },
  });
  assert.equal(adminSession.error, null);
  const campaign = await admin
    .from("coupons")
    .insert({
      code: couponCode,
      discount_type: "percentage",
      discount_value: 10,
      maximum_redemptions: 1,
      valid_from: new Date(Date.now() - 60_000).toISOString(),
      valid_until: new Date(Date.now() + 3_600_000).toISOString(),
      active: true,
      created_by: adminSession.data.user?.id,
    })
    .select("id")
    .single();
  assert.equal(campaign.error, null);
  const secondEmail = `task008-${randomUUID()}@example.invalid`;
  const secondUser = await admin.auth.admin.createUser({
    email: secondEmail,
    password,
    email_confirm: true,
    app_metadata: { role: "customer" },
  });
  assert.equal(secondUser.error, null);
  const secondCustomer = createClient(url as string, anonKey as string, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  assert.equal(
    (await secondCustomer.auth.signInWithPassword({ email: secondEmail, password })).error,
    null,
  );
  const secondCart = await secondCustomer
    .from("carts")
    .insert({ customer_id: secondUser.data.user?.id })
    .select("id")
    .single();
  assert.equal(secondCart.error, null);
  assert.equal(
    (
      await secondCustomer
        .from("cart_items")
        .insert({ cart_id: secondCart.data.id, product_id: product.data.id, quantity: 1 })
    ).error,
    null,
  );
  const secondReservation = await secondCustomer.rpc("create_cart_reservation", {
    p_cart_id: secondCart.data.id,
    p_selected_product_ids: [product.data.id],
    p_idempotency_key: randomUUID(),
  });
  assert.equal(secondReservation.error, null);
  const quote = await customer.rpc("create_order_quote_with_coupon", {
    p_reservation_id: reservation.data.id,
    p_coupon_code: couponCode,
  });
  assert.equal(quote.error, null);
  assert.equal((quote.data as { total_brl: number }).total_brl, 90);
  const secondQuote = await secondCustomer.rpc("create_order_quote_with_coupon", {
    p_reservation_id: secondReservation.data.id,
    p_coupon_code: couponCode,
  });
  assert.equal(secondQuote.error, null);
  const quoteId = (quote.data as { quote_id: string }).quote_id;
  const secondQuoteId = (secondQuote.data as { quote_id: string }).quote_id;
  const key = randomUUID();
  const secondKey = randomUUID();
  const attempts = await Promise.all([
    customer.rpc("create_order_from_quote_with_coupon", {
      p_quote_id: quoteId,
      p_idempotency_key: key,
      p_consent: true,
    }),
    secondCustomer.rpc("create_order_from_quote_with_coupon", {
      p_quote_id: secondQuoteId,
      p_idempotency_key: secondKey,
      p_consent: true,
    }),
  ]);
  assert.equal(attempts.filter((result) => !result.error).length, 1);
  const failed = attempts.find((result) => result.error);
  assert.match(failed?.error?.message ?? "", /coupon_limit_reached/);
  const winnerIndex = attempts.findIndex((result) => !result.error);
  const winnerClient = winnerIndex === 0 ? customer : secondCustomer;
  const winningQuoteId = winnerIndex === 0 ? quoteId : secondQuoteId;
  const winningKey = winnerIndex === 0 ? key : secondKey;
  const order = attempts[winnerIndex];
  assert.equal((order.data as { total_brl: number }).total_brl, 90);
  const redemption = await admin
    .from("coupon_redemptions")
    .select("id,status")
    .eq("order_id", (order.data as { id: string }).id);
  assert.equal(redemption.data?.length, 1);
  const replay = await winnerClient.rpc("create_order_from_quote_with_coupon", {
    p_quote_id: winningQuoteId,
    p_idempotency_key: winningKey,
    p_consent: true,
  });
  assert.equal(replay.error, null);
  assert.equal((replay.data as { idempotent_replay: boolean }).idempotent_replay, true);
  assert.equal(
    (
      await admin
        .from("coupon_redemptions")
        .select("id")
        .eq("order_id", (order.data as { id: string }).id)
    ).data?.length,
    1,
  );
  const winnerReservationId = (order.data as { reservation_id: string }).reservation_id;
  await admin
    .from("reservations")
    .update({ expires_at: new Date(Date.now() - 10_000).toISOString() })
    .eq("id", winnerReservationId);
  const expired = await admin.rpc("expire_due_reservations", { p_limit: 10 });
  assert.equal(expired.error, null);
  assert.equal(expired.data, 1);
  const released = await admin
    .from("coupon_redemptions")
    .select("status,released_at")
    .eq("order_id", (order.data as { id: string }).id)
    .single();
  assert.equal(released.data?.status, "released");
  assert.ok(released.data?.released_at);
  const repeatedExpiry = await admin.rpc("expire_due_reservations", { p_limit: 10 });
  assert.equal(repeatedExpiry.data, 0);
  const stock = await admin
    .from("catalog_products")
    .select("stock_quantity")
    .eq("id", product.data.id)
    .single();
  assert.equal(stock.data?.stock_quantity, 1);
});
