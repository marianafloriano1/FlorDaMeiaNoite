import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import test from "node:test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { parseReportFilters } from "@/lib/reports/periods";
import { getOperationsReport } from "@/lib/reports/service";

const url = process.env.TASK011_TEST_SUPABASE_URL;
const anonKey = process.env.TASK011_TEST_SUPABASE_ANON_KEY;
const serviceKey = process.env.TASK011_TEST_SUPABASE_SERVICE_ROLE_KEY;
const configured = Boolean(url && anonKey && serviceKey);

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
  return String((digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000).padStart(6, "0");
}

test("TASK-011: Supabase efêmero agrega pagamento confirmado, CartEvent e auditoria", {
  skip: !configured,
}, async () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = url;
  process.env.SUPABASE_SERVICE_ROLE_KEY = serviceKey;
  const admin = createClient(url as string, serviceKey as string, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const syntheticEmail = `task011-${randomUUID()}@example.invalid`;
  const password = `T11-${randomUUID()}-Aa1!`;
  const userResult = await admin.auth.admin.createUser({
    email: syntheticEmail,
    password,
    email_confirm: true,
    app_metadata: { role: "customer" },
  });
  assert.equal(userResult.error, null);
  const customerId = userResult.data.user?.id;
  assert.ok(customerId);

  const customer: SupabaseClient = createClient(url as string, anonKey as string, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  assert.equal(
    (await customer.auth.signInWithPassword({ email: syntheticEmail, password })).error,
    null,
  );
  const cart = await customer
    .from("carts")
    .insert({ customer_id: customerId })
    .select("id")
    .single();
  assert.equal(cart.error, null);
  const product = await admin
    .from("catalog_products")
    .insert({
      slug: `task011-${randomUUID()}`,
      name: "Métrica sintética TASK-011",
      product_type: "fixture",
      description: "Dados sintéticos de integração.",
      price_brl: 27.5,
      category_name: "Arranjos",
      stock_quantity: 3,
      status: "published",
    })
    .select("id")
    .single();
  assert.equal(product.error, null);

  const insertedCartLine = await customer.from("cart_items").insert({
    cart_id: cart.data.id,
    product_id: product.data.id,
    quantity: 2,
  });
  assert.equal(insertedCartLine.error, null);
  const event = await admin
    .from("cart_events")
    .select("id")
    .eq("customer_id", customerId)
    .eq("product_id", product.data.id)
    .eq("event_type", "cart_item_added");
  assert.equal(event.error, null);
  assert.ok((event.data?.length ?? 0) > 0);

  const reservation = await customer.rpc("create_cart_reservation", {
    p_cart_id: cart.data.id,
    p_selected_product_ids: [product.data.id],
    p_idempotency_key: randomUUID(),
  });
  assert.equal(reservation.error, null);
  const reservationId = (reservation.data as { id: string }).id;
  const quoteResult = await customer.rpc("create_order_quote", { p_reservation_id: reservationId });
  assert.equal(quoteResult.error, null);
  const quote = quoteResult.data as { quote_id: string };
  const orderResult = await customer.rpc("create_order_from_quote", {
    p_quote_id: quote.quote_id,
    p_idempotency_key: randomUUID(),
    p_consent: true,
  });
  assert.equal(orderResult.error, null);
  const order = orderResult.data as { id: string };

  const adminEmail = `task011-admin-${randomUUID()}@example.invalid`;
  const adminPassword = `T11-${randomUUID()}-Aa1!`;
  const adminUser = await admin.auth.admin.createUser({
    email: adminEmail,
    password: adminPassword,
    email_confirm: true,
    app_metadata: { role: "admin" },
  });
  assert.equal(adminUser.error, null);
  const adminClient = createClient(url as string, anonKey as string, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  assert.equal(
    (await adminClient.auth.signInWithPassword({ email: adminEmail, password: adminPassword }))
      .error,
    null,
  );
  const factor = await adminClient.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: "TASK-011 CI",
  });
  assert.equal(factor.error, null);
  assert.ok(factor.data.totp?.secret);
  assert.equal(
    (
      await adminClient.auth.mfa.challengeAndVerify({
        factorId: factor.data.id,
        code: currentTotp(factor.data.totp.secret),
      })
    ).error,
    null,
  );
  const session = (await adminClient.auth.getSession()).data.session;
  assert.ok(session);
  const claims = JSON.parse(
    Buffer.from(session.access_token.split(".")[1], "base64url").toString("utf8"),
  ) as { session_id: string };
  assert.equal(
    (
      await admin.from("admin_auth_sessions").insert({
        session_id: claims.session_id,
        user_id: adminUser.data.user?.id,
        mfa_verified_at: new Date().toISOString(),
        last_activity_at: new Date().toISOString(),
        revoked_at: null,
      })
    ).error,
    null,
  );
  assert.equal(
    (
      await adminClient.rpc("record_order_inspection", {
        p_order_id: order.id,
        p_items_confirmed: true,
      })
    ).error,
    null,
  );
  assert.equal(
    (await adminClient.rpc("approve_order_inspection", { p_order_id: order.id })).error,
    null,
  );
  assert.equal(
    (await adminClient.rpc("confirm_order_payment", { p_order_id: order.id })).error,
    null,
  );

  const filters = parseReportFilters(new URLSearchParams("period=week&basis=paid"));
  assert.ok(filters);
  const report = await getOperationsReport(filters);
  assert.ok(report.paidOrderCount >= 1);
  assert.ok(report.revenueBrl >= 27.5);
  assert.ok(
    report.products.some(
      (item) => item.productName === "Métrica sintética TASK-011" && item.unitsSold === 2,
    ),
  );
  assert.ok(report.cartItemAddedEvents >= 1);
  assert.ok(report.cartUnitsAdded >= 2);

  const audit = await admin
    .from("report_export_audit")
    .insert({
      actor_uid: adminUser.data.user?.id,
      period_kind: filters.period,
      date_basis: filters.basis,
      period_start: filters.startAt,
      period_end: filters.endAt,
      export_format: "xlsx",
    })
    .select("id,actor_uid,created_at")
    .single();
  assert.equal(audit.error, null);
  assert.equal(audit.data.actor_uid, adminUser.data.user?.id);
  assert.ok(audit.data.created_at);
});
