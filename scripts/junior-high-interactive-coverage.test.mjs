import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const dataDir = new URL("../src/lib/junior-high/", import.meta.url);
const inventory = JSON.parse(fs.readFileSync(new URL("../src/lib/junior-high/paper-inventory.json", import.meta.url), "utf8"));

function readPaper(item) {
  return JSON.parse(fs.readFileSync(path.resolve(item.dataPath), "utf8"));
}

test("every regional paper has complete interactive question and display metadata", () => {
  const allowedInputKinds = new Set(["choice", "blank", "text", "writing"]);

  for (const item of inventory) {
    const paper = readPaper(item);
    assert.equal(paper.layout, "structured", `${item.year}-${item.region} must use structured layout`);
    assert.ok(paper.questions.length > 0, `${item.year}-${item.region} has no interactive questions`);
    assert.ok(paper.writingTasks?.length > 0, `${item.year}-${item.region} has no interactive writing task`);

    const questionIds = new Set();
    const questionSourceIds = new Set(paper.questions.flatMap((question) => question.sourceBlockIds ?? []));
    for (const question of paper.questions) {
      assert.equal(questionIds.has(question.id), false, `duplicate question id: ${question.id}`);
      questionIds.add(question.id);
      assert.ok(question.prompt?.trim(), `${question.id} has no prompt`);
      assert.ok(allowedInputKinds.has(question.inputKind), `${question.id} has invalid input kind`);
      assert.ok(Array.isArray(question.sourceBlockIds) && question.sourceBlockIds.length > 0, `${question.id} has no source block`);
      assert.ok(Object.hasOwn(question, "answer"), `${question.id} has no answer slot`);
      assert.ok(Object.hasOwn(question, "analysis"), `${question.id} has no analysis slot`);
    }

    for (const section of paper.sections) {
      assert.ok(Array.isArray(section.displayBlocks), `${item.year}-${item.region}/${section.id} has no displayBlocks`);
      const sectionQuestions = paper.questions.filter((question) => question.sectionId === section.id);
      const sourceMedia = section.blocks.filter((block) => block.kind !== "paragraph").length;
      const displayMedia = section.displayBlocks.filter((block) => block.kind !== "paragraph").length;
      assert.ok(displayMedia >= sourceMedia, `${item.year}-${item.region}/${section.id} lost image/table/audio content`);
      if (!sectionQuestions.length) {
        assert.equal(section.displayBlocks.some((block) => block.kind === "paragraph"), false, `${item.year}-${item.region}/${section.id} still exposes non-interactive Word paragraphs`);
      }
      assert.equal(
        section.displayBlocks.some((block) => block.kind === "paragraph" && questionSourceIds.has(block.id)),
        false,
        `${item.year}-${item.region}/${section.id} exposes a question-source paragraph`,
      );
    }
  }
});
