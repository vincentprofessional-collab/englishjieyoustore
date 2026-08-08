import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const dataDir = new URL("../src/lib/junior-high/", import.meta.url);

function readPaper(fileName) {
  return JSON.parse(fs.readFileSync(new URL(fileName, dataDir), "utf8"));
}

function sectionNumbers(paper, titlePattern) {
  const section = paper.sections.find((item) => titlePattern.test(item.title));
  assert.ok(section, `missing section matching ${titlePattern}`);
  return new Set(paper.questions.filter((question) => question.sectionId === section.id).map((question) => question.number));
}

test("inline dialogue, cloze, and table placeholders become interactive questions", () => {
  const tianjin = readPaper("2024-tianjin-tianjin.json");
  const fujian = readPaper("2024-fujian-fujian.json");
  const guangdong2023 = readPaper("2023-guangdong-guangdong.json");
  const guangdong2022 = readPaper("2022-guangdong-guangdong.json");
  const yunnan = readPaper("2022-yunnan-kunming-yunnan-kunming.json");

  for (const number of [61, 62, 63, 64, 65]) assert.ok(sectionNumbers(tianjin, /补全对话/).has(number), `Tianjin dialogue question ${number} is not interactive`);
  for (const number of [76, 77, 78, 79, 80, 81, 82, 83, 84, 85]) assert.ok(tianjin.questions.some((question) => question.number === number), `Tianjin cloze question ${number} is not interactive`);
  for (const number of [66, 67, 68, 69, 70]) assert.ok(fujian.questions.some((question) => question.number === number), `Fujian matching question ${number} is not interactive`);
  for (const number of [81, 82, 83, 84, 85, 86, 87, 88, 89, 90]) assert.ok(fujian.questions.some((question) => question.number === number), `Fujian cloze question ${number} is not interactive`);
  for (const number of [71, 72, 73, 74, 75, 76, 77, 78, 79, 80]) assert.ok(fujian.questions.some((question) => question.number === number), `Fujian writing-task question ${number} is not interactive`);
  for (const number of [36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50]) assert.ok(guangdong2023.questions.some((question) => question.number === number), `Guangdong 2023 question ${number} is not interactive`);
  for (const number of [21, 22, 23, 24, 25, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75]) assert.ok(guangdong2022.questions.some((question) => question.number === number), `Guangdong 2022 question ${number} is not interactive`);
  for (const number of [66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80]) assert.ok(yunnan.questions.some((question) => question.number === number), `Yunnan question ${number} is not interactive`);
});

test("structured papers expose sanitized display blocks", () => {
  const paper = readPaper("2024-tianjin-tianjin.json");
  assert.ok(paper.sections.every((section) => Array.isArray(section.displayBlocks)), "every section should expose displayBlocks");

  const questionSourceIds = new Set(paper.questions.flatMap((question) => question.sourceBlockIds ?? []));
  for (const section of paper.sections) {
    for (const block of section.displayBlocks) {
      assert.equal(block.kind === "paragraph" && questionSourceIds.has(block.id), false, `question source paragraph leaked: ${block.id}`);
    }
  }
  assert.ok(paper.sections.some((section) => section.displayBlocks.some((block) => block.kind === "image")), "images should remain available");
});

test("reading display blocks preserve passages between question groups", () => {
  const paper = readPaper("2024-tianjin-tianjin.json");
  const section = paper.sections.find((item) => item.title.includes("阅读理解"));
  assert.ok(section);
  const paragraphs = section.displayBlocks.filter((block) => block.kind === "paragraph").map((block) => block.text);
  assert.ok(paragraphs.some((text) => text.includes("high school graduation ceremony")), "the second reading passage should remain visible");
  assert.equal(paragraphs.some((text) => /^51[．.]/.test(text)), false, "question text should stay in the interactive question column");
  assert.equal(paragraphs.some((text) => /^A[．.].*B[．.]/.test(text)), false, "answer options should stay out of the passage column");
});
