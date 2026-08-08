import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const representativeFiles = [
  "2024-tianjin-tianjin.json",
  "2022-xinjiang-xinjiang.json",
  "2023-guangdong-guangdong.json",
  "2024-guangxi-guangxi.json",
];

function loadPaper(file) {
  return JSON.parse(fs.readFileSync(new URL(`../src/lib/junior-high/${file}`, import.meta.url), "utf8"));
}

test("regional papers expose a canonical part and question-group hierarchy", () => {
  for (const file of representativeFiles) {
    const paper = loadPaper(file);
    assert.ok(Array.isArray(paper.parts), `${file} should expose paper.parts`);
    assert.ok(paper.parts.length > 0, `${file} should contain at least one part`);
    for (const part of paper.parts) {
      assert.ok(part.id && part.title, `${file} part should have an id and title`);
      assert.ok(Array.isArray(part.groups), `${file} part should contain groups`);
      assert.ok(part.groups.length > 0, `${file} part should contain at least one group`);
      for (const group of part.groups) {
        assert.ok(group.id && (group.title || group.marker), `${file} group should have an id and title/marker`);
        assert.ok(Array.isArray(group.questionIds), `${file} group should list question ids`);
      }
    }
  }
});

test("hierarchy groups keep question order and do not promote instructions to questions", () => {
  for (const file of representativeFiles) {
    const paper = loadPaper(file);
    const questionsById = new Map(paper.questions.map((question) => [question.id, question]));
    const groupedIds = paper.parts.flatMap((part) => part.groups.flatMap((group) => group.questionIds));
    assert.equal(new Set(groupedIds).size, groupedIds.length, `${file} should not repeat a question in groups`);
    for (const [index, questionId] of groupedIds.entries()) {
      const question = questionsById.get(questionId);
      assert.ok(question, `${file} group question ${questionId} should exist`);
      assert.equal(question.partId !== undefined, true, `${file} question should identify its part`);
      if (index > 0) {
        const previous = questionsById.get(groupedIds[index - 1]);
        assert.ok(previous, `${file} previous group question should exist`);
        assert.ok(question.id !== previous.id, `${file} should use stable unique ids`);
      }
      assert.doesNotMatch(question.prompt, /本(?:试卷|卷|大题|部分|节)共\s*[一二三四五六七八九十\d]+\s*小题/);
      assert.doesNotMatch(question.prompt, /^第\s*\d+\s*题$/);
    }
  }
});

test("listening audio is assigned to a question group when present", () => {
  const paper = loadPaper("2024-tianjin-tianjin.json");
  assert.ok(paper.assets?.audio?.length, "representative paper should have source audio");
  const audioGroups = paper.parts.flatMap((part) => part.groups).filter((group) => group.audio?.length);
  assert.ok(audioGroups.length > 0, "audio should be attached to a group");
});
