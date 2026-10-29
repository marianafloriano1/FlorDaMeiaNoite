import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizePhoneNumber } from "../../src/lib/auth/phone";

test("normalizes an unprefixed verified phone to E.164", () => {
  assert.equal(normalizePhoneNumber("15555550105"), "+15555550105");
});

test("keeps an already prefixed E.164 phone", () => {
  assert.equal(normalizePhoneNumber("+15555550105"), "+15555550105");
});

test("rejects invalid phone values for invalid_profile", () => {
  assert.equal(normalizePhoneNumber("not-a-phone"), null);
});
