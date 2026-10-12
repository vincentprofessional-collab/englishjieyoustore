import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { normalizeBbcSyntaxSentenceEdits } from "../src/lib/bbc-syntax-annotation-edits.ts";

const canonical = [{
  text: "We learn English.",
  tokens: [
    { text: "We", start: 0, end: 2, pos: "PRON" },
    { text: "learn", start: 3, end: 8, pos: "VERB" },
    { text: "English", start: 9, end: 16, pos: "PROPN" },
    { text: ".", start: 16, end: 17, pos: "PUNCT" },
  ],
  level1: [{ label: "主语", start: 0, end: 1 }, { label: "谓语", start: 1, end: 2 }, { label: "宾语", start: 2, end: 3 }],
  level2: [],
  status: "reviewed",
}];

test("BBC syntax storage follows the same paid access check as the article page", () => {
  const migration = readFileSync(new URL("../supabase/024_bbc_article_syntax_overrides.sql", import.meta.url), "utf8");
  assert.match(migration, /for select to authenticated using \(public\.can_access_project\('bbc'\)\)/);
  assert.doesNotMatch(migration, /for select using \(true\)/);
});

test("BBC editor accepts annotation edits while preserving source text and token offsets", () => {
  const edited = structuredClone(canonical);
  edited[0].tokens[2].pos = "NOUN";
  edited[0].level1[2].label = "直接宾语";
  const result = normalizeBbcSyntaxSentenceEdits(edited, canonical);
  assert.equal(result[0].tokens[2].pos, "NOUN");
  assert.equal(result[0].level1[2].label, "直接宾语");
  assert.equal(result[0].text, canonical[0].text);
  assert.deepEqual(normalizeBbcSyntaxSentenceEdits(canonical.map(({ tokens, ...rest }) => rest), canonical), canonical);
});

test("BBC editor rejects source changes, invalid ranges, overlaps and orphaned nested spans", () => {
  const mutations = [
    (row) => { row.text = "Changed source."; },
    (row) => { row.tokens[0].text = "They"; },
    (row) => { row.tokens[0].start = 1; },
    (row) => { row.tokens[0].pos = "<script>"; },
    (row) => { row.level1[0].start = -1; },
    (row) => { row.level1[0].end = 99; },
    (row) => { row.level1[0].end = 0; },
    (row) => { row.level1[0].end = 2; },
    (row) => { row.level2 = [{ label: "从句", start: 0, end: 2 }]; },
  ];
  for (const mutate of mutations) {
    const edited = structuredClone(canonical);
    mutate(edited[0]);
    assert.equal(normalizeBbcSyntaxSentenceEdits(edited, canonical), null);
  }
  assert.equal(normalizeBbcSyntaxSentenceEdits([], canonical), null);
});

test("BBC 2026 syntax tokens and annotation ranges stay within their source sentences", () => {
  const data = JSON.parse(readFileSync(new URL("../src/data/bbc/2026-syntax.json", import.meta.url), "utf8"));
  assert.equal(Object.keys(data).length, 29);
  for (const [articleId, sentences] of Object.entries(data)) {
    for (const sentence of sentences) {
      for (const token of sentence.tokens) {
        assert.equal(sentence.text.slice(token.start, token.end), token.text, articleId);
      }
      for (const span of [...sentence.level1, ...sentence.level2]) {
        assert.ok(span.start >= 0 && span.end > span.start && span.end <= sentence.tokens.length, articleId);
      }
    }
  }
});
