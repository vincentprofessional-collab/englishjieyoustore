import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

const exports = {};
const code = ts.transpileModule(fs.readFileSync(new URL("../src/components/vocabulary-morphology.tsx", import.meta.url), "utf8"), {
  compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
vm.runInNewContext(code, { exports, require: (name) => {
  if (name === "react/jsx-runtime") return { jsx: () => null, jsxs: () => null };
  throw new Error(`Unexpected import ${name}`);
} });

const { getVisibleVocabularyFormationParts } = exports;

test("hide a lone root and redundant single-root labels, while retaining roots paired with affixes", () => {
  assert.deepEqual(Array.from(getVisibleVocabularyFormationParts([{ label: "PIE root *al-；中文释义：生长" }])), []);
  assert.deepEqual(Array.from(getVisibleVocabularyFormationParts([
    { label: "babe" },
    { label: "单一词根/: babe" },
  ])), []);
  assert.deepEqual(Array.from(getVisibleVocabularyFormationParts([
    { label: "ab-（方向前缀）" },
    { label: "PIE root *al-；中文释义：生长" },
  ])), [
    { label: "ab-（方向前缀）" },
    { label: "PIE root *al-；中文释义：生长" },
  ]);
});
