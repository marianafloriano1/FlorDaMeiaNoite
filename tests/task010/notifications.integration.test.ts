import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { createClient } from "@supabase/supabase-js";
import { runNotificationCycle } from "../../src/workers/transactional-notifications.mjs";

const url = process.env.TASK010_TEST_SUPABASE_URL;
const anonKey = process.env.TASK010_TEST_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.TASK010_TEST_SUPABASE_SERVICE_ROLE_KEY;
const configured = Boolean(url && anonKey && serviceRoleKey);

test("TASK-010: outbox transacional, RLS, reagendamento e corrida de cancelamento", {
  skip: !configured,
}, async () => {
  const admin = createClient(url as string, serviceRoleKey as string, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const anonymous = createClient(url as string, anonKey as string, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const settings = await admin.from("notification_channel_settings").upsert(
    {
      channel: "email",
      enabled: true,
      max_messages_per_period: 500,
      period_seconds: 3600,
      monthly_budget_brl: 100,
      budget_alert_threshold_brl: 80,
      estimated_unit_cost_brl: 0,
      max_attempts: 5,
      retry_base_seconds: 1,
      retry_max_seconds: 60,
      metadata_retention_days: 30,
      payload_retention_days: 14,
    },
    { onConflict: "channel" },
  );
  assert.equal(settings.error, null);

  async function makeOrder() {
    const email = `task010-${randomUUID()}@example.invalid`;
    const password = `T10-${randomUUID()}-Aa1!`;
    const createdUser = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: { role: "customer" },
      user_metadata: { notification_locale: "en" },
    });
    assert.equal(createdUser.error, null);
    assert.ok(createdUser.data.user);
    const buyerId = createdUser.data.user.id;
    const buyer = createClient(url as string, anonKey as string, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    assert.equal((await buyer.auth.signInWithPassword({ email, password })).error, null);
    const cart = await buyer.from("carts").insert({ customer_id: buyerId }).select("id").single();
    assert.equal(cart.error, null);
    const product = await admin
      .from("catalog_products")
      .insert({
        slug: `task010-${randomUUID()}`,
        name: "Fixture sintética TASK-010",
        product_type: "fixture",
        description: "Registro sintético de integração.",
        price_brl: 15,
        category_name: "Arranjos",
        stock_quantity: 5,
        status: "published",
      })
      .select("id")
      .single();
    assert.equal(product.error, null);
    const line = await buyer.from("cart_items").insert({
      cart_id: cart.data.id,
      product_id: product.data.id,
      quantity: 1,
    });
    assert.equal(line.error, null);
    const reservation = await buyer.rpc("create_cart_reservation", {
      p_cart_id: cart.data.id,
      p_selected_product_ids: [product.data.id],
      p_idempotency_key: randomUUID(),
    });
    assert.equal(reservation.error, null);
    const quote = await buyer.rpc("create_order_quote", { p_reservation_id: reservation.data.id });
    assert.equal(quote.error, null);
    const order = await buyer.rpc("create_order_from_quote", {
      p_quote_id: quote.data.quote_id,
      p_idempotency_key: randomUUID(),
      p_consent: true,
    });
    assert.equal(order.error, null);
    return { id: order.data.id as string, buyerId, buyer };
  }

  const first = await makeOrder();
  const initial = await admin
    .from("notification_outbox")
    .select("id,notification_type,status,idempotency_key")
    .eq("order_id", first.id)
    .single();
  assert.equal(initial.error, null);
  assert.equal(initial.data.notification_type, "order_created");
  assert.equal(initial.data.status, "pending");
  const payload = await admin
    .from("notification_payloads")
    .select("payload")
    .eq("notification_id", initial.data.id)
    .single();
  assert.equal(payload.error, null);
  assert.deepEqual(Object.keys(payload.data.payload).sort(), [
    "order_reference",
    "order_status",
    "scheduled_pickup_at",
  ]);

  const privateRead = await first.buyer.from("notification_outbox").select("id").limit(1);
  assert.ok(privateRead.error || (privateRead.data?.length ?? 0) === 0);
  const anonymousRead = await anonymous.from("notification_outbox").select("id").limit(1);
  assert.ok(anonymousRead.error || (anonymousRead.data?.length ?? 0) === 0);
  const anonymousClaim = await anonymous.rpc("claim_notification_outbox", { p_limit: 1 });
  assert.ok(anonymousClaim.error);

  const logs: unknown[] = [];
  const sent: Array<{ to: string; text: string; idempotencyKey: string }> = [];
  const result = await runNotificationCycle(
    admin,
    {
      async send(message: { to: string; text: string; idempotencyKey: string }) {
        sent.push(message);
        return { accepted: true, providerMessageId: `synthetic-${randomUUID()}` };
      },
    },
    {
      logger: {
        info: (...values: unknown[]) => logs.push(values),
        warn: (...values: unknown[]) => logs.push(values),
        error: (...values: unknown[]) => logs.push(values),
      },
    },
  );
  assert.equal(result.sent, 1);
  assert.equal(sent.length, 1);
  assert.match(sent[0].to, /\.invalid$/);
  assert.match(sent[0].text, /Order received/);
  assert.doesNotMatch(JSON.stringify(logs), /customer@example|task010-[^" ]+@example\.invalid/);
  const sentRow = await admin
    .from("notification_outbox")
    .select("status,accepted_at")
    .eq("id", initial.data.id)
    .single();
  assert.equal(sentRow.data.status, "sent");
  assert.ok(sentRow.data.accepted_at);

  const futureOrder = await makeOrder();
  const actor = await admin.auth.admin.createUser({
    email: `task010-admin-${randomUUID()}@example.invalid`,
    password: `T10-${randomUUID()}-Aa1!`,
    email_confirm: true,
    app_metadata: { role: "admin" },
  });
  assert.equal(actor.error, null);
  const pickupAt = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000);
  pickupAt.setUTCHours(15, 0, 0, 0);
  const targetDate = new Date(pickupAt.getTime() - 24 * 60 * 60 * 1000);
  const holidayParts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(targetDate)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  const holidayDate = `${holidayParts.year}-${holidayParts.month}-${holidayParts.day}`;
  const holiday = await admin.from("notification_holidays").insert({
    holiday_date: holidayDate,
    jurisdiction: "municipal",
    region_code: "SYNTHETIC",
    name: `TASK-010 fixture ${randomUUID()}`,
  });
  assert.equal(holiday.error, null);
  const schedule = await admin
    .from("orders")
    .update({
      scheduled_pickup_at: pickupAt.toISOString(),
      pickup_scheduled_by: actor.data.user?.id,
      pickup_scheduled_at: new Date().toISOString(),
    })
    .eq("id", futureOrder.id);
  assert.equal(schedule.error, null);
  const reminders = await admin
    .from("notification_outbox")
    .select("notification_type,scheduled_at,idempotency_key,status")
    .eq("order_id", futureOrder.id)
    .in("notification_type", ["pickup_reminder_24h", "pickup_reminder_1h"]);
  assert.equal(reminders.error, null);
  assert.equal(reminders.data.length, 2);
  assert.ok(reminders.data.every((row) => row.status === "pending"));
  const adjusted24 = reminders.data.find((row) => row.notification_type === "pickup_reminder_24h");
  assert.ok(adjusted24);
  const localDate = (date: Date) => {
    const dateParts = Object.fromEntries(
      new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Sao_Paulo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
        .formatToParts(date)
        .filter((part) => part.type !== "literal")
        .map((part) => [part.type, part.value]),
    );
    return `${dateParts.year}-${dateParts.month}-${dateParts.day}`;
  };
  assert.equal(localDate(new Date(adjusted24.scheduled_at)), localDate(pickupAt));
  const repeatSchedule = await admin
    .from("orders")
    .update({
      scheduled_pickup_at: pickupAt.toISOString(),
    })
    .eq("id", futureOrder.id);
  assert.equal(repeatSchedule.error, null);
  const grouped = await admin
    .from("notification_outbox")
    .select("id")
    .eq("order_id", futureOrder.id)
    .in("notification_type", ["pickup_reminder_24h", "pickup_reminder_1h"]);
  assert.equal(grouped.data?.length, 2);

  const item = await admin.from("order_items").select("id").eq("order_id", futureOrder.id).single();
  assert.equal(item.error, null);
  const classified = await admin
    .from("order_items")
    .update({
      perishability: "perishable",
      classified_by: actor.data.user?.id,
      classified_at: new Date().toISOString(),
    })
    .eq("id", item.data.id);
  assert.equal(classified.error, null);
  const confirmedAt = new Date();
  const ready = await admin
    .from("orders")
    .update({
      status: "ready_for_pickup",
      payment_confirmed_at: confirmedAt.toISOString(),
      preparation_window_start: new Date(confirmedAt.getTime() + 60 * 60 * 1000).toISOString(),
      preparation_window_end: new Date(confirmedAt.getTime() + 2 * 60 * 60 * 1000).toISOString(),
    })
    .eq("id", futureOrder.id);
  assert.equal(ready.error, null);
  const perishableReminders = await admin
    .from("notification_outbox")
    .select("order_item_id,scheduled_at,idempotency_key,status")
    .eq("order_id", futureOrder.id)
    .eq("notification_type", "perishable_daily")
    .order("scheduled_at");
  assert.equal(perishableReminders.error, null);
  assert.equal(perishableReminders.data.length, 3);
  assert.ok(
    perishableReminders.data.every((row) => row.order_item_id === null && row.status === "pending"),
  );
  for (const row of perishableReminders.data) {
    const date = localDate(new Date(row.scheduled_at));
    const weekday = new Date(`${date}T00:00:00.000Z`).getUTCDay();
    assert.ok(weekday >= 1 && weekday <= 5);
    assert.notEqual(date, holidayDate);
    assert.match(row.idempotency_key, new RegExp(`:${date}$`));
  }
  const resolvedLine = await admin
    .from("order_items")
    .update({
      line_status: "picked_up",
      resolved_by: actor.data.user?.id,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", item.data.id);
  assert.equal(resolvedLine.error, null);
  const cancelledPerishableReminders = await admin
    .from("notification_outbox")
    .select("status")
    .eq("order_id", futureOrder.id)
    .eq("notification_type", "perishable_daily");
  assert.equal(cancelledPerishableReminders.data?.length, 3);
  assert.ok(cancelledPerishableReminders.data?.every((row) => row.status === "cancelled"));

  const cancellable = await makeOrder();
  const orderEvent = await admin
    .from("notification_outbox")
    .select("id")
    .eq("order_id", cancellable.id)
    .eq("notification_type", "order_created")
    .single();
  assert.equal(orderEvent.error, null);
  const claims = await Promise.all([
    admin.rpc("claim_notification_outbox", { p_limit: 1 }),
    createClient(url as string, serviceRoleKey as string, {
      auth: { autoRefreshToken: false, persistSession: false },
    }).rpc("claim_notification_outbox", { p_limit: 1 }),
  ]);
  assert.equal(claims[0].error, null);
  assert.equal(claims[1].error, null);
  const claimedIds = [...(claims[0].data ?? []), ...(claims[1].data ?? [])].map(
    (row: { id: string }) => row.id,
  );
  assert.equal(new Set(claimedIds).size, claimedIds.length);

  const raceOrder = await makeOrder();
  const raceRow = await admin
    .from("notification_outbox")
    .select("id")
    .eq("order_id", raceOrder.id)
    .eq("notification_type", "order_created")
    .single();
  const claimed = await admin.rpc("claim_notification_outbox", { p_limit: 20 });
  assert.equal(claimed.error, null);
  assert.ok((claimed.data ?? []).some((row: { id: string }) => row.id === raceRow.data.id));
  const cancelled = await admin
    .from("orders")
    .update({ status: "cancelled", cancellation_reason: "admin_cancelled" })
    .eq("id", raceOrder.id);
  assert.equal(cancelled.error, null);
  const afterCancellation = await admin
    .from("notification_outbox")
    .select("status")
    .eq("id", raceRow.data.id)
    .single();
  assert.equal(afterCancellation.data.status, "cancelled");
  const dispatch = await admin.rpc("begin_notification_dispatch", {
    p_id: raceRow.data.id,
    p_lease_token: (claimed.data ?? []).find((row: { id: string }) => row.id === raceRow.data.id)
      ?.lease_token,
  });
  assert.equal(dispatch.error, null);
  assert.equal(dispatch.data, false);
});
