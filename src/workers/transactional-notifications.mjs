import { pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { createSmtpEmailAdapter } from "../lib/notifications/email-adapter.mjs";
import { resolveNotificationLocale } from "../lib/notifications/schedule.mjs";
import { renderNotification } from "../lib/notifications/templates.mjs";

const allowedErrors = new Set([
  "notification_delivery_unknown",
  "notification_smtp_temporary_failure",
  "notification_recipient_rejected",
  "notification_message_invalid",
]);

export function parseNotificationPollInterval(
  value = process.env.NOTIFICATION_WORKER_POLL_INTERVAL_MS,
) {
  if (value === undefined || value === "") return 30_000;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1_000 || parsed > 3_600_000) {
    throw new Error("notification_worker_invalid_poll_interval");
  }
  return parsed;
}

function log(logger, method, event, details = {}) {
  logger[method](event, details);
}

async function dataOrThrow(query, errorCode) {
  const { data, error } = await query;
  if (error) throw Object.assign(new Error(errorCode), { code: errorCode });
  return data;
}

export async function runNotificationCycle(client, adapter, options = {}) {
  const logger = options.logger ?? console;
  const status = await dataOrThrow(
    client.rpc("notification_channel_status"),
    "notification_channel_status_failed",
  );
  if (status?.budget_alert) {
    log(logger, "warn", "notification_budget_alert_threshold_reached", {
      estimatedSpendBrl: status.estimated_spend_brl,
      monthlyBudgetBrl: status.monthly_budget_brl,
    });
  }
  if (!status?.enabled || !status?.can_send) {
    const purge = await client.rpc("purge_notification_data");
    if (purge.error) throw new Error("notification_retention_purge_failed");
    return { claimed: 0, sent: 0, failed: 0, disabled: !status?.enabled };
  }

  const claimed = await dataOrThrow(
    client.rpc("claim_notification_outbox", { p_limit: options.batchSize ?? 20 }),
    "notification_claim_failed",
  );
  if (!Array.isArray(claimed)) throw new Error("notification_claim_response_invalid");

  let sent = 0;
  let failed = 0;
  for (const entry of claimed) {
    const begin = await client.rpc("begin_notification_dispatch", {
      p_id: entry.id,
      p_lease_token: entry.lease_token,
    });
    if (begin.error) throw new Error("notification_dispatch_begin_failed");
    if (begin.data !== true) continue;

    let outcome = "retryable";
    let errorCode = "notification_temporary_failure";
    let providerMessageId = null;
    try {
      const [order, payloadRecord] = await Promise.all([
        dataOrThrow(
          client
            .from("orders")
            .select("id,customer_id,public_reference,status,scheduled_pickup_at")
            .eq("id", entry.order_id)
            .maybeSingle(),
          "notification_order_read_failed",
        ),
        dataOrThrow(
          client
            .from("notification_payloads")
            .select("payload")
            .eq("notification_id", entry.id)
            .maybeSingle(),
          "notification_payload_read_failed",
        ),
      ]);
      if (!order || !payloadRecord?.payload) {
        outcome = "permanent";
        errorCode = "notification_source_missing";
      } else {
        const customer = await client.auth.admin.getUserById(order.customer_id);
        const user = customer.data?.user;
        const recipient = user?.email;
        if (customer.error || !recipient || !/^\S+@\S+\.\S+$/.test(recipient)) {
          outcome = "permanent";
          errorCode = "notification_recipient_missing";
        } else if (payloadRecord.payload.order_reference !== order.public_reference) {
          outcome = "permanent";
          errorCode = "notification_reference_mismatch";
        } else {
          const locale = resolveNotificationLocale(
            user.user_metadata?.notification_locale ?? user.user_metadata?.locale,
          );
          const rendered = renderNotification({
            type: entry.notification_type,
            locale,
            orderReference: payloadRecord.payload.order_reference,
            orderStatus: payloadRecord.payload.order_status,
            scheduledPickupAt: payloadRecord.payload.scheduled_pickup_at,
          });
          const result = await adapter.send({
            to: recipient,
            ...rendered,
            idempotencyKey: entry.idempotency_key,
          });
          outcome = "accepted";
          errorCode = null;
          providerMessageId = result.providerMessageId ?? null;
        }
      }
    } catch (error) {
      const code = error?.code;
      if (code === "notification_delivery_unknown") {
        outcome = "unknown";
        errorCode = "notification_delivery_unknown";
      } else if (
        code === "notification_message_invalid" ||
        code === "notification_recipient_rejected"
      ) {
        outcome = "permanent";
        errorCode = code;
      } else {
        outcome = "retryable";
        errorCode = allowedErrors.has(code) ? code : "notification_temporary_failure";
      }
    }

    const finished = await client.rpc("finish_notification_dispatch", {
      p_id: entry.id,
      p_lease_token: entry.lease_token,
      p_outcome: outcome,
      p_error_code: errorCode,
      p_provider_message_id: providerMessageId,
    });
    if (finished.error || finished.data !== true)
      throw new Error("notification_dispatch_finish_failed");
    if (outcome === "accepted") sent += 1;
    else if (outcome !== "unknown") failed += 1;
    log(logger, outcome === "accepted" ? "info" : "warn", "transactional_notification_result", {
      type: entry.notification_type,
      outcome,
      errorCode,
    });
  }

  const purge = await client.rpc("purge_notification_data");
  if (purge.error) throw new Error("notification_retention_purge_failed");
  log(logger, "info", "transactional_notification_cycle", {
    claimed: claimed.length,
    sent,
    failed,
  });
  return { claimed: claimed.length, sent, failed, disabled: false };
}

async function runWorker() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey)
    throw new Error("notification_worker_supabase_configuration_missing");

  const client = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  let adapter;
  let stopped = false;
  const interval = parseNotificationPollInterval();

  const stop = () => {
    stopped = true;
  };
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);

  try {
    while (!stopped) {
      try {
        await runNotificationCycle(client, {
          send: async (message) => {
            adapter ??= createSmtpEmailAdapter();
            return adapter.send(message);
          },
        });
      } catch (error) {
        log(console, "error", "transactional_notification_cycle_failed", {
          code: allowedErrors.has(error?.code) ? error.code : "notification_worker_cycle_failed",
        });
      }
      if (!stopped) await new Promise((resolve) => setTimeout(resolve, interval));
    }
  } finally {
    adapter?.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runWorker().then(
    () => process.exit(0),
    (error) => {
      log(console, "error", "transactional_notification_worker_stopped", {
        code: allowedErrors.has(error?.code) ? error.code : "notification_worker_stopped",
      });
      process.exit(1);
    },
  );
}
