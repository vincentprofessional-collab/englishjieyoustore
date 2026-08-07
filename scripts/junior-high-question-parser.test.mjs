import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const inventory = JSON.parse(fs.readFileSync(path.join(root, "src/lib/junior-high/paper-inventory.json"), "utf8"));
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "junior-high-parser-"));

function buildPaper(year, region) {
  const item = inventory.find((entry) => entry.year === year && entry.region === region);
  assert.ok(item, `fixture paper ${year}/${region} should exist`);
  const slug = `parser-${year}-${region}`;
  const output = path.join(tempRoot, `${slug}.json`);
  execFileSync("python3", [
    path.join(root, "scripts/extract-junior-high-paper.py"),
    "--original", item.originalPath,
    "--analysis", item.analysisPath,
    "--slug", slug,
    "--year", String(year),
    "--region", region,
    "--output", output,
    "--assets", path.join(tempRoot, slug),
  ], { cwd: root, stdio: "pipe" });
  return JSON.parse(fs.readFileSync(output, "utf8"));
}

test("instruction paragraphs do not become Tianjin questions", () => {
  const paper = buildPaper(2024, "天津");
  assert.equal(paper.questions.some((question) => question.prompt.includes("本卷共五大题")), false);
  assert.ok(paper.questions.every((question) => question.sectionId && question.groupId));
  assert.ok(paper.questions.every((question) => question.id.includes(question.sectionId)));
});

test("regional numbering remains unique when a paper restarts display numbers", () => {
  const paper = buildPaper(2023, "广东");
  const ids = new Set(paper.questions.map((question) => question.id));
  assert.equal(ids.size, paper.questions.length);
  assert.ok(paper.questions.some((question) => question.displayNumber === "1"));
  assert.ok(paper.questions.some((question) => question.displayNumber === "31"));
});

test("word-fill answers are retained as words rather than forced into A-D", () => {
  const paper = buildPaper(2024, "安徽");
  const answers = new Set(paper.questions.map((question) => question.answer));
  assert.ok(answers.has("meeting"), "安徽题16 answer should be retained");
  assert.ok(answers.has("talk with"), "安徽题17 answer should preserve phrases");
  assert.ok(paper.questions.some((question) => question.inputKind === "blank"));
});

test("Shanghai true-false and multi-blank answers keep their source values", () => {
  const paper = buildPaper(2022, "上海");
  const trueFalse = paper.questions.find((question) => question.prompt.includes("There was going to be a party"));
  assert.equal(trueFalse?.answer, "T");
  const multiBlank = paper.questions.find((question) => question.prompt.includes("school project is to create"));
  assert.equal(multiBlank?.answer, "a building");
});

test("analysis text stops before the next question marker", () => {
  const paper = buildPaper(2023, "广东");
  const question = paper.questions.find((entry) => entry.displayNumber === "1");
  assert.ok(question);
  assert.doesNotMatch(question.analysis, /【\s*2题详解】/);
  assert.doesNotMatch(question.analysis, /What’s the time now/);
});
