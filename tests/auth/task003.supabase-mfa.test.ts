import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

test("local Supabase Auth completes synthetic phone MFA and reaches aal2", async () => {
  assert.ok(supabaseUrl?.startsWith("http://127.0.0.1:"), "requires loopback Supabase URL");
  assert.ok(anonKey, "NEXT_PUBLIC_SUPABASE_ANON_KEY is required");
  assert.ok(serviceRoleKey, "SUPABASE_SERVICE_ROLE_KEY is required");

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const client = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const email = `task003-mfa-${randomUUID()}@example.test`;
  const password = `Synthetic-${randomUUID()}-A9!`;
  const startedAt = new Date().toISOString();
  let userId: string | undefined;
  let captureId: number | undefined;

  try {
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    assert.ifError(created.error);
    assert.ok(created.data.user);
    userId = created.data.user.id;

    const signedIn = await client.auth.signInWithPassword({ email, password });
    assert.ifError(signedIn.error);
    assert.ok(signedIn.data.session);

    const enrolled = await client.auth.mfa.enroll({
      factorType: "phone",
      phone: "+15555550100",
    });
    assert.ifError(enrolled.error);
    assert.ok(enrolled.data.id);

    const challenge = await client.auth.mfa.challenge({ factorId: enrolled.data.id });
    assert.ifError(challenge.error);
    assert.ok(challenge.data.id);

    const captured = await admin
      .from("local_sms_captures")
      .select("id,otp")
      .gte("created_at", startedAt)
      .order("id", { ascending: false })
      .limit(1)
      .single();
    assert.ifError(captured.error);
    assert.ok(captured.data.otp);
    captureId = captured.data.id;

    const verified = await client.auth.mfa.verify({
      factorId: enrolled.data.id,
      challengeId: challenge.data.id,
      code: captured.data.otp,
    });
    assert.ifError(verified.error);

    const assurance = await client.auth.mfa.getAuthenticatorAssuranceLevel();
    assert.ifError(assurance.error);
    assert.equal(assurance.data.currentLevel, "aal2");
  } finally {
    if (captureId) await admin.from("local_sms_captures").delete().eq("id", captureId);
    if (userId) await admin.auth.admin.deleteUser(userId);
  }
});
