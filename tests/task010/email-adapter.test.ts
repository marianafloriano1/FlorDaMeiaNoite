import assert from "node:assert/strict";
import test from "node:test";
import { createSmtpEmailAdapter } from "../../src/lib/notifications/email-adapter.mjs";

const localConfig = {
  NOTIFICATION_SMTP_HOST: "127.0.0.1",
  NOTIFICATION_SMTP_PORT: "54325",
  NOTIFICATION_ALLOW_INSECURE_LOCAL: "true",
  NOTIFICATION_FROM_ADDRESS: "notifications@example.invalid",
  NOTIFICATION_FROM_NAME: "Floricultura de teste",
};

test("SMTP adapter only allows plaintext for explicitly enabled loopback development", async () => {
  let transportOptions: Record<string, unknown> | undefined;
  let sent: Record<string, unknown> | undefined;
  const adapter = createSmtpEmailAdapter(localConfig, (options: Record<string, unknown>) => {
    transportOptions = options;
    return {
      sendMail: async (message: Record<string, unknown>) => {
        sent = message;
        return { accepted: ["customer@example.invalid"], messageId: "synthetic-id" };
      },
      close() {},
    };
  });
  const result = await adapter.send({
    to: "customer@example.invalid",
    subject: "Synthetic subject",
    text: "Synthetic message",
    idempotencyKey: "task010:order:status:2026-11-05",
  });
  assert.equal((transportOptions as { host: string }).host, "127.0.0.1");
  assert.equal((transportOptions as { secure: boolean }).secure, false);
  assert.equal(result.accepted, true);
  assert.equal(
    (sent?.headers as Record<string, string> | undefined)?.["X-Notification-Idempotency-Key"],
    "task010:order:status:2026-11-05",
  );
});

test("adapter refuses an unencrypted non-loopback SMTP relay", () => {
  assert.throws(
    () =>
      createSmtpEmailAdapter(
        {
          ...localConfig,
          NOTIFICATION_SMTP_HOST: "smtp.example.invalid",
          NOTIFICATION_ALLOW_INSECURE_LOCAL: "true",
          NOTIFICATION_SMTP_USERNAME: "synthetic-user",
          NOTIFICATION_SMTP_PASSWORD: "synthetic-password",
        },
        () => ({ sendMail: async () => ({ accepted: [] }), close() {} }),
      ),
    /notification_smtp_tls_required/,
  );
});

test("remote SMTP requires authentication unless anonymous TLS is explicitly allowed", () => {
  assert.throws(
    () =>
      createSmtpEmailAdapter(
        {
          ...localConfig,
          NOTIFICATION_SMTP_HOST: "smtp.example.invalid",
          NOTIFICATION_SMTP_SECURE: "true",
        },
        () => ({ sendMail: async () => ({ accepted: [] }), close() {} }),
      ),
    /notification_smtp_auth_required/,
  );
});

test("uncertain SMTP DATA result is terminal to avoid a potentially duplicate retry", async () => {
  const adapter = createSmtpEmailAdapter(localConfig, () => ({
    sendMail: async () => {
      throw Object.assign(new Error("synthetic socket loss"), { command: "DATA" });
    },
    close() {},
  }));
  await assert.rejects(
    adapter.send({
      to: "customer@example.invalid",
      subject: "Test",
      text: "Test",
      idempotencyKey: "task010:1",
    }),
    (error: Error & { code?: string; retrySafe?: boolean }) =>
      error.code === "notification_delivery_unknown" && error.retrySafe === false,
  );
});
