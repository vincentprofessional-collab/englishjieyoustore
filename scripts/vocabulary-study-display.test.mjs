import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const exports = {};
const code = ts.transpileModule(readFileSync(new URL("../src/lib/vocabulary/study-definition.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
runInNewContext(code, { exports });
const { getConciseStudyDefinition, maskStudyExample } = exports;

test("study meanings preserve each part of speech and two concise senses without inflection notes", () => {
  assert.equal(getConciseStudyDefinition("adj. 持久的；永恒的 / n. [纺] 厚实斜纹织物 / v. 持续；维持（last的ing形式）；支持"), "adj. 持久的；永恒的\nn. 厚实斜纹织物\nv. 持续；维持");
  assert.equal(getConciseStudyDefinition("adj. 异常的；畸变的；脱离常轨的；迷乱的"), "adj. 异常的；畸变的");
});

test("bilingual cloze masks the inflected target and its Chinese meaning while retaining sentence context", () => {
  const example = maskStudyExample("The company reinvented itself as a technology firm.", "该公司将自己重新定义成一家科技公司。", "reinvent", ["reinvented", "reinventing"], "v. 重新定义；彻底改造");
  assert.equal(example.english, "The company ______ itself as a technology firm.");
  assert.equal(example.chinese, "该公司将自己______成一家科技公司。");
  assert.equal(example.matched, true);
  assert.equal(maskStudyExample("A pineapple and apples.", "菠萝和苹果。", "apple", ["apples"], "n. 苹果").english, "A pineapple and ______.");
});

test("unmatched paraphrases never disclose Chinese answers and unrelated examples are rejected", () => {
  assert.equal(maskStudyExample("An aberrant result.", "这个结果与众不同。", "aberrant", [], "adj. 异常的；畸变的").chinese, "______");
  assert.equal(maskStudyExample("A different word.", "别的词。", "aberrant", [], "adj. 异常的").matched, false);
});
