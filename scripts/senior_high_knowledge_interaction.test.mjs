import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const knowledgeSource = await readFile(new URL("src/components/senior-high/senior-high-knowledge.tsx", root), "utf8");
const runnerSource = await readFile(new URL("src/components/senior-high/senior-high-runner.tsx", root), "utf8");
const navigationSource = await readFile(new URL("src/lib/senior-high/inline-navigation.ts", root), "utf8");
const knowledge = JSON.parse(await readFile(new URL("public/senior-high/knowledge.json", root), "utf8")).knowledge;
const prefixPattern = /^\s*\d+\s*[.．、]\s*(?:[（(]([^）)]+)[）)]\s*)?/u;

test("knowledge cards can replace the generic category with verified source labels", () => {
  const labelled = knowledge.filter((item) => item.stem.match(prefixPattern)?.[1]);
  assert.equal(knowledge.length, 349);
  assert.equal(labelled.length, 327);
  assert.ok(labelled.some((item) => item.stem.includes("(2020·全国卷Ⅱ)")));
  assert.doesNotMatch(knowledgeSource, /seniorHighCategoryLabel/);
  assert.match(knowledgeSource, /presentation\.sourceLabel/);
});

test("knowledge stems hide source numbering while preserving the exercise text", () => {
  const source = knowledge.find((item) => item.stem.includes("Chinese New Year is a"));
  assert.ok(source);
  const match = source.stem.match(prefixPattern);
  assert.equal(match?.[1], "2020·全国卷Ⅱ");
  assert.equal(source.stem.slice(match[0].length).trimStart(), "Chinese New Year is a ________ (celebrate) marking the end of the winter season and the beginning of spring.");
});

test("inline answers suppress autofill and Enter focuses the next visible blank", () => {
  for (const source of [knowledgeSource, runnerSource]) {
    assert.match(source, /data-senior-high-inline-answer="true"/);
    assert.match(source, /data-1p-ignore="true"/);
    assert.match(source, /data-lpignore="true"/);
    assert.match(source, /event\.key !== "Enter"/);
    assert.match(source, /focusNextSeniorHighInlineAnswer/);
  }
  assert.match(navigationSource, /next\.focus\(\)/);
  assert.match(navigationSource, /next\.select\(\)/);
});

test("submitting shows analysis immediately without source paths or toggle controls", () => {
  assert.doesNotMatch(knowledgeSource, /查看解析|收起解析|item\.source_relpath/);
  assert.doesNotMatch(runnerSource, /查看解析|收起解析|expanded|onToggle/);
  assert.match(knowledgeSource, /item\.analysis \? <div className="senior-high-analysis"/);
  assert.match(runnerSource, /question\.explanationBlocks\.length > 0 \? <div className="senior-high-analysis"/);
});

test("article groups use isolated submission and do not render green ellipsis placeholders", () => {
  assert.doesNotMatch(runnerSource, /answers\[question\.id\] \|\| "…"/);
  assert.match(runnerSource, /submittedGroups/);
  assert.match(runnerSource, /with-stimulus-questions/);
  assert.match(runnerSource, /提交本篇/);
  assert.match(runnerSource, /groupSubmitted && inlineQuestions\.length > 0/);
});
