import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";

export function parsePollInterval(value = process.env.RESERVATION_EXPIRY_POLL_INTERVAL_MS) {
  if (value === undefined || value === "") return 60_000;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1_000 || parsed > 3_600_000) {
    throw new Error("invalid_reservation_expiry_poll_interval");
  }
  return parsed;
}

export async function runExpirationCycle(client) {
  const { data, error } = await client.rpc("expire_due_reservations", { p_limit: 100 });
  if (error || !Number.isInteger(data) || data < 0) {
    throw new Error("reservation_expiration_cycle_failed");
  }
  if (data > 0) console.info("reservation_expiration_completed", { count: data });
  return data;
}

async function runWorker() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("reservation_expiration_worker_configuration_missing");
  }

  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const interval = parsePollInterval();
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
      await runExpirationCycle(client);
    } catch {
      console.error("reservation_expiration_cycle_failed");
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
    console.error("reservation_expiration_worker_stopped");
    process.exitCode = 1;
  });
}
