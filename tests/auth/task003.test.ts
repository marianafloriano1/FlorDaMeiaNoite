import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeAndValidateCpf } from "../../src/lib/auth/cpf";
import { isAdminSessionWithinIdleWindow } from "../../src/lib/auth/idle-window";

test("CPF validation normalizes punctuation and checks both verifier digits", () => {
  assert.equal(normalizeAndValidateCpf("529.982.247-25"), "52998224725");
  assert.equal(normalizeAndValidateCpf("52998224725"), "52998224725");
  assert.equal(normalizeAndValidateCpf("529.982.247-24"), null);
});

test("CPF validation rejects malformed values and repeated sequences", () => {
  assert.equal(normalizeAndValidateCpf("111.111.111-11"), null);
  assert.equal(normalizeAndValidateCpf("123"), null);
  assert.equal(normalizeAndValidateCpf("abc.def.ghi-jk"), null);
  assert.equal(normalizeAndValidateCpf("00000000000"), null);
});

test("admin session idle window is checked with a simulated clock", () => {
  const lastActivity = new Date("2026-01-01T12:00:00.000Z");
  assert.equal(
    isAdminSessionWithinIdleWindow(lastActivity, new Date("2026-01-01T12:59:59.999Z")),
    true,
  );
  assert.equal(
    isAdminSessionWithinIdleWindow(lastActivity, new Date("2026-01-01T13:00:00.001Z")),
    false,
  );
});
