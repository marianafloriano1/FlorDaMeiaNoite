import nodemailer from "nodemailer";

const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);

function required(value, name) {
  if (!value) throw new Error(`notification_smtp_${name}_missing`);
  return value;
}

export function createSmtpEmailAdapter(
  env = process.env,
  transportFactory = nodemailer.createTransport,
) {
  const host = required(env.NOTIFICATION_SMTP_HOST, "host");
  const port = Number(required(env.NOTIFICATION_SMTP_PORT, "port"));
  if (!Number.isSafeInteger(port) || port < 1 || port > 65535) {
    throw new Error("notification_smtp_port_invalid");
  }

  const fromAddress = required(env.NOTIFICATION_FROM_ADDRESS, "from_address");
  const fromName = required(env.NOTIFICATION_FROM_NAME, "from_name");
  if (!/^\S+@\S+\.\S+$/.test(fromAddress) || /[\r\n]/.test(fromName)) {
    throw new Error("notification_smtp_sender_invalid");
  }

  const secure = env.NOTIFICATION_SMTP_SECURE === "true";
  const localDevelopment =
    env.NOTIFICATION_ALLOW_INSECURE_LOCAL === "true" && localHosts.has(host.toLowerCase());
  const username = env.NOTIFICATION_SMTP_USERNAME;
  const password = env.NOTIFICATION_SMTP_PASSWORD;
  if ((username && !password) || (!username && password)) {
    throw new Error("notification_smtp_auth_configuration_invalid");
  }
  if (!localDevelopment && !username && env.NOTIFICATION_SMTP_ALLOW_ANONYMOUS_TLS !== "true") {
    throw new Error("notification_smtp_auth_required");
  }
  if (!secure && !localDevelopment && env.NOTIFICATION_SMTP_REQUIRE_TLS !== "true") {
    throw new Error("notification_smtp_tls_required");
  }

  const transport = transportFactory({
    host,
    port,
    secure,
    requireTLS: !secure && !localDevelopment,
    auth: username ? { user: username, pass: password } : undefined,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
    tls: { rejectUnauthorized: true },
  });

  return {
    async send({ to, subject, text, idempotencyKey }) {
      if (!/^\S+@\S+\.\S+$/.test(to) || !/^[a-zA-Z0-9:_-]{1,200}$/.test(idempotencyKey)) {
        throw Object.assign(new Error("notification_message_invalid"), {
          code: "notification_invalid_message",
        });
      }
      try {
        const result = await transport.sendMail({
          from: { name: fromName, address: fromAddress },
          to,
          subject,
          text,
          headers: { "X-Notification-Idempotency-Key": idempotencyKey },
        });
        if (!result.accepted?.some((address) => address.toLowerCase() === to.toLowerCase())) {
          throw Object.assign(new Error("notification_recipient_not_accepted"), {
            code: "notification_recipient_rejected",
          });
        }
        return { accepted: true, providerMessageId: result.messageId ?? null };
      } catch (error) {
        if (error?.code?.startsWith("notification_")) throw error;
        const uncertain = error?.command === "DATA" && !Number.isInteger(error?.responseCode);
        throw Object.assign(
          new Error(uncertain ? "notification_delivery_unknown" : "notification_smtp_failed"),
          {
            code: uncertain
              ? "notification_delivery_unknown"
              : "notification_smtp_temporary_failure",
            retrySafe: !uncertain,
          },
        );
      }
    },
    close() {
      transport.close();
    },
  };
}
