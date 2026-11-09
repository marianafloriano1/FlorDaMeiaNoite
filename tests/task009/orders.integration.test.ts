import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import test from "node:test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.TASK009_TEST_SUPABASE_URL;
const anonKey = process.env.TASK009_TEST_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.TASK009_TEST_SUPABASE_SERVICE_ROLE_KEY;
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
  return String((digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000).padStart(6, "0");
}

test("TASK-009: Supabase isolado valida agenda, ciclo por linha, cancelamento e descarte", {
  skip: !configured,
}, async (t) => {
  const admin = createClient(url as string, serviceRoleKey as string, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  async function customer() {
    const email = `task009-${randomUUID()}@example.invalid`;
    const password = `T9-${randomUUID()}-Aa1!`;
    const user = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: { role: "customer" },
    });
    assert.equal(user.error, null);
    assert.ok(user.data.user);
    const client = createClient(url as string, anonKey as string, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    assert.equal((await client.auth.signInWithPassword({ email, password })).error, null);
    const cart = await client
      .from("carts")
      .insert({ customer_id: user.data.user.id })
      .select("id")
      .single();
    assert.equal(cart.error, null);
    return { id: user.data.user.id, client, cartId: cart.data.id as string };
  }

  async function administrator() {
    const email = `task009-admin-${randomUUID()}@example.invalid`;
    const password = `T9-${randomUUID()}-Aa1!`;
    const user = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: { role: "admin" },
    });
    assert.equal(user.error, null);
    assert.ok(user.data.user);
    const client = createClient(url as string, anonKey as string, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    assert.equal((await client.auth.signInWithPassword({ email, password })).error, null);
    const enrolled = await client.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "TASK-009 synthetic",
    });
    assert.equal(enrolled.error, null);
    assert.ok(enrolled.data.totp?.secret);
    const verified = await client.auth.mfa.challengeAndVerify({
      factorId: enrolled.data.id,
      code: currentTotp(enrolled.data.totp.secret),
    });
    assert.equal(verified.error, null);
    const session = (await client.auth.getSession()).data.session;
    assert.ok(session);
    const claims = JSON.parse(
      Buffer.from(session.access_token.split(".")[1], "base64url").toString("utf8"),
    ) as {
      session_id: string;
    };
    const row = await admin.from("admin_auth_sessions").insert({
      session_id: claims.session_id,
      user_id: user.data.user.id,
      mfa_verified_at: new Date().toISOString(),
      last_activity_at: new Date().toISOString(),
      revoked_at: null,
    });
    assert.equal(row.error, null);
    return { id: user.data.user.id, sessionId: claims.session_id, client };
  }

  async function employee() {
    const email = `task009-employee-${randomUUID()}@example.invalid`;
    const password = `T9-${randomUUID()}-Aa1!`;
    const user = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: { role: "employee" },
    });
    assert.equal(user.error, null);
    assert.ok(user.data.user);
    const profile = await admin.from("employee_profiles").insert({
      id: user.data.user.id,
      full_name: "Operador sintético TASK-009",
      age: 30,
      phone_e164: "+15555550199",
      email,
      cpf: randomUUID().replace(/\D/g, "").padEnd(11, "0").slice(0, 11),
      hire_date: new Date().toISOString().slice(0, 10),
    });
    assert.equal(profile.error, null);
    const client = createClient(url as string, anonKey as string, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    assert.equal((await client.auth.signInWithPassword({ email, password })).error, null);
    return { id: user.data.user.id, client };
  }
  async function createOrder(quantity: number) {
    const buyer = await customer();
    const slug = `task009-${randomUUID()}`;
    const product = await admin
      .from("catalog_products")
      .insert({
        slug,
        name: "Fixture TASK-009",
        product_type: "fixture",
        description: "Dado sintético.",
        price_brl: 12,
        category_name: "Arranjos",
        stock_quantity: 20,
        status: "published",
      })
      .select("id")
      .single();
    assert.equal(product.error, null);
    assert.equal(
      (
        await buyer.client.from("cart_items").insert({
          cart_id: buyer.cartId,
          product_id: product.data.id,
          quantity,
        })
      ).error,
      null,
    );
    const reservation = await buyer.client.rpc("create_cart_reservation", {
      p_cart_id: buyer.cartId,
      p_selected_product_ids: [product.data.id],
      p_idempotency_key: randomUUID(),
    });
    assert.equal(reservation.error, null);
    const quote = await buyer.client.rpc("create_order_quote", {
      p_reservation_id: (reservation.data as { id: string }).id,
    });
    assert.equal(quote.error, null);
    const created = await buyer.client.rpc("create_order_from_quote", {
      p_quote_id: (quote.data as { quote_id: string }).quote_id,
      p_idempotency_key: randomUUID(),
      p_consent: true,
    });
    assert.equal(created.error, null);
    const line = await buyer.client
      .from("order_items")
      .select("id")
      .eq("order_id", (created.data as { id: string }).id)
      .single();
    assert.equal(line.error, null);
    return {
      buyer,
      productId: product.data.id as string,
      orderId: (created.data as { id: string }).id,
      itemId: line.data.id as string,
    };
  }

  async function createOrderWithQuantities(quantities: number[]) {
    const buyer = await customer();
    const products: Array<{ id: string; quantity: number }> = [];
    for (const quantity of quantities) {
      const slug = `task009-${randomUUID()}`;
      const product = await admin
        .from("catalog_products")
        .insert({
          slug,
          name: "Fixture TASK-009 misto",
          product_type: "fixture",
          description: "Dado sintético.",
          price_brl: 12,
          category_name: "Arranjos",
          stock_quantity: 20,
          status: "published",
        })
        .select("id")
        .single();
      assert.equal(product.error, null);
      products.push({ id: product.data.id as string, quantity });
    }
    const cartItems = await buyer.client.from("cart_items").insert(
      products.map((product) => ({
        cart_id: buyer.cartId,
        product_id: product.id,
        quantity: product.quantity,
      })),
    );
    assert.equal(cartItems.error, null);
    const reservation = await buyer.client.rpc("create_cart_reservation", {
      p_cart_id: buyer.cartId,
      p_selected_product_ids: products.map((product) => product.id),
      p_idempotency_key: randomUUID(),
    });
    assert.equal(reservation.error, null);
    const quote = await buyer.client.rpc("create_order_quote", {
      p_reservation_id: (reservation.data as { id: string }).id,
    });
    assert.equal(quote.error, null);
    const created = await buyer.client.rpc("create_order_from_quote", {
      p_quote_id: (quote.data as { quote_id: string }).quote_id,
      p_idempotency_key: randomUUID(),
      p_consent: true,
    });
    assert.equal(created.error, null);
    const orderId = (created.data as { id: string }).id;
    const [items, order] = await Promise.all([
      admin.from("order_items").select("id,product_id,quantity").eq("order_id", orderId),
      admin.from("orders").select("public_reference").eq("id", orderId).single(),
    ]);
    assert.equal(items.error, null);
    assert.equal(items.data?.length, products.length);
    assert.equal(order.error, null);
    return {
      buyer,
      orderId,
      publicReference: order.data.public_reference as string,
      items: items.data as Array<{ id: string; product_id: string; quantity: number }>,
      products,
    };
  }
  async function pay(adminClient: SupabaseClient, orderId: string) {
    assert.equal(
      (
        await adminClient.rpc("record_order_inspection", {
          p_order_id: orderId,
          p_items_confirmed: true,
        })
      ).error,
      null,
    );
    assert.equal(
      (await adminClient.rpc("approve_order_inspection", { p_order_id: orderId })).error,
      null,
    );
    assert.equal(
      (await adminClient.rpc("confirm_order_payment", { p_order_id: orderId })).error,
      null,
    );
    assert.equal(
      (
        await adminClient.rpc("transition_order", {
          p_order_id: orderId,
          p_next_status: "preparing",
        })
      ).error,
      null,
    );
  }

  const operator = await administrator();
  const cancelled = await createOrder(2);
  await t.test(
    "RPC administrativa rejeita AAL2 sem prova MFA recente e não renova o timestamp",
    async () => {
      const staleMfaAt = new Date(Date.now() - 6 * 60_000).toISOString();
      const stale = await admin
        .from("admin_auth_sessions")
        .update({ mfa_verified_at: staleMfaAt, last_activity_at: new Date().toISOString() })
        .eq("session_id", operator.sessionId);
      assert.equal(stale.error, null);
      const denied = await operator.client.rpc("set_order_pickup_schedule", {
        p_order_id: cancelled.orderId,
        p_pickup_at: new Date(Date.now() + 86_400_000).toISOString(),
      });
      assert.match(denied.error?.message ?? "", /admin_mfa_required/);
      const freshMfaAt = new Date().toISOString();
      const refresh = await admin
        .from("admin_auth_sessions")
        .update({ mfa_verified_at: freshMfaAt, last_activity_at: freshMfaAt })
        .eq("session_id", operator.sessionId);
      assert.equal(refresh.error, null);
      const schedule = await operator.client.rpc("set_order_pickup_schedule", {
        p_order_id: cancelled.orderId,
        p_pickup_at: new Date(Date.now() + 86_400_000).toISOString(),
      });
      assert.equal(schedule.error, null);
      const unchanged = await admin
        .from("admin_auth_sessions")
        .select("mfa_verified_at")
        .eq("session_id", operator.sessionId)
        .single();
      assert.equal(Date.parse(unchanged.data?.mfa_verified_at ?? ""), Date.parse(freshMfaAt));
    },
  );
  await t.test(
    "agenda, classificação e cancelamento pago devolvem apenas saldo não usado uma vez",
    async () => {
      const classification = await operator.client.rpc("classify_order_item", {
        p_order_id: cancelled.orderId,
        p_order_item_id: cancelled.itemId,
        p_perishable: false,
      });
      assert.equal(classification.error, null);
      await pay(operator.client, cancelled.orderId);
      const denied = await cancelled.buyer.client.rpc("transition_order", {
        p_order_id: cancelled.orderId,
        p_next_status: "preparing",
      });
      assert.match(denied.error?.message ?? "", /order_operator_required/);
      const stockBefore = (
        await admin
          .from("catalog_products")
          .select("stock_quantity")
          .eq("id", cancelled.productId)
          .single()
      ).data?.stock_quantity;
      const rollback = await operator.client.rpc("cancel_order", {
        p_order_id: cancelled.orderId,
        p_used_quantities: [{ order_item_id: cancelled.itemId, quantity_used: 3 }],
        p_customer_agreement_confirmed: true,
      });
      assert.match(rollback.error?.message ?? "", /invalid_order_item_usage/);
      const unchangedLine = await admin
        .from("order_items")
        .select("line_status")
        .eq("id", cancelled.itemId)
        .single();
      assert.equal(unchangedLine.data?.line_status, "open");
      const rolledBackAgreement = await admin
        .from("order_events")
        .select("id")
        .eq("order_id", cancelled.orderId)
        .eq("event_type", "cancellation_agreement_confirmed");
      assert.equal(rolledBackAgreement.data?.length, 0);
      const rolledBackReturn = await admin
        .from("inventory_ledger")
        .select("id")
        .eq("order_item_id", cancelled.itemId)
        .eq("event_type", "order_return");
      assert.equal(rolledBackReturn.data?.length, 0);
      const stockAfterRollback = await admin
        .from("catalog_products")
        .select("stock_quantity")
        .eq("id", cancelled.productId)
        .single();
      assert.equal(stockAfterRollback.data?.stock_quantity, stockBefore);

      const first = await operator.client.rpc("cancel_order", {
        p_order_id: cancelled.orderId,
        p_used_quantities: [{ order_item_id: cancelled.itemId, quantity_used: 1 }],
        p_customer_agreement_confirmed: true,
      });
      assert.equal(first.error, null);
      const replay = await operator.client.rpc("cancel_order", {
        p_order_id: cancelled.orderId,
        p_used_quantities: [{ order_item_id: cancelled.itemId, quantity_used: 1 }],
        p_customer_agreement_confirmed: true,
      });
      assert.equal(replay.error, null);
      assert.equal((replay.data as { idempotent_replay: boolean }).idempotent_replay, true);
      const after = await admin
        .from("catalog_products")
        .select("stock_quantity")
        .eq("id", cancelled.productId)
        .single();
      assert.equal(after.data?.stock_quantity, Number(stockBefore) + 1);
      const ledger = await admin
        .from("inventory_ledger")
        .select("id,quantity_delta,event_type")
        .eq("order_item_id", cancelled.itemId);
      assert.equal(ledger.data?.length, 1);
      assert.deepEqual(ledger.data?.[0], {
        id: ledger.data?.[0].id,
        quantity_delta: 1,
        event_type: "order_return",
      });
      const agreement = await admin
        .from("order_events")
        .select("event_data")
        .eq("order_id", cancelled.orderId)
        .eq("event_type", "cancellation_agreement_confirmed");
      assert.equal(agreement.data?.length, 1);
      assert.ok(agreement.data?.[0]);
      assert.equal(
        (agreement.data[0].event_data as Record<string, unknown>).customer_agreement_confirmed,
        true,
      );
    },
  );

  const perishable = await createOrder(1);
  await t.test("descarte de perecível após três dias úteis não devolve estoque", async () => {
    const classification = await operator.client.rpc("classify_order_item", {
      p_order_id: perishable.orderId,
      p_order_item_id: perishable.itemId,
      p_perishable: true,
    });
    assert.equal(classification.error, null);
    await pay(operator.client, perishable.orderId);
    const oldDate = new Date(Date.now() - 10 * 86_400_000).toISOString();
    const seeded = await admin
      .from("orders")
      .update({
        status: "preparing",
        scheduled_pickup_at: oldDate,
        pickup_scheduled_by: operator.id,
        pickup_scheduled_at: new Date().toISOString(),
      })
      .eq("id", perishable.orderId);
    assert.equal(seeded.error, null);
    const discarded = await operator.client.rpc("discard_perishable_order_item", {
      p_order_id: perishable.orderId,
      p_order_item_id: perishable.itemId,
    });
    assert.equal(discarded.error, null);
    const line = await admin
      .from("order_items")
      .select("line_status")
      .eq("id", perishable.itemId)
      .single();
    assert.equal(line.data?.line_status, "discarded");
    const ledger = await admin
      .from("inventory_ledger")
      .select("id")
      .eq("order_item_id", perishable.itemId);
    assert.equal(ledger.data?.length, 0);
  });
  const mixed = await createOrderWithQuantities([1, 1]);
  const perishableLine = mixed.items.find((item) => item.product_id === mixed.products[0].id);
  const pickupLine = mixed.items.find((item) => item.product_id === mixed.products[1].id);
  assert.ok(perishableLine);
  assert.ok(pickupLine);
  const pickupEmployee = await employee();
  await t.test(
    "cliente só consulta o próprio pedido; employee registra ocorrência idempotente e conclui retirada de pedido misto",
    async () => {
      const outsider = await customer();
      const hiddenOrder = await outsider.client
        .from("orders")
        .select("id")
        .eq("public_reference", mixed.publicReference)
        .maybeSingle();
      assert.equal(hiddenOrder.error, null);
      assert.equal(hiddenOrder.data, null);

      const classificationPerishable = await operator.client.rpc("classify_order_item", {
        p_order_id: mixed.orderId,
        p_order_item_id: perishableLine.id,
        p_perishable: true,
      });
      assert.equal(classificationPerishable.error, null);
      const classificationPickup = await operator.client.rpc("classify_order_item", {
        p_order_id: mixed.orderId,
        p_order_item_id: pickupLine.id,
        p_perishable: false,
      });
      assert.equal(classificationPickup.error, null);
      await pay(operator.client, mixed.orderId);

      const issueKey = randomUUID();
      const issue = await pickupEmployee.client.rpc("record_order_issue", {
        p_order_id: mixed.orderId,
        p_order_item_id: pickupLine.id,
        p_issue_type: "defect",
        p_idempotency_key: issueKey,
      });
      assert.equal(issue.error, null);
      assert.equal((issue.data as { idempotent_replay: boolean }).idempotent_replay, false);
      const issueReplay = await pickupEmployee.client.rpc("record_order_issue", {
        p_order_id: mixed.orderId,
        p_order_item_id: pickupLine.id,
        p_issue_type: "defect",
        p_idempotency_key: issueKey,
      });
      assert.equal(issueReplay.error, null);
      assert.equal((issueReplay.data as { idempotent_replay: boolean }).idempotent_replay, true);
      const issueEvents = await admin
        .from("order_events")
        .select("actor_uid,event_data")
        .eq("order_id", mixed.orderId)
        .eq("event_type", "issue_recorded");
      assert.equal(issueEvents.data?.length, 1);
      assert.equal(issueEvents.data?.[0].actor_uid, pickupEmployee.id);
      assert.deepEqual(
        Object.keys(issueEvents.data?.[0].event_data as Record<string, unknown>).sort(),
        ["idempotency_key", "issue_type", "order_item_id"],
      );

      const oldDate = new Date(Date.now() - 10 * 86_400_000).toISOString();
      const seeded = await admin
        .from("orders")
        .update({
          scheduled_pickup_at: oldDate,
          pickup_scheduled_by: operator.id,
          pickup_scheduled_at: new Date().toISOString(),
        })
        .eq("id", mixed.orderId);
      assert.equal(seeded.error, null);
      const discarded = await operator.client.rpc("discard_perishable_order_item", {
        p_order_id: mixed.orderId,
        p_order_item_id: perishableLine.id,
      });
      assert.equal(discarded.error, null);
      const interim = await admin.from("orders").select("status").eq("id", mixed.orderId).single();
      assert.equal(interim.data?.status, "preparing");

      const ready = await pickupEmployee.client.rpc("transition_order", {
        p_order_id: mixed.orderId,
        p_next_status: "ready_for_pickup",
      });
      assert.equal(ready.error, null);
      const pickedUp = await pickupEmployee.client.rpc("transition_order", {
        p_order_id: mixed.orderId,
        p_next_status: "picked_up",
      });
      assert.equal(pickedUp.error, null);
      const finalOrder = await admin
        .from("orders")
        .select("status")
        .eq("id", mixed.orderId)
        .single();
      assert.equal(finalOrder.data?.status, "resolved");
      const finalLines = await admin
        .from("order_items")
        .select("id,line_status,resolved_by")
        .eq("order_id", mixed.orderId);
      assert.deepEqual(
        finalLines.data
          ?.map((item) => [item.id, item.line_status])
          .sort(([a], [b]) => String(a).localeCompare(String(b))),
        [
          [perishableLine.id, "discarded"],
          [pickupLine.id, "picked_up"],
        ].sort(([a], [b]) => String(a).localeCompare(String(b))),
      );
      assert.ok(
        finalLines.data?.every(
          (item) => item.resolved_by === pickupEmployee.id || item.id === perishableLine.id,
        ),
      );
      const statusEvents = await admin
        .from("order_events")
        .select("actor_uid,event_data")
        .eq("order_id", mixed.orderId)
        .eq("event_type", "status_changed");
      assert.ok(
        statusEvents.data?.some(
          (event) =>
            event.actor_uid === pickupEmployee.id &&
            (event.event_data as Record<string, unknown>).requested_status === "picked_up",
        ),
      );
      for (const item of mixed.items) {
        const returns = await admin
          .from("inventory_ledger")
          .select("id")
          .eq("order_item_id", item.id)
          .eq("event_type", "order_return");
        assert.equal(returns.data?.length, 0);
      }
    },
  );
});
