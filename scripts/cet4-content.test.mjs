import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const library = JSON.parse(await readFile(new URL("../src/data/cet4/library.json", import.meta.url), "utf8"));
const setIndex = JSON.parse(await readFile(new URL("../public/cet4/index.json", import.meta.url), "utf8"));

test("CET-4 library keeps all three requested sections separate", () => {
  const sections = new Set(library.entries.map((entry) => entry.section));
  assert.deepEqual([...sections].sort(), ["知识点", "试卷", "题型"]);
  for (const section of sections) assert.ok(library.entries.filter((entry) => entry.section === section).length > 0);
});

test("CET-4 routes and IDs are unique", () => {
  const ids = library.entries.map((entry) => entry.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.every((id) => /^(knowledge|practice|paper|mock|cet4)-/.test(id)));
});

test("misfiled CET-6 source is not published in CET-4", () => {
  const serialized = JSON.stringify(library.entries.map(({ title, sourceFiles }) => ({ title, sourceFiles })));
  assert.doesNotMatch(serialized, /六级真题/);
});

test("published entries contain source text and traceability", () => {
  for (const entry of library.entries) {
    assert.ok(entry.body.length >= 80, entry.id);
    assert.ok(entry.sourceFiles.length >= 1, entry.id);
    assert.match(entry.sourceHash, /^[a-f0-9]{64}$/);
  }
});

test("CET-4 sets use the high-school question-group contract", async () => {
  assert.ok(setIndex.entries.length > 0);
  for (const summary of setIndex.entries) {
    const set = JSON.parse(await readFile(new URL(`../public/cet4/${summary.kind === "paper" ? "papers" : "practice"}/${summary.id}.json`, import.meta.url), "utf8"));
    assert.equal(set.schemaVersion, 2, summary.id);
    assert.ok(set.sections.length > 0, summary.id);
    assert.equal(set.sections.reduce((total, section) => total + section.groups.reduce((count, group) => count + group.questions.length, 0), 0), summary.questionCount, summary.id);
    assert.ok(set.sections.every((section) => section.groups.every((group) => group.questions.every((question) => question.promptBlocks && question.options && question.answerSpec))), summary.id);
    if (summary.kind === "paper") assert.equal(set.submissionMode, "whole-paper", summary.id);
  }
});
