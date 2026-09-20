import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const library = JSON.parse(await readFile(new URL("../src/data/cet4/library.json", import.meta.url), "utf8"));
const setIndex = JSON.parse(await readFile(new URL("../public/cet4/index.json", import.meta.url), "utf8"));

test("CET-4 library contains only the requested 2020-2026 true-paper section", () => {
  const sections = new Set(library.entries.map((entry) => entry.section));
  assert.deepEqual([...sections], ["试卷"]);
  assert.equal(library.entries.length, 46);
  assert.ok(library.entries.every((entry) => /^cet4-paper-20(?:20|21|22|23|24|25|26)/.test(entry.id)));
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

test("CET-4 true-paper question surfaces keep answer explanations out", async () => {
  assert.equal(setIndex.entries.filter((entry) => entry.kind === "practice").length, 0);
  assert.equal(setIndex.entries.filter((entry) => entry.kind === "paper").length, 46);
  for (const summary of setIndex.entries) {
    const set = JSON.parse(await readFile(new URL(`../public/cet4/papers/${summary.id}.json`, import.meta.url), "utf8"));
    for (const section of set.sections) for (const group of section.groups) {
      const questionSurface = JSON.stringify({ stimulusBlocks: group.stimulusBlocks, questions: group.questions.map((question) => ({ promptBlocks: question.promptBlocks, options: question.options })) });
      assert.doesNotMatch(questionSurface, /该空需|答案解析|答案详解|语法判断|词义判断/);
    }
  }
});
