import assert from "node:assert/strict";
import { test } from "node:test";
import {
  getAdminMutationDenial,
  getAdminSessionInsertOptions,
  getRecentMfaTimestamp,
} from "../../src/lib/auth/step-up";

const now = Date.parse("2026-10-23T12:00:00.000Z");

test("rejects an old aal2 token without a recent MFA proof", () => {
  assert.equal(
    getRecentMfaTimestamp(
      { aal: "aal2", amr: [{ method: "mfa/phone", timestamp: now / 1000 - 301 }] },
      now,
    ),
    null,
  );
  assert.equal(getRecentMfaTimestamp({ aal: "aal2" }, now), null);
});

test("accepts a recent verified mfa/phone timestamp from aal2 claims", () => {
  const timestamp = now / 1000 - 30;
  assert.equal(
    getRecentMfaTimestamp(
      { aal: "aal2", amr: [{ method: "mfa/phone", timestamp }] },
      now,
    )?.getTime(),
    timestamp * 1000,
  );
});

test("session establishment inserts once and ignores refresh conflicts", () => {
  assert.deepEqual(getAdminSessionInsertOptions(), {
    onConflict: "session_id",
    ignoreDuplicates: true,
  });
});

test("administrative POST distinguishes missing role from missing MFA", () => {
  assert.deepEqual(getAdminMutationDenial("employee", false), {
    error: "admin_role_required",
    status: 403,
  });
  assert.deepEqual(getAdminMutationDenial("admin", false), {
    error: "admin_mfa_required",
    status: 428,
  });
  assert.equal(getAdminMutationDenial("admin", true), null);
});
