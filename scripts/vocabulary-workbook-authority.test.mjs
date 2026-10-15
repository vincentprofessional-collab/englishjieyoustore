import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

function load(filename, imports) {
  const exports = {};
  const { outputText } = ts.transpileModule(readFileSync(new URL(filename, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  });
  vm.runInNewContext(outputText, {
    exports, process: { env: {}, cwd: () => "/fixture" }, URL,
    require(name) {
      if (!(name in imports)) throw new Error(`Unexpected import: ${name}`);
      return imports[name];
    },
  });
  return exports;
}

test("lookup pages use their own search box while other study pages retain global search", () => {
  let pathname = "/vocabulary";
  const { GlobalVocabularySearch } = load("../src/components/global-vocabulary-search.tsx", {
    "react/jsx-runtime": { jsx: (type, props) => ({ type, props }) },
    "next/navigation": { usePathname: () => pathname },
    "@/components/vocabulary-search-autocomplete": { VocabularySearchAutocomplete: "Search" },
  });
  for (const value of ["/vocabulary", "/vocabulary/bigger", "/vocabulary/fable"]) {
    pathname = value;
    assert.equal(GlobalVocabularySearch(), null);
  }
  for (const value of ["/vocabulary/books", "/vocabulary/pk", "/vocabulary/etymology", "/vocabulary/roots/big", "/articles/260810"]) {
    pathname = value;
    assert.equal(GlobalVocabularySearch().type, "section");
  }
});

test("lookup, learning and search use Excel meanings, with explicit corrections, without legacy or database meanings", async () => {
  const legacy = [
    { word: "bigger", level: "小学", def: "adv. 大大\nn. 大亨", root: "big", form: "big + er" },
    { word: "legacy-only", level: "小学", def: "n. 外部词库释义" },
  ];
  const workbook = {
    bigger: { definitionCn: "adj. 更大的（big的比较级）", englishDefinitions: ["large or great in size"], level: "小学", phonetic: "[bɪgə]" },
    "cn-only": { definitionCn: "n. 表内中文", englishDefinitions: [], level: "小学", phonetic: "" },
  };
  let databaseCalls = 0;
  const databaseRows = [
    { word: "bigger", definition_cn: "错误数据库释义", definition_en: "wrong database meaning" },
    { word: "remote-only", definition_cn: "另一条外部释义", definition_en: "external meaning" },
  ];
  const supabase = { from() {
    databaseCalls += 1;
    let rows = databaseRows;
    return {
      select() { return this; }, limit() { return this; }, ilike() { return this; },
      in(_column, values) { rows = rows.filter(row => values.includes(row.word)); return this; },
      then(resolve) { resolve({ data: rows, error: null }); },
    };
  } };
  const lib = load("../src/lib/vocabulary/local-vocabulary.ts", {
    "node:fs": {
      existsSync: filename => /(?:flat|primary-school)-vocabulary\.json$/.test(filename),
      readFileSync: filename => JSON.stringify(filename.endsWith("flat-vocabulary.json") ? legacy : []),
    },
    "node:path": path,
    "@/lib/supabase/client": { supabase },
    "@/data/vocabulary/excel-leftmost-root-affix.json": { words: {}, labels: {} },
    "@/data/vocabulary/excel-root-affix-catalog.json": {},
    "@/data/vocabulary/workbook-vocabulary-details.json": workbook,
    "@/data/vocabulary/definition-corrections.json": { bigger: { definitionCn: "adj. 更大（big 的比较级）", englishDefinitions: ["comparative of big"] } },
    "@/lib/vocabulary/autocomplete-ranking": { sortVocabularyFamilyItems: items => items },
    "@/lib/audio-pronunciation": { shouldShowAudioPronunciation: () => true },
    "./adjective-base-forms": { getAdjectiveBaseFormCandidates: () => [] },
  });
  for (const entry of [lib.getVocabularyEntry("bigger"), lib.getVocabularyHint("bigger"), await lib.getExtendedVocabularyEntry("bigger"), lib.getAllVocabularyEntries().find(row => row.word === "bigger")]) {
    assert.equal(entry.definitionCn, "adj. 更大（big 的比较级）");
    assert.equal(entry.partOfSpeech, "adj.");
    assert.deepEqual(Array.from(entry.englishDefinitions), ["comparative of big"]);
  }
  assert.equal(lib.getVocabularyEntry("bigger").root, "big", "non-definition metadata remains available");
  assert.equal(lib.getVocabularyEntry("cn-only").definitionCn, "n. 表内中文");
  assert.equal((await lib.getExtendedVocabularyEntry("cn-only")).englishDefinitions.length, 0);
  assert.equal((await lib.getExtendedVocabularyEntry("legacy-only")).definitionCn, "");
  assert.equal(databaseCalls, 0, "known entries with missing Excel fields must not request a replacement meaning");
  const autocomplete = lib.getVocabularyAutocompleteItems().find(row => row.word === "bigger");
  assert.equal(autocomplete.definition, "adj. 更大（big 的比较级）");
  const dbSuggestions = await lib.getDatabaseVocabularyAutocompleteItems({ isChineseQuery: false, query: "bigger", limit: 40 });
  assert.equal(dbSuggestions.find(row => row.word === "bigger").definition, "adj. 更大（big 的比较级）");
  assert.equal((await lib.getDatabaseVocabularyAutocompleteItems({ isChineseQuery: true, query: "错误数据库", limit: 40 })).length, 0);
  assert.equal((await lib.getExtendedVocabularyEntry("remote-only")).definitionCn, "");
});

test("audited inflected words stay corrected in every bundled source without changing vocabulary levels", () => {
  const data = name => JSON.parse(readFileSync(new URL(`../src/data/vocabulary/${name}.json`, import.meta.url), "utf8"));
  const workbook = data("workbook-vocabulary-details"), corrections = data("definition-corrections");
  const primary = data("primary-school-vocabulary"), flat = data("flat-vocabulary");
  const comparatives = ["bigger", "heavier", "longer", "shorter", "smaller", "stronger", "taller", "younger"];
  for (const word of comparatives) {
    assert.match(workbook[word].definitionCn, /(?:更|较)/u, word);
    assert.equal(primary.find(row => row.word === word).def, workbook[word].definitionCn, word);
    assert.ok(workbook[word].englishDefinitions.every(value => value.includes("comparative of")), word);
  }
  for (const word of ["gulled", "resumed", "underestimated", "patronymics"]) {
    const expectedPart = word === "patronymics" ? /^n\./ : /^(?:vt|v)\./;
    assert.match(workbook[word].definitionCn, expectedPart, word);
    assert.doesNotMatch(workbook[word].definitionCn, word === "patronymics" ? /adj\./ : /(?:^|\n)n\./, word);
    assert.equal(primary.some(row => row.word === word), false, `${word} must not be added to primary vocabulary`);
    for (const row of flat.filter(row => row.word === word)) {
      assert.equal(row.def, workbook[word].definitionCn, word);
      assert.equal(row.pron, workbook[word].phonetic, word);
      assert.ok(["GRE", "SAT"].includes(row.level), word);
    }
    assert.equal(workbook[word].phonetic, corrections[word].phonetic, word);
  }
  assert.doesNotMatch(workbook.gulled.englishDefinitions.join(" "), /\b(?:bird|aquatic|web-footed)\b/i);
  assert.match(workbook.gulled.englishDefinitions[0], /deceived|tricked/);
});

test("cloud-only vocabulary videos show on desktop and tablet and do not load on phones", async () => {
  const preferences = load("../src/lib/vocabulary/lookup-display-preferences.ts", {});
  let userAgent = "desktop";
  let videoLoads = 0;
  const marker = name => name;
  const jsx = (type, props) => ({ type, props });
  const entry = { word: "baby", normalizedWord: "baby", inflections: [] };
  const imports = {
    "react/jsx-runtime": { jsx, jsxs: jsx },
    "next/navigation": { notFound() { throw new Error("not found"); } },
    "next/headers": { headers: async () => ({ get: () => userAgent }), cookies: async () => ({ get: () => undefined }) },
    "@/lib/vocabulary/local-vocabulary": { getExtendedVocabularyEntry: async () => entry, getVocabularyFormationParts: () => [] },
    "@/lib/vocabulary/examples": { getVocabularyUsageExamples: async () => [], prioritizeVocabularyUsageExamples: () => [] },
    "@/lib/vocabulary/phrases": { getVocabularyPhraseMatches: () => [] },
    "@/lib/vocabulary/lookup-etymology": { getVocabularyLookupEtymology: () => null },
    "@/lib/vocabulary/synonym-distinctions": { getVocabularySynonymDistinctions: () => [] },
    "@/lib/vocabulary/lookup-display-preferences": preferences,
    "@/lib/articles/bbc-vocabulary": { getBbcVocabularyDetail: () => null },
    "@/lib/vocabulary/videos": { getVocabularyVideoCandidates: () => [], getVocabularyVideos: async () => { videoLoads += 1; return { videos: [{ path: "cloud-only.mp4" }], totalVideos: 1 }; } },
    "@/lib/supabase/server": {},
  };
  for (const [file, name] of [["vocabulary-autoplay", "VocabularyAutoplay"], ["vocabulary-detail-shell", "VocabularyDetailShell"], ["vocabulary-detail-content", "VocabularyDetailContent"], ["vocabulary-lookup-display-section", "VocabularyLookupDisplaySection"], ["vocabulary-video-player", "VocabularyVideoPlayer"]]) imports[`@/components/${file}`] = { [name]: marker(name) };
  const { VocabularyLookupEntry } = load("../src/components/vocabulary-lookup-entry.tsx", imports);
  const content = tree => tree.props.children[1].props.children;
  for (const device of ["Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1", "Mozilla/5.0 (Linux; Android 14; SM-T970) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36"]) {
    userAgent = device;
    const video = content(await VocabularyLookupEntry({ word: "baby" })).props.inlineVideo;
    assert.equal(video.type, "VocabularyLookupDisplaySection");
    assert.equal(video.props.children.props.videos[0].path, "cloud-only.mp4");
  }
  for (const phone of ["Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile/15E148", "Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/130 Mobile Safari/537.36"]) {
    userAgent = phone;
    assert.equal(content(await VocabularyLookupEntry({ word: "baby" })).props.inlineVideo, null);
  }
  assert.equal(videoLoads, 4);
});
