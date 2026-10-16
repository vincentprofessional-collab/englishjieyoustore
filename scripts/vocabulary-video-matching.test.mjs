import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

test("curated video vocabulary assignments prevent filename typos matching another word", () => {
  const catalog = JSON.parse(fs.readFileSync(new URL("../src/data/vocabulary/video-catalog.json", import.meta.url), "utf8"));
  const filename = "Send in the next apple can 请下一个应聘者进来.mp4";
  const item = catalog.find((candidate) => candidate.name === filename);
  assert.deepEqual(item?.vocabularyWords, ["applicant"]);

  const module = { exports: {} };
  const dependencies = {
    "server-only": {},
    "next/cache": { unstable_cache: (fn) => fn },
    "@supabase/supabase-js": { createClient: () => null },
    "@/data/vocabulary/video-catalog.json": catalog,
    "@/lib/media/url": { getVocabularyVideoMediaUrl: (name) => name, toSupabaseSafeStoragePath: (name) => name },
    "@/lib/supabase/server": { createServerSupabaseClient: () => null },
    "@/lib/vocabulary/local-vocabulary": { getAllVocabularyEntries: () => [] },
  };
  const source = fs.readFileSync(new URL("../src/lib/vocabulary/videos.ts", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  vm.runInNewContext(compiled, {
    exports: module.exports,
    module,
    process: { env: {} },
    require: (name) => {
      assert.ok(name in dependencies, `unexpected dependency: ${name}`);
      return dependencies[name];
    },
  });

  const getCandidates = module.exports.getVocabularyVideoCandidates;
  const applicantVideos = getCandidates({ normalizedWord: "applicant", inflections: [] }).map((video) => video.path);
  const appleVideos = getCandidates({ normalizedWord: "apple", inflections: [] }).map((video) => video.path);
  assert.ok(applicantVideos.includes(filename));
  assert.ok(!appleVideos.includes(filename));
});
