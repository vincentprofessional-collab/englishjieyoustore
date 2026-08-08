import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const representativeFiles = [
  "2022-xinjiang-xinjiang.json",
  "2023-guangdong-guangdong.json",
  "2024-tianjin-tianjin.json",
];

function loadPaper(file) {
  return JSON.parse(fs.readFileSync(new URL(`../src/lib/junior-high/${file}`, import.meta.url), "utf8"));
}

test("structured papers keep passage paragraphs and exclude blank image blocks", () => {
  for (const file of representativeFiles) {
    const paper = loadPaper(file);
    const imageBlocks = (paper.sourceBlocks ?? []).filter((block) => block.kind === "image");
    assert.ok(imageBlocks.every((block) => block.src), `${file} image blocks should point to a real asset`);
    const passageParagraphs = (paper.sourceBlocks ?? []).filter(
      (block) => block.kind === "paragraph" && (block.text ?? "").length > 120,
    );
    assert.ok(passageParagraphs.length > 0, `${file} should retain source passage text`);
  }
});

test("passage display blocks are separated from answer options", () => {
  const paper = loadPaper("2024-tianjin-tianjin.json");
  const cloze = paper.sections.find((section) => section.title.startsWith("三、完形填空"));
  assert.ok(cloze, "cloze section should exist");
  const displayText = (cloze.displayBlocks ?? []).map((block) => block.text ?? "").join("\n");
  assert.match(displayText, /It.s easy to make promises/);
  assert.doesNotMatch(displayText, /36[．.]\s*A[．.]/);
});

test("cloze questions keep their sentence blank while options remain separate", () => {
  const paper = loadPaper("2024-tianjin-tianjin.json");
  const question = paper.questions.find((item) => item.number === 36);
  assert.ok(question, "cloze question 36 should exist");
  assert.match(question.prompt, /_{2,}/);
  assert.deepEqual(question.options.slice(0, 2), ["A. want", "B. fail"]);
  assert.doesNotMatch(question.prompt, /请根据原卷内容作答/);
});
