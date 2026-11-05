export const NOTIFICATION_TIME_ZONE = "America/Sao_Paulo";
export const NOTIFICATION_LOCALES = ["pt-BR", "en", "es", "ru"];

const dateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: NOTIFICATION_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const dateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: NOTIFICATION_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function parts(formatter, date) {
  return Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
}

function localDate(date) {
  const values = parts(dateFormatter, date);
  return `${values.year}-${values.month}-${values.day}`;
}

function zonedDateTime(date) {
  const values = parts(dateTimeFormatter, date);
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
    millisecond: date.getUTCMilliseconds(),
  };
}

function localPartsToInstant(value) {
  const desired = Date.UTC(
    value.year,
    value.month - 1,
    value.day,
    value.hour,
    value.minute,
    value.second,
    value.millisecond,
  );
  let result = desired;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const observed = zonedDateTime(new Date(result));
    const observedAsUtc = Date.UTC(
      observed.year,
      observed.month - 1,
      observed.day,
      observed.hour,
      observed.minute,
      observed.second,
      observed.millisecond,
    );
    result += desired - observedAsUtc;
  }
  return new Date(result);
}

function nextLocalDate(date) {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + 1);
  return value.toISOString().slice(0, 10);
}

export function resolveNotificationLocale(value) {
  return NOTIFICATION_LOCALES.includes(value) ? value : "pt-BR";
}

/** Moves a holiday reminder while preserving São Paulo wall-clock time. */
export function moveReminderToAllowedDate(candidate, pickupAt, holidayDates) {
  if (!Number.isFinite(candidate.getTime()) || !Number.isFinite(pickupAt.getTime())) {
    throw new Error("invalid_notification_schedule_date");
  }
  let targetDate = localDate(candidate);
  const localTime = zonedDateTime(candidate);
  for (let day = 0; holidayDates.has(targetDate); day += 1) {
    if (day >= 366) throw new Error("notification_holiday_calendar_range_exceeded");
    targetDate = nextLocalDate(targetDate);
  }
  const [year, month, day] = targetDate.split("-").map(Number);
  const adjusted = localPartsToInstant({ ...localTime, year, month, day });
  return adjusted.getTime() > pickupAt.getTime() ? null : adjusted;
}

export function createPickupReminders(orderId, scheduledPickupAt, holidayDates) {
  if (!/^[0-9a-f-]{36}$/i.test(orderId)) throw new Error("invalid_notification_order_id");
  const pickup = new Date(scheduledPickupAt);
  if (!Number.isFinite(pickup.getTime())) throw new Error("invalid_notification_pickup_at");
  const reminders = [];
  for (const [type, hours] of [
    ["pickup_reminder_24h", 24],
    ["pickup_reminder_1h", 1],
  ]) {
    const candidate = new Date(pickup.getTime() - hours * 60 * 60 * 1000);
    const adjusted = moveReminderToAllowedDate(candidate, pickup, holidayDates);
    if (!adjusted) continue;
    const permittedLocalDate = localDate(adjusted);
    reminders.push({
      type,
      scheduledAt: adjusted.toISOString(),
      localDate: permittedLocalDate,
      idempotencyKey: `task010:${orderId}:${type}:${permittedLocalDate}`,
    });
  }
  return reminders;
}

/** Caller supplies a first day explicitly; this function does not define the business start rule. */
export function perishableReminderDates(firstDate, holidayDates, days = 3) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(firstDate) || !Number.isInteger(days) || days < 1 || days > 3) {
    throw new Error("invalid_perishable_reminder_window");
  }
  const start = new Date(`${firstDate}T00:00:00.000Z`);
  if (!Number.isFinite(start.getTime()) || start.toISOString().slice(0, 10) !== firstDate) {
    throw new Error("invalid_perishable_reminder_window");
  }
  const result = [];
  let date = firstDate;
  for (let scanned = 0; result.length < days && scanned < 366; scanned += 1) {
    const weekday = new Date(`${date}T00:00:00.000Z`).getUTCDay();
    if (weekday !== 0 && weekday !== 6 && !holidayDates.has(date)) result.push(date);
    date = nextLocalDate(date);
  }
  if (result.length !== days) throw new Error("notification_holiday_calendar_range_exceeded");
  return result;
}

export function createPerishableReminders(
  orderId,
  scheduledPickupAt,
  holidayDates,
  now = new Date(),
) {
  if (!/^[0-9a-f-]{36}$/i.test(orderId)) throw new Error("invalid_notification_order_id");
  const pickup = new Date(scheduledPickupAt);
  if (!Number.isFinite(pickup.getTime()) || !Number.isFinite(now.getTime())) {
    throw new Error("invalid_notification_pickup_at");
  }
  const pickupLocal = zonedDateTime(pickup);
  let date = [localDate(pickup), localDate(now)].sort().at(-1);
  const reminders = [];
  for (let scanned = 0; reminders.length < 3 && scanned < 366; scanned += 1) {
    const allowedDate = perishableReminderDates(date, holidayDates, 1)[0];
    const [year, month, day] = allowedDate.split("-").map(Number);
    const scheduled = localPartsToInstant({ ...pickupLocal, year, month, day });
    if (scheduled.getTime() >= now.getTime()) {
      reminders.push({
        type: "perishable_daily",
        scheduledAt: scheduled.toISOString(),
        localDate: allowedDate,
        idempotencyKey: `task010:${orderId}:perishable_daily:${allowedDate}`,
      });
    }
    date = nextLocalDate(allowedDate);
  }
  if (reminders.length !== 3) throw new Error("notification_holiday_calendar_range_exceeded");
  return reminders;
}
