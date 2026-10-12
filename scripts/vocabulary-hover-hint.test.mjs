import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { loadVocabularyHoverHint } from "../src/lib/vocabulary/hover-hint.ts";

test("hover lookups share an in-flight request and reuse the resolved definition", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  let requests = 0;
  let respond;
  globalThis.fetch = () => {
    requests += 1;
    return new Promise((resolve) => { respond = resolve; });
  };
  const first = loadVocabularyHoverHint("  EXAM ");
  const second = loadVocabularyHoverHint("exam");
  assert.equal(first, second);
  assert.equal(requests, 1);
  const hint = { word: "exam", definitionCn: "考试" };
  respond(Response.json({ hint }));
  assert.deepEqual(await first, hint);
  assert.deepEqual(await loadVocabularyHoverHint("exam"), hint);
  assert.equal(requests, 1);
});

test("temporary lookup failures can be retried instead of caching an empty definition", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  let requests = 0;
  globalThis.fetch = async () => {
    requests += 1;
    return requests === 1
      ? new Response(null, { status: 503 })
      : Response.json({ hint: { word: "retry", definitionCn: "重试" } });
  };
  assert.equal(await loadVocabularyHoverHint("retry"), null);
  assert.equal((await loadVocabularyHoverHint("retry")).definitionCn, "重试");
  assert.equal(requests, 2);
});

test("brief definitions use local data while detailed and missing entries retain extended lookup", async () => {
  const entry = { word: "exam", definitionCn: "考试", inflections: [] };
  let localEntry = entry;
  let extendedCalls = 0;
  let membershipChecks = 0;
  let usageExamples = [{ bookCode: "vocabulary-workbook", id: "workbook:exam" }];
  const dependencies = {
    "next/server": { NextResponse: { json: (body, options) => Response.json(body, options) } },
    "@/lib/supabase/server": {
      createServerSupabaseClient: async () => ({
        rpc: async () => {
          membershipChecks += 1;
          return { data: true, error: null };
        },
      }),
    },
    "@/lib/vocabulary/local-vocabulary": {
      getVocabularyEntry: () => localEntry,
      getExtendedVocabularyEntry: async () => { extendedCalls += 1; return entry; },
      getVocabularyFormationParts: () => [],
    },
    "@/lib/articles/bbc-vocabulary": { getBbcVocabularyDetail: () => null },
    "@/lib/vocabulary/examples": {
      getVocabularyUsageExamples: async () => usageExamples,
      prioritizeVocabularyUsageExamples: (...groups) => groups.flat(),
    },
    "@/lib/vocabulary/phrases": { getVocabularyPhraseMatches: () => [] },
    "@/lib/vocabulary/lookup-etymology": { getVocabularyLookupEtymology: () => null },
    "@/lib/vocabulary/synonym-distinctions": { getVocabularySynonymDistinctions: () => [] },
  };
  const source = readFileSync(new URL("../src/app/api/vocabulary-hint/route.ts", import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  const context = { exports: {}, require: (name) => dependencies[name], URL, setTimeout };
  runInNewContext(outputText, context);
  const lookup = (query) => context.exports.GET(new Request(`http://localhost/api/vocabulary-hint?${query}`));
  assert.deepEqual(await (await lookup("word=exam")).json(), { hint: entry });
  assert.equal(extendedCalls, 0);
  localEntry = null;
  await lookup("word=exam");
  assert.equal(extendedCalls, 1);
  localEntry = entry;
  const detailed = await (await lookup("word=exam&detail=1")).json();
  assert.equal(extendedCalls, 1, "a detailed lookup with a local entry should not wait on dictionary/database enrichment");
  assert.deepEqual(detailed.entry, entry);
  assert.equal(membershipChecks, 0, "workbook and other non-BBC examples should not wait for a BBC membership lookup");

  usageExamples = [{ bookCode: "BBC", id: "bbc:example" }];
  const detailedWithBbc = await (await lookup("word=exam&detail=1")).json();
  assert.equal(membershipChecks, 1);
  assert.deepEqual(detailedWithBbc.usageExamples, usageExamples);
});
