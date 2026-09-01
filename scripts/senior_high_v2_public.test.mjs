import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { validateSeniorHighV2Set } from "./senior_high_v2_schema.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const PUBLIC_ROOT = path.join(ROOT, "public", "senior-high");
const index = JSON.parse(fs.readFileSync(path.join(PUBLIC_ROOT, "index.json"), "utf8"));

function payload(entry) {
  const group = entry.kind === "paper" ? "papers" : "practice";
  return JSON.parse(fs.readFileSync(path.join(PUBLIC_ROOT, group, `${entry.id}.json`), "utf8"));
}

test("public index is metadata-only and every linked v2 set passes the public quality gate", () => {
  assert.equal(index.schemaVersion, 2);
  assert.equal(index.entries.length, 12);
  assert.ok(fs.statSync(path.join(PUBLIC_ROOT, "index.json")).size < 50_000);
  assert.equal(new Set(index.entries.map((entry) => entry.id)).size, index.entries.length);
  for (const entry of index.entries) {
    assert.equal("sections" in entry, false);
    const set = payload(entry);
    const result = validateSeniorHighV2Set(set, { publicData: true });
    assert.equal(result.ok, true, `${entry.id}: ${result.errors.join("\n")}`);
    assert.equal(result.questionCount, entry.questionCount);
    assert.ok(set.sections.flatMap((section) => section.groups.flatMap((group) => group.questions)).every((question) => question.reviewStatus === "approved"));
  }
});

test("public assets never expose local source URLs and every local asset exists", () => {
  for (const entry of index.entries) {
    for (const asset of payload(entry).assetRefs) {
      assert.equal(asset.url.startsWith("source://"), false, `${entry.id}: ${asset.assetId}`);
      assert.equal(asset.url.endsWith(".wmf"), false, `${entry.id}: unsupported browser image ${asset.assetId}`);
      if (asset.url.startsWith("/")) {
        const assetPath = path.join(ROOT, "public", asset.url);
        assert.equal(fs.existsSync(assetPath), true, asset.url);
        assert.ok(fs.statSync(assetPath).size > 0, `${entry.id}: empty public asset ${asset.assetId}`);
      }
    }
  }
});

test("knowledge payload is isolated from paper and practice data", () => {
  const knowledge = JSON.parse(fs.readFileSync(path.join(PUBLIC_ROOT, "knowledge.json"), "utf8"));
  assert.equal(Array.isArray(knowledge.knowledge), true);
  assert.equal(knowledge.knowledge.length, 349);
  assert.equal("practice" in knowledge, false);
  assert.equal("papers" in knowledge, false);
});

test("published practice numbering is continuous and answer coverage remains measurable", () => {
  let questionCount = 0;
  let answeredCount = 0;
  for (const entry of index.entries) {
    const set = payload(entry);
    const questions = set.sections.flatMap((section) => section.groups.flatMap((group) => group.questions)).filter((question) => question.type !== "instruction_only");
    questionCount += questions.length;
    answeredCount += questions.filter((question) => question.answerSpec.availability === "answered").length;
    assert.deepEqual(questions.map((question) => question.displayNumber), questions.map((_, index) => index + 1));
  }
  assert.equal(questionCount, 867);
  assert.equal(answeredCount, 775);
});

test("grammar blanks do not consume passage numbers, years, percentages or other ordinary numerals", () => {
  const entry = index.entries.find((item) => item.id === "practice-5-3-grammar-fill");
  assert.ok(entry);
  const set = payload(entry);
  const groups = set.sections[0].groups;
  assert.deepEqual(groups[0].questions.map((question) => question.sourceQuestionNumber), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.match(groups[1].title, /Passage 2/);
  assert.doesNotMatch(JSON.stringify(groups[1].stimulusBlocks[0]), /Passage 2/);
  const allText = JSON.stringify(set.sections.flatMap((section) => section.groups.flatMap((group) => group.stimulusBlocks)));
  assert.match(allText, /30 years/);
  assert.match(allText, /90 percent/);
});

test("paper questions never use numbered directions or synthetic option placeholders", () => {
  for (const entry of index.entries.filter((item) => item.kind === "paper")) {
    const set = payload(entry);
    const questions = set.sections.flatMap((section) => section.groups.flatMap((group) => group.questions));
    for (const question of questions.filter((item) => item.type === "single_choice")) {
      assert.doesNotMatch(JSON.stringify(question.promptBlocks), /答题前|答卷前/);
      assert.doesNotMatch(JSON.stringify(question.options), /Source option unavailable/);
    }
  }
  const nationalOne = payload(index.entries.find((item) => item.id === "paper-2025-new-gaokao-i"));
  const firstQuestion = nationalOne.sections[0].groups[0].questions[0];
  assert.equal(firstQuestion.sourceQuestionNumber, 1);
  assert.match(JSON.stringify(firstQuestion.promptBlocks), /What will the man do next/);
  const nationalTwo = payload(index.entries.find((item) => item.id === "paper-2025-new-gaokao-ii"));
  assert.deepEqual(nationalTwo.sections[0].groups[0].questions[1].options.map((option) => option.label), ["A", "B", "C"]);
  assert.deepEqual(nationalTwo.sections.find((section) => section.id === "section-language").groups.flatMap((group) => group.questions.map((question) => question.sourceQuestionNumber)), Array.from({ length: 25 }, (_, index) => index + 21));
  const reading = nationalOne.sections.find((section) => section.id === "section-reading");
  assert.deepEqual(reading.groups.slice(0, 4).map((group) => group.title), ["A", "B", "C", "D"]);
  assert.deepEqual(reading.groups.slice(0, 4).map((group) => group.questions.map((question) => question.sourceQuestionNumber)), [[21, 22, 23], [24, 25, 26, 27], [28, 29, 30, 31], [32, 33, 34, 35]]);
  assert.ok(reading.groups.slice(0, 4).every((group) => group.stimulusBlocks.length > 0));
});
