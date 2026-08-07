import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const paperPath = new URL("../src/lib/junior-high/2024-tianjin-tianjin.json", import.meta.url);

test("generated regional papers expose ordered sections and source blocks", () => {
  const paper = JSON.parse(fs.readFileSync(paperPath, "utf8"));

  assert.ok(Array.isArray(paper.sections), "paper.sections should be an array");
  assert.ok(paper.sections.length > 1, "paper should contain multiple source sections");
  assert.ok(paper.sections.every((section) => section.id && section.title));
  assert.ok(paper.sections.every((section) => Array.isArray(section.blocks)));
  assert.ok(paper.sections.some((section) => section.blocks.length > 0));
});

test("questions carry section, group, display, and input metadata", () => {
  const paper = JSON.parse(fs.readFileSync(paperPath, "utf8"));
  const allowedInputKinds = new Set(["choice", "blank", "text", "writing"]);
  const ids = new Set();

  for (const question of paper.questions) {
    assert.ok(question.id, "question should have a stable id");
    assert.equal(ids.has(question.id), false, `duplicate question id: ${question.id}`);
    ids.add(question.id);
    assert.ok(question.sectionId, `${question.id} should identify its section`);
    assert.ok(question.groupId, `${question.id} should identify its question group`);
    assert.ok(question.displayNumber, `${question.id} should preserve its display number`);
    assert.ok(allowedInputKinds.has(question.inputKind), `${question.id} has invalid input kind`);
  }
});

test("writing tasks use source prompts instead of generic placeholders", () => {
  const paper = JSON.parse(fs.readFileSync(paperPath, "utf8"));

  assert.ok(Array.isArray(paper.writingTasks), "paper.writingTasks should be an array");
  assert.ok(paper.writingTasks.length > 0, "paper should expose at least one writing task");
  for (const task of paper.writingTasks) {
    assert.ok(task.id && task.label, "writing task should have an id and label");
    assert.ok(task.prompt && task.prompt.trim().length > 0, `${task.id} has no prompt`);
    assert.doesNotMatch(task.prompt, /请根据原卷写作部分的另一项要求/);
  }
});
