import assert from "node:assert/strict";
import test from "node:test";
import { createClient } from "@supabase/supabase-js";
import {
  AUTH_REQUEST_TIMEOUT_MS,
  fetchWithAuthTimeout,
  getAuthErrorFeedback,
  reportAuthFailure,
} from "../src/lib/supabase/auth-request.ts";

const authUrl = "https://auth-audit.invalid/auth/v1/token?grant_type=password";

test("distinguishes network, account, throttling, storage and upstream failures in Chinese", () => {
  for (const [error, kind] of [
    [new TypeError("Failed to fetch"), "network"],
    [{ name: "AuthRetryableFetchError", status: 0, message: "Load failed" }, "network"],
    [{ name: "AuthRetryableFetchError", status: 503, message: "Unavailable" }, "server"],
    [{ status: 429, message: "Too many requests" }, "rate-limit"],
    [{ code: "over_email_send_rate_limit" }, "rate-limit"],
    [{ code: "invalid_credentials" }, "credentials"],
    [{ code: "email_not_confirmed" }, "unconfirmed"],
    [{ name: "SecurityError" }, "storage"],
    [{ code: "weak_password" }, "password"],
    [new Error("unrecognized upstream detail"), "unknown"],
  ]) {
    const feedback = getAuthErrorFeedback(error);
    assert.equal(feedback.kind, kind);
    assert.match(feedback.message, /[\u4e00-\u9fff]/);
  }
});

test("the installed Supabase SDK turns an interrupted connection into a network hint without retrying", async (t) => {
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () => {
    calls += 1;
    throw new TypeError("Failed to fetch");
  });
  const client = createClient("https://auth-audit.invalid", "public-audit-key", {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    global: { fetch: fetchWithAuthTimeout },
  });
  const result = await client.auth.signInWithPassword({
    email: "audit@example.invalid",
    password: "not-a-real-login",
  });
  assert.equal(calls, 1);
  assert.equal(result.error?.status, 0);
  assert.equal(getAuthErrorFeedback(result.error).kind, "network");
  assert.equal(result.data.session, null);
});

test("an unresponsive Auth connection is actually aborted at the deadline", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let requestSignal;
  t.mock.method(globalThis, "fetch", (_input, init) => new Promise((_resolve, reject) => {
    requestSignal = init.signal;
    requestSignal.addEventListener("abort", () => reject(requestSignal.reason), { once: true });
  }));
  const result = assert.rejects(fetchWithAuthTimeout(authUrl), error => {
    assert.equal(getAuthErrorFeedback(error).kind, "timeout");
    return true;
  });
  t.mock.timers.tick(AUTH_REQUEST_TIMEOUT_MS);
  await result;
  assert.equal(requestSignal.aborted, true);
});

test("a stalled Auth response body is also aborted before any tokens can be read", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let requestSignal;
  t.mock.method(globalThis, "fetch", async (_input, init) => {
    requestSignal = init.signal;
    return new Response(new ReadableStream({
      start(controller) {
        requestSignal.addEventListener("abort", () => controller.error(requestSignal.reason), { once: true });
      },
    }), { headers: { "Content-Type": "application/json" } });
  });
  const result = assert.rejects(fetchWithAuthTimeout(authUrl), error => {
    assert.equal(getAuthErrorFeedback(error).kind, "timeout");
    return true;
  });
  await Promise.resolve();
  t.mock.timers.tick(AUTH_REQUEST_TIMEOUT_MS);
  await result;
  assert.equal(requestSignal.aborted, true);
});

test("successful Auth replies keep their status, headers and JSON, and clear the deadline", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let requestSignal;
  const payload = { code: "invalid_credentials", msg: "Invalid login credentials" };
  t.mock.method(globalThis, "fetch", async (_input, init) => {
    requestSignal = init.signal;
    return Response.json(payload, { status: 400, headers: { "X-Request-Id": "audit-request" } });
  });
  const response = await fetchWithAuthTimeout(authUrl);
  assert.equal(response.status, 400);
  assert.equal(response.headers.get("X-Request-Id"), "audit-request");
  assert.deepEqual(await response.json(), payload);
  t.mock.timers.tick(AUTH_REQUEST_TIMEOUT_MS);
  assert.equal(requestSignal.aborted, false);
});

test("caller cancellation remains cancellation rather than being relabeled as a timeout", async (t) => {
  t.mock.method(globalThis, "fetch", (_input, init) => new Promise((_resolve, reject) => {
    if (init.signal.aborted) reject(init.signal.reason);
    else init.signal.addEventListener("abort", () => reject(init.signal.reason), { once: true });
  }));
  const caller = new AbortController();
  const reason = new DOMException("Canceled by caller", "AbortError");
  const result = assert.rejects(fetchWithAuthTimeout(new Request(authUrl, { signal: caller.signal })), error => error === reason);
  caller.abort(reason);
  await result;
});

test("database and media requests keep the original fetch and streaming response", async (t) => {
  const original = new Response("audio or database response");
  const init = { method: "GET" };
  t.mock.method(globalThis, "fetch", async (_input, actualInit) => {
    assert.equal(actualInit, init);
    return original;
  });
  assert.equal(await fetchWithAuthTimeout("https://auth-audit.invalid/storage/v1/object/audio.mp3", init), original);
  assert.equal(original.bodyUsed, false);
});

test("failure diagnostics exclude raw messages, identity, passwords and tokens", (t) => {
  let record;
  t.mock.method(console, "warn", (_label, details) => { record = details; });
  reportAuthFailure("login", {
    status: 400,
    message: "private-password private-token user@example.invalid",
    access_token: "private-token",
    email: "user@example.invalid",
  }, Date.now() - 15);
  assert.equal(record.category, "unknown");
  assert.equal(record.status, 400);
  assert.ok(record.elapsedMs >= 15);
  assert.doesNotMatch(JSON.stringify(record), /private-password|private-token|user@example/);
});
