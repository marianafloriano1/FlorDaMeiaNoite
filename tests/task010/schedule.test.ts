import assert from "node:assert/strict";
import test from "node:test";
import {
  createPerishableReminders,
  createPickupReminders,
  moveReminderToAllowedDate,
  perishableReminderDates,
  resolveNotificationLocale,
} from "../../src/lib/notifications/schedule.mjs";

const orderId = "f61d7c16-8acb-4474-9f94-6930b38d1f67";

test("pickup reminders are T-24h/T-1h in the store timezone with deterministic keys", () => {
  const pickup = "2026-11-10T12:00:00.000Z"; // 09:00 in America/Sao_Paulo
  const reminders = createPickupReminders(orderId, pickup, new Set());
  assert.deepEqual(
    reminders.map((item) => item.type),
    ["pickup_reminder_24h", "pickup_reminder_1h"],
  );
  assert.equal(reminders[0].scheduledAt, "2026-11-09T12:00:00.000Z");
  assert.equal(reminders[1].scheduledAt, "2026-11-10T11:00:00.000Z");
  assert.equal(reminders[0].idempotencyKey, `task010:${orderId}:pickup_reminder_24h:2026-11-09`);
});

test("holiday-adjusted reminders that reach or pass pickup time are suppressed", () => {
  const pickup = new Date("2026-11-10T12:00:00.000Z");
  const candidate = new Date("2026-11-09T12:00:00.000Z");
  const adjusted = moveReminderToAllowedDate(candidate, pickup, new Set(["2026-11-09"]));
  assert.equal(adjusted?.toISOString(), pickup.toISOString());
  assert.equal(
    moveReminderToAllowedDate(
      new Date("2026-11-10T11:00:00.000Z"),
      pickup,
      new Set(["2026-11-10"]),
    ),
    null,
  );
});

test("perishable calendar helper observes the configured holiday dates and caps at three days", () => {
  assert.deepEqual(perishableReminderDates("2026-11-09", new Set(["2026-11-10"])), [
    "2026-11-09",
    "2026-11-11",
    "2026-11-12",
  ]);
  assert.throws(
    () => perishableReminderDates("2026-11-09", new Set(), 4),
    /invalid_perishable_reminder_window/,
  );
});

test("perishable business days are Monday through Friday and skip active holidays", () => {
  assert.deepEqual(perishableReminderDates("2026-11-06", new Set(["2026-11-09"])), [
    "2026-11-06",
    "2026-11-10",
    "2026-11-11",
  ]);
});

test("perishable reminders start on pickup date and preserve local pickup time", () => {
  const pickup = "2026-11-06T12:30:00.000Z"; // sexta-feira, 09:30 em São Paulo
  const reminders = createPerishableReminders(
    orderId,
    pickup,
    new Set(["2026-11-09"]),
    new Date("2026-11-05T12:00:00.000Z"),
  );
  assert.deepEqual(
    reminders.map((item) => item.localDate),
    ["2026-11-06", "2026-11-10", "2026-11-11"],
  );
  assert.deepEqual(
    reminders.map((item) => item.scheduledAt),
    ["2026-11-06T12:30:00.000Z", "2026-11-10T12:30:00.000Z", "2026-11-11T12:30:00.000Z"],
  );
  assert.equal(reminders[0].idempotencyKey, `task010:${orderId}:perishable_daily:2026-11-06`);
});

test("unsupported locale falls back to pt-BR", () => {
  assert.equal(resolveNotificationLocale("ru"), "ru");
  assert.equal(resolveNotificationLocale("fr"), "pt-BR");
  assert.equal(resolveNotificationLocale(undefined), "pt-BR");
});
