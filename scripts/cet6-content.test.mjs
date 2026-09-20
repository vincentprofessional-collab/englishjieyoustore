import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const library = JSON.parse(await readFile(new URL("../src/data/cet6/library.json", import.meta.url), "utf8"));
const setIndex = JSON.parse(await readFile(new URL("../public/cet6/index.json", import.meta.url), "utf8"));

test("CET-6 library keeps its content isolated in the three requested sections", () => {
  const sections = new Set(library.entries.map((entry) => entry.section));
  assert.deepEqual([...sections].sort(), ["知识点", "试卷", "题型"]);
  assert.ok(library.entries.every((entry) => entry.title.includes("六级") || entry.section === "知识点"));
});

test("CET-6 routes, source text, and hashes are valid", () => {
  const ids = library.entries.map((entry) => entry.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const entry of library.entries) {
    assert.ok(entry.body.length >= 80, entry.id);
    assert.ok(entry.sourceFiles.length >= 1, entry.id);
    assert.match(entry.sourceHash, /^[a-f0-9]{64}$/, entry.id);
    assert.doesNotMatch(`${entry.body}\n${entry.answers}`, /HYPERLINK|INCLUDEPICTURE/);
  }
});

test("CET-6 papers use the high-school question-group contract", async () => {
  assert.ok(setIndex.entries.length > 0);
  for (const summary of setIndex.entries) {
    const directory = summary.kind === "paper" ? "papers" : "practice";
    const set = JSON.parse(await readFile(new URL(`../public/cet6/${directory}/${summary.id}.json`, import.meta.url), "utf8"));
    assert.equal(set.schemaVersion, 2, summary.id);
    if (summary.kind === "paper") assert.equal(set.submissionMode, "whole-paper", summary.id);
    assert.ok(set.sections.length > 0, summary.id);
    assert.equal(set.sections.reduce((total, section) => total + section.groups.reduce((count, group) => count + group.questions.length, 0), 0), summary.questionCount, summary.id);
  }
});
