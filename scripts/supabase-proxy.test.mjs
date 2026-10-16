import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createClient } from "@supabase/supabase-js";
import { AUTH_REQUEST_TIMEOUT_MS, createBrowserSupabaseFetch, getAuthErrorFeedback } from "../src/lib/supabase/auth-request.ts";
import { GET, POST } from "../src/app/api/supabase/[...path]/route.ts";

const site = "https://site.invalid";
const upstream = "https://project.invalid";
const publicKey = "public-test-key";
process.env.NEXT_PUBLIC_SUPABASE_URL = upstream;
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = publicKey;
const context = path => ({ params: Promise.resolve({ path: path.split("/") }) });
const forward = (path, init = {}) => POST(new Request(`${site}/api/supabase/${path}`, init), context(path.split("?")[0]));
function browser(t) {
  globalThis.window = { location: { origin: site } };
  t.after(() => { delete globalThis.window; });
}

test("browser Auth and REST calls use the site while keeping Request bodies, headers, cancellation and other services intact", async t => {
  browser(t);
  const fetch = createBrowserSupabaseFetch(upstream);
  const calls = [];
  t.mock.method(globalThis, "fetch", async (input, init) => {
    const request = new Request(input, init);
    calls.push({ url: request.url, method: request.method, headers: request.headers, body: await request.text(), signal: request.signal });
    return Response.json({ ok: true });
  });
  const caller = new AbortController();
  await fetch(new Request(`${upstream}/auth/v1/token?grant_type=password`, {
    method: "POST", body: "test-body", headers: { authorization: "Bearer test-token" }, signal: caller.signal,
  }));
  await fetch(new URL(`${upstream}/rest/v1/profiles?select=id`));
  await fetch(`${upstream}/storage/v1/object/audio.mp3`);
  await fetch("https://unrelated.invalid/auth/v1/user");
  assert.deepEqual(calls.map(call => call.url), [
    `${site}/api/supabase/auth/v1/token?grant_type=password`,
    `${site}/api/supabase/rest/v1/profiles?select=id`,
    `${upstream}/storage/v1/object/audio.mp3`,
    "https://unrelated.invalid/auth/v1/user",
  ]);
  assert.equal(calls[0].method, "POST");
  assert.equal(calls[0].body, "test-body");
  assert.equal(calls[0].headers.get("authorization"), "Bearer test-token");
  t.mock.method(globalThis, "fetch", (_input, init) => new Promise((_resolve, reject) => {
    init.signal.addEventListener("abort", () => reject(init.signal.reason), { once: true });
  }));
  const reason = new DOMException("Canceled by caller", "AbortError");
  const pending = assert.rejects(fetch(new Request(`${upstream}/auth/v1/user`, { signal: caller.signal })), error => error === reason);
  caller.abort(reason);
  await pending;
});

test("server-side SDK fetches keep the direct upstream URL", async t => {
  const original = new Response("stream");
  t.mock.method(globalThis, "fetch", async input => {
    assert.equal(String(input), `${upstream}/rest/v1/profiles`);
    return original;
  });
  assert.equal(await createBrowserSupabaseFetch(upstream)(`${upstream}/rest/v1/profiles`), original);
});

test("the installed SDK signs in, refreshes, reads the user and RLS data, and signs out through the site", async t => {
  browser(t);
  const seen = [];
  const user = { id: "c110fc45-e330-45e6-8000-8a1a10000001", aud: "authenticated", email: "test@example.invalid" };
  let rotation = 0;
  const accessToken = `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ sub: user.id, exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url")}.test-signature`;
  t.mock.method(globalThis, "fetch", async (input, init) => {
    const request = new Request(input, init);
    const url = new URL(request.url);
    if (url.origin === site) {
      seen.push(url.pathname);
      return forward(`${url.pathname.slice("/api/supabase/".length)}${url.search}`, {
        method: request.method, headers: request.headers, body: ["GET", "HEAD"].includes(request.method) ? undefined : await request.text(),
      });
    }
    assert.equal(url.origin, upstream);
    assert.equal(request.headers.get("apikey"), publicKey);
    if (url.pathname === "/auth/v1/token") {
      const body = await request.json();
      if (url.searchParams.get("grant_type") === "password") assert.equal(body.password, "test-password");
      else assert.equal(body.refresh_token, "refresh-1");
      rotation += 1;
      return Response.json({ access_token: accessToken, refresh_token: `refresh-${rotation}`, expires_in: 3600, token_type: "bearer", user });
    }
    assert.equal(request.headers.get("authorization"), `Bearer ${accessToken}`);
    if (url.pathname === "/auth/v1/user") return Response.json(user);
    if (url.pathname === "/rest/v1/profiles") return Response.json([{ id: user.id }]);
    if (url.pathname === "/auth/v1/logout") return new Response(null, { status: 204 });
    assert.fail(`unexpected upstream path: ${url.pathname}`);
  });
  const client = createClient(upstream, publicKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    global: { fetch: createBrowserSupabaseFetch(upstream) },
  });
  assert.equal((await client.auth.signInWithPassword({ email: user.email, password: "test-password" })).error, null);
  assert.equal((await client.auth.refreshSession()).data.session.refresh_token, "refresh-2");
  assert.equal((await client.auth.getUser()).data.user.id, user.id);
  assert.deepEqual((await client.from("profiles").select("id").eq("id", user.id)).data, [{ id: user.id }]);
  assert.equal((await client.auth.signOut()).error, null);
  assert.equal((await client.auth.getSession()).data.session, null);
  assert.deepEqual(seen, ["/api/supabase/auth/v1/token", "/api/supabase/auth/v1/token", "/api/supabase/auth/v1/user", "/api/supabase/rest/v1/profiles", "/api/supabase/auth/v1/logout"]);
});

test("the gateway uses only the configured upstream and public key, retains caller RLS identity, and never forwards cookies or caches tokens", async t => {
  t.mock.method(globalThis, "fetch", async (input, init) => {
    assert.equal(String(input), `${upstream}/rest/v1/profiles?select=id&limit=1`);
    assert.equal(init.headers.get("apikey"), publicKey);
    assert.equal(init.headers.get("authorization"), "Bearer caller-token");
    assert.equal(init.headers.get("prefer"), "count=exact");
    assert.equal(init.headers.get("accept-profile"), "public");
    for (const name of ["cookie", "host", "x-forwarded-host", "x-forwarded-for"]) assert.equal(init.headers.has(name), false);
    assert.equal(init.cache, "no-store");
    assert.equal(init.redirect, "manual");
    return Response.json([{ id: "own-row" }], { status: 206, headers: { "content-range": "0-0/1", "set-cookie": "upstream=must-not-forward", "cache-control": "public, max-age=3600" } });
  });
  const result = await GET(new Request(`${site}/api/supabase/rest/v1/profiles?select=id&limit=1`, {
    headers: { apikey: "untrusted-key", authorization: "Bearer caller-token", cookie: "private-site-cookie=secret", prefer: "count=exact", "accept-profile": "public", "x-forwarded-host": "elsewhere.invalid" },
  }), context("rest/v1/profiles"));
  assert.equal(result.status, 206);
  assert.deepEqual(await result.json(), [{ id: "own-row" }]);
  assert.equal(result.headers.get("content-range"), "0-0/1");
  assert.equal(result.headers.has("set-cookie"), false);
  assert.match(result.headers.get("cache-control"), /private, no-store/);
  assert.equal(result.headers.get("vercel-cdn-cache-control"), "no-store");
});

test("invalid paths, cross-site requests and oversized bodies never reach upstream", async t => {
  t.mock.method(globalThis, "fetch", () => assert.fail("must reject before fetch"));
  for (const path of ["storage/v1/object", "auth/v1/admin/users", "auth/v1/../token", "rest/v1/https:", "auth/v1"]) {
    assert.equal((await forward(path)).status, 404);
  }
  assert.equal((await forward("auth/v1/token", { method: "POST", headers: { origin: "https://other.invalid" } })).status, 403);
  assert.equal((await forward("auth/v1/token", { headers: { "sec-fetch-site": "cross-site" } })).status, 403);
  assert.equal((await forward("auth/v1/token", { method: "POST", headers: { "content-length": "3500001" } })).status, 413);
  assert.equal((await forward("auth/v1/token", { method: "POST", body: "x".repeat(3_500_001) })).status, 413);
});

test("upstream redirects and network failures return private, sanitized errors", async t => {
  t.mock.method(globalThis, "fetch", async () => new Response(null, { status: 302, headers: { location: "https://other.invalid/private-token" } }));
  const redirect = await forward("auth/v1/token");
  assert.equal(redirect.status, 502);
  assert.equal(redirect.headers.has("location"), false);
  t.mock.method(globalThis, "fetch", async () => { throw new Error("private-password private-token user@example.invalid"); });
  const failure = await forward("auth/v1/token");
  assert.equal(failure.status, 502);
  assert.doesNotMatch(await failure.text(), /private-password|private-token|user@example/);
  t.mock.method(globalThis, "fetch", async () => { throw new DOMException("private-details", "TimeoutError"); });
  assert.equal((await forward("auth/v1/token")).status, 504);
});

test("same-origin Auth calls retain the abort deadline", async t => {
  browser(t);
  t.mock.timers.enable({ apis: ["setTimeout"] });
  t.mock.method(globalThis, "fetch", (_input, init) => new Promise((_resolve, reject) => {
    init.signal.addEventListener("abort", () => reject(init.signal.reason), { once: true });
  }));
  const result = assert.rejects(createBrowserSupabaseFetch(upstream)(`${upstream}/auth/v1/token`), error => getAuthErrorFeedback(error).kind === "timeout");
  t.mock.timers.tick(AUTH_REQUEST_TIMEOUT_MS);
  await result;
});

test("the forwarding route bypasses middleware session rotation before creating the auth client", () => {
  const source = readFileSync(new URL("../src/proxy.ts", import.meta.url), "utf8");
  const bypass = source.indexOf('if (path.startsWith("/api/supabase/"))');
  assert.ok(bypass >= 0 && bypass < source.indexOf("const existingVisitorId"));
});
