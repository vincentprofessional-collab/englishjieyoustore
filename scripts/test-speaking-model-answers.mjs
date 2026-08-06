import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../src/data/ielts/speaking-model-answers.ts", import.meta.url), "utf8");
const questions = JSON.parse(
  readFileSync(new URL("../src/data/ielts/speaking-questions.json", import.meta.url), "utf8"),
);

const requiredQuestionIds = [
  ...questions["part-1"].map((question) => question.id),
  ...questions["part-3"].map((question) => question.id),
];

function extractAnswerObject(questionId) {
  const marker = `questionId: "${questionId}"`;
  const markerIndex = source.indexOf(marker);

  if (markerIndex === -1) {
    return "";
  }

  const nextObjectIndex = source.indexOf("\n  {", markerIndex + marker.length);
  return source.slice(markerIndex, nextObjectIndex === -1 ? source.length : nextObjectIndex);
}

function extractArrayBlock(answerObject, propertyName) {
  const propertyIndex = answerObject.indexOf(`${propertyName}: [`);

  if (propertyIndex === -1) {
    return "";
  }

  const blockStart = answerObject.indexOf("[", propertyIndex);
  const blockEnd = answerObject.indexOf("]", blockStart);
  return answerObject.slice(blockStart, blockEnd + 1);
}

for (const questionId of requiredQuestionIds) {
  test(`${questionId} has complete model answer content`, () => {
    const answerObject = extractAnswerObject(questionId);
    const framesBlock = extractArrayBlock(answerObject, "frames");
    const vocabularyBlock = extractArrayBlock(answerObject, "vocabulary");
    const answerBlock = extractArrayBlock(answerObject, "answer");
    const answerTranslationBlock = extractArrayBlock(answerObject, "answerTranslation");

    assert.notEqual(answerObject, "", `${questionId} is missing`);
    assert.match(answerObject, /approach:\s*"[^"]{20,}"/);
    assert.ok((framesBlock.match(/"/g) ?? []).length >= 8, `${questionId} needs at least 4 frames`);
    assert.ok((vocabularyBlock.match(/phrase:/g) ?? []).length >= 5, `${questionId} needs at least 5 vocabulary items`);
    assert.match(answerBlock, /"[A-Z][\s\S]{220,}"/, `${questionId} needs a substantial English answer`);
    assert.match(answerTranslationBlock, /"[\s\S]*[\u4e00-\u9fff][\s\S]{120,}"/, `${questionId} needs a substantial Chinese translation`);
  });
}
