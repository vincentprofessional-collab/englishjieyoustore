import assert from "node:assert/strict";
import test from "node:test";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const filename = path.join(ROOT, "src/lib/senior-high/v2-grading.ts");
const source = fs.readFileSync(filename, "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const module = { exports: {} };
vm.runInNewContext(compiled, { exports: module.exports, module, require: () => ({}) }, { filename });
const { gradeSeniorHighQuestion, seniorHighQuestionAnswered } = module.exports;

const base = {
  id: "q-1",
  displayNumber: 1,
  type: "single_choice",
  promptBlocks: [],
  placement: { kind: "standalone" },
  options: [],
  blanks: [],
  explanationBlocks: [],
  sourceRefs: [],
  reviewStatus: "approved",
};
const normalization = { unicodeNfkc: true, trim: true, collapseSpaces: true, caseSensitive: false };

test("choice and per-blank answers use controlled exact normalization", () => {
  const choice = { ...base, answerSpec: { availability: "answered", gradingMode: "auto", kind: "choice", acceptedAnswers: ["A"], normalization } };
  assert.equal(gradeSeniorHighQuestion(choice, { "q-1": "a" }), "correct");
  assert.equal(gradeSeniorHighQuestion(choice, { "q-1": "B" }), "incorrect");
  assert.equal(gradeSeniorHighQuestion(choice, {}), "unanswered");
  const fill = { ...base, type: "inline_fill", blanks: [{ blankId: "b1" }, { blankId: "b2" }], answerSpec: { availability: "answered", gradingMode: "auto", kind: "per_blank", perBlankAnswers: { b1: ["has gone"], b2: ["there"] }, normalization } };
  assert.equal(gradeSeniorHighQuestion(fill, { b1: " HAS   GONE ", b2: "there" }), "correct");
  assert.equal(seniorHighQuestionAnswered(fill, { b1: "has gone", b2: "" }), false);
});

test("manual, unanswered and conflicting questions are never marked wrong", () => {
  assert.equal(gradeSeniorHighQuestion({ ...base, answerSpec: { availability: "answered", gradingMode: "manual", kind: "reference" } }, { "q-1": "draft" }), "manual");
  assert.equal(gradeSeniorHighQuestion({ ...base, answerSpec: { availability: "answered", gradingMode: "manual", kind: "reference" } }, {}), "unanswered");
  assert.equal(gradeSeniorHighQuestion({ ...base, answerSpec: { availability: "none", gradingMode: "none", kind: "none" } }, {}), "none");
  assert.equal(gradeSeniorHighQuestion({ ...base, answerSpec: { availability: "conflict", gradingMode: "none", kind: "none" } }, {}), "conflict");
});
