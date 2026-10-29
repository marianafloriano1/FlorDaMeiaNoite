import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export function parseAlertPollInterval(value = process.env.CATALOG_STOCK_ALERT_POLL_INTERVAL_MS) {
  if (value === undefined || value === "") return 30_000;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1_000 || parsed > 3_600_000) {
    throw new Error("catalog_stock_alert_invalid_poll_interval");
  }
  return parsed;
}

function isSafeWebhookUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  } catch {
    return false;
  }
}

export async function runCatalogStockAlertCycle(client, options) {
  const { endpoint, token, recipient, fetchImpl = fetch } = options;
  if (!isSafeWebhookUrl(endpoint) || !token || !recipient) {
    throw new Error("catalog_stock_alert_configuration_missing");
  }
  const { data: events, error } = await client.rpc("claim_catalog_stock_alerts", { p_limit: 20 });
  if (error || !Array.isArray(events)) throw new Error("catalog_stock_alert_claim_failed");

  let sent = 0;
  for (const event of events) {
    const { data: product, error: productError } = await client
      .from("catalog_products")
      .select("name,slug")
      .eq("id", event.product_id)
      .maybeSingle();
    let deliveryError = productError ? "catalog_product_read_failed" : null;
    if (!deliveryError && !product) deliveryError = "catalog_product_missing";
    if (!deliveryError) {
      const body = {
        to: recipient,
        subject: "Alerta interno de estoque baixo",
        text: `O produto ${product.name} (${product.slug}) cruzou o limite interno de estoque: ${event.quantity_before} para ${event.quantity_after} unidades.`,
        idempotency_key: event.idempotency_key,
      };
      try {
        const response = await fetchImpl(endpoint, {
          method: "POST",
          headers: {
            authorization: `Bearer ${token}`,
            "content-type": "application/json",
            "idempotency-key": event.idempotency_key,
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(10_000),
        });
        if (!response.ok) deliveryError = `provider_http_${response.status}`;
      } catch {
        deliveryError = "provider_unavailable";
      }
    }

    const { data: completed, error: completionError } = await client.rpc(
      "finish_catalog_stock_alert",
      {
        p_id: event.id,
        p_sent: deliveryError === null,
        p_error_code: deliveryError,
      },
    );
    if (completionError || completed !== true)
      throw new Error("catalog_stock_alert_completion_failed");
    if (deliveryError === null) sent += 1;
  }
  if (sent > 0) console.info("catalog_stock_alerts_sent", { count: sent });
  return { claimed: events.length, sent };
}

async function runWorker() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const endpoint = process.env.LOW_STOCK_ALERT_EMAIL_WEBHOOK_URL;
  const token = process.env.LOW_STOCK_ALERT_EMAIL_WEBHOOK_TOKEN;
  const recipient = process.env.LOW_STOCK_ALERT_RECIPIENT;
  if (!supabaseUrl || !serviceRoleKey || !endpoint || !token || !recipient) {
    throw new Error("catalog_stock_alert_worker_configuration_missing");
  }

  const { createClient } = await import("@supabase/supabase-js");
  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const interval = parseAlertPollInterval();
  let stopping = false;
  let timer;
  const stop = () => {
    stopping = true;
    if (timer) clearTimeout(timer);
  };
  process.once("SIGTERM", stop);
  process.once("SIGINT", stop);

  while (!stopping) {
    try {
      await runCatalogStockAlertCycle(client, { endpoint, token, recipient });
    } catch {
      console.error("catalog_stock_alert_cycle_failed");
    }
    if (!stopping) {
      await new Promise((resolvePromise) => {
        timer = setTimeout(resolvePromise, interval);
      });
    }
  }
}

const isDirectExecution =
  process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isDirectExecution) {
  runWorker().catch(() => {
    console.error("catalog_stock_alert_worker_stopped");
    process.exitCode = 1;
  });
}
