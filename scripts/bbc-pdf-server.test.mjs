import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

function load(filename, modules, globals = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(new URL(filename, import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { exports, File, FormData, Headers, setTimeout, ...globals, require: name => {
    if (name in modules) return modules[name];
    throw new Error(`Unexpected dependency ${name}`);
  } });
  return exports;
}

test("PDF compatibility endpoint authorizes admins before reading bytes and keeps extraction private", async () => {
  let role = "member", tokenValid = true, reads = 0, extractions = 0;
  const quiz = { status: "ready", source: { pdf: "260824.pdf" }, quiz: [{ answer: "autumn" }] };
  const api = load("../src/app/api/admin/bbc-pdf-quiz/route.ts", {
    "next/server": { NextResponse: { json: (body, options = {}) => new Response(JSON.stringify(body), { status: options.status ?? 200, headers: options.headers }) } },
    "@supabase/supabase-js": { createClient: () => ({
      auth: { getUser: async () => ({ data: { user: tokenValid ? { id: "admin-fixture" } : null }, error: null }) },
      from: () => ({ select() { return this; }, eq() { return this; }, single: async () => ({ data: { role }, error: null }) }),
    }) },
    "@/lib/admin/bbc-pdf-server": { importBbcPdfOnServer: async () => { extractions++; return quiz; } },
  }, { process: { env: { NEXT_PUBLIC_SUPABASE_URL: "https://fixture.invalid", SUPABASE_SERVICE_ROLE_KEY: "fixture-only" } } });
  const file = new File(["%PDF-fixture"], "260824.pdf");
  const request = (auth = true, selected = file, length = "") => ({
    headers: new Headers({ ...(auth ? { Authorization: "Bearer fixture" } : {}), ...(length ? { "Content-Length": length } : {}) }),
    formData: async () => { reads++; return { get: () => selected }; },
  });
  assert.equal((await api.POST(request(false))).status, 401);
  assert.equal((await api.POST(request())).status, 403);
  tokenValid = false; assert.equal((await api.POST(request())).status, 401);
  assert.equal(reads, 0); assert.equal(extractions, 0);
  tokenValid = true; role = "admin";
  assert.equal((await api.POST(request(true, file, String(5 * 1024 * 1024)))).status, 413);
  assert.equal((await api.POST(request(true, new File(["bad"], "not.pdf.png")))).status, 400);
  const response = await api.POST(request());
  assert.equal(response.status, 200); assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  assert.deepEqual(await response.json(), { quiz }); assert.equal(extractions, 1);
});

test("admin multipart uploads preserve the boundary and authentication retry instead of sending JSON headers", async () => {
  const sent = [];
  const client = { auth: {
    getSession: async () => ({ data: { session: { access_token: "first" } }, error: null }),
    refreshSession: async () => ({ data: { session: { access_token: "refreshed" } }, error: null }),
  } };
  const { adminRequest } = load("../src/lib/admin/request.ts", { "@/lib/supabase/client": { supabase: client } }, {
    fetch: async (path, options) => { sent.push(options); return sent.length === 1 ? Response.json({ error: "管理员登录已失效" }, { status: 401 }) : Response.json({ quiz: "ready" }); },
  });
  const body = new FormData(); body.set("file", new File(["%PDF-"], "260824.pdf"));
  assert.equal((await adminRequest("/api/admin/bbc-pdf-quiz", { method: "POST", body })).quiz, "ready");
  assert.equal(sent.length, 2);
  for (const request of sent) { assert.equal(request.body, body); assert.equal(request.headers.has("Content-Type"), false); }
  assert.equal(sent[1].headers.get("Authorization"), "Bearer refreshed");
});
