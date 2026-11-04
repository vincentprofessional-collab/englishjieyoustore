import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";

test("generic media GET/HEAD reject retired video buckets before signing or fetching any object", async () => {
  const exports = {};
  let upstreamCalls = 0;
  const forbidden = () => { upstreamCalls++; throw new Error("A retired video must never reach storage."); };
  const code = ts.transpileModule(readFileSync(new URL("../src/app/api/media/route.ts", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const imports = {
    "next/server": { NextResponse: Response },
    "@/lib/cos/storage": { getSignedCosMediaUrl: forbidden },
    "@/lib/media/url": { getSupabaseStorageUrl: forbidden, isLegacyCosOnlyMediaPath: () => false },
    "@/lib/vocabulary/primary-school-vocabulary-images": { isVocabularyImagePath: () => false },
  };
  runInNewContext(code, { exports, Response, Headers, process: { env: {} }, fetch: forbidden,
    require(name) { assert.ok(name in imports, name); return imports[name]; },
  });
  for (const bucket of ["video", "videos"]) for (const method of ["GET", "HEAD"]) {
    const url = new URL(`https://fixture.invalid/api/media?bucket=${bucket}&path=vocabulary/baby.mp4`);
    const response = await (exports[method] ?? exports.GET)({ nextUrl: url, method, headers: new Headers() });
    assert.equal(response.status, 400);
  }
  assert.equal(upstreamCalls, 0);
});
