import { createServer } from "node:http";

const host = "127.0.0.1";
const port = Number(process.env.TASK007_SINK_PORT ?? 8787);
const token = process.env.TASK007_SINK_TOKEN;
const failFirst = process.env.TASK007_SINK_FAIL_FIRST === "1";
if (!Number.isSafeInteger(port) || port < 1024 || port > 65535 || !token) {
  throw new Error("task007_synthetic_gateway_configuration_invalid");
}

const attemptsByKey = new Map();
const acceptedKeys = new Set();
const server = createServer((request, response) => {
  if (request.method !== "POST" || request.url !== "/send") {
    response.writeHead(404).end();
    return;
  }
  if (request.headers.authorization !== `Bearer ${token}`) {
    response.writeHead(401).end();
    return;
  }

  const chunks = [];
  let size = 0;
  request.on("data", (chunk) => {
    size += chunk.length;
    if (size <= 16 * 1024) chunks.push(chunk);
  });
  request.on("end", () => {
    if (size > 16 * 1024) {
      response.writeHead(413).end();
      return;
    }
    let payload;
    try {
      payload = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch {
      response.writeHead(400).end();
      return;
    }
    const key = payload?.idempotency_key;
    const recipient = payload?.to;
    const hasCustomerPiiKey = Object.keys(payload ?? {}).some((name) =>
      /cpf|customer.?email|customer.?phone|customer.?mobile/i.test(name),
    );
    if (
      typeof key !== "string" ||
      request.headers["idempotency-key"] !== key ||
      typeof recipient !== "string" ||
      !recipient.toLowerCase().endsWith(".invalid") ||
      typeof payload.subject !== "string" ||
      typeof payload.text !== "string" ||
      hasCustomerPiiKey
    ) {
      response.writeHead(400).end();
      return;
    }

    const attempt = (attemptsByKey.get(key) ?? 0) + 1;
    attemptsByKey.set(key, attempt);
    if (failFirst && attempt === 1) {
      console.info("synthetic_email_gateway", { attempt, result: "temporary_failure" });
      response.writeHead(503, { "content-type": "application/json" }).end('{"accepted":false}');
      return;
    }
    const duplicate = acceptedKeys.has(key);
    acceptedKeys.add(key);
    console.info("synthetic_email_gateway", { attempt, duplicate, result: "accepted" });
    response
      .writeHead(202, { "content-type": "application/json" })
      .end(JSON.stringify({ accepted: true, duplicate }));
  });
});

server.listen(port, host, () => {
  console.info("synthetic_email_gateway_ready", { host, port });
});

function stop() {
  server.close(() => process.exit(0));
}
process.once("SIGINT", stop);
process.once("SIGTERM", stop);
