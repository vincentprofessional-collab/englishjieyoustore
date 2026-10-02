import assert from "node:assert/strict";
import test from "node:test";
import { resolveCurrentMembership } from "../src/lib/membership/current-membership.ts";

const now = Date.parse("2026-10-02T00:00:00.000Z");
const lifetime = (status, expiresAt = "infinity") => ({
  expires_at: expiresAt,
  plan: "lifetime",
  starts_at: "2025-01-01T00:00:00.000Z",
  status,
});

test("active lifetime entitlement keeps the lifetime badge", () => {
  assert.deepEqual(resolveCurrentMembership({}, [lifetime("active")], now), {
    plan: "lifetime",
    state: "active",
  });
});

test("expired or canceled lifetime history overrides stale legacy lifetime profile", () => {
  const profile = { member_number: 18, membership_status: "lifetime" };
  for (const status of ["expired", "canceled"]) {
    assert.deepEqual(resolveCurrentMembership(profile, [lifetime(status)], now), {
      plan: null,
      state: "expired",
    });
  }
});

test("an active current plan wins over canceled lifetime history", () => {
  assert.deepEqual(resolveCurrentMembership({}, [
    lifetime("canceled"),
    { expires_at: "2026-12-01T00:00:00.000Z", plan: "monthly", starts_at: "2026-09-01T00:00:00.000Z", status: "active" },
  ], now), {
    plan: "monthly",
    state: "active",
  });
});

test("legacy accounts keep their badge only when there is no entitlement history", () => {
  assert.equal(resolveCurrentMembership({ membership_status: "lifetime" }, [], now).plan, "lifetime");
  assert.deepEqual(resolveCurrentMembership({ membership_status: "lifetime" }, [], now, false), {
    plan: null,
    state: "guest",
  });
});

test("active profile subscriptions expire according to their date", () => {
  assert.equal(resolveCurrentMembership({ membership_status: "paid", membership_expires_at: "2026-11-01T00:00:00.000Z" }, [], now).state, "active");
  assert.deepEqual(resolveCurrentMembership({ member_number: 22, membership_status: "paid", membership_expires_at: "2026-09-01T00:00:00.000Z" }, [], now), {
    plan: null,
    state: "expired",
  });
});
