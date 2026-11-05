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
const { compareStudyExamples, getConciseStudyDefinition, getDefinitionOptionText, getStudyPhonetic, maskStudyExample } = exports;
const workbookExamples = JSON.parse(readFileSync(new URL("../src/data/vocabulary/workbook-usage-examples.json", import.meta.url), "utf8"));
const workbookDetails = JSON.parse(readFileSync(new URL("../src/data/vocabulary/workbook-vocabulary-details.json", import.meta.url), "utf8"));

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

test("paraphrased translations remain visible and unrelated examples are rejected", () => {
  assert.equal(maskStudyExample("An aberrant result.", "这个结果与众不同。", "aberrant", [], "adj. 异常的；畸变的").chinese, "这个结果与众不同。");
  assert.equal(maskStudyExample("A different word.", "别的词。", "aberrant", [], "adj. 异常的").matched, false);
});

test("the reported SAT examples retain their Chinese sentence context", () => {
  for (const word of ["abominable", "abbess"]) {
    const example = workbookExamples[word];
    const masked = maskStudyExample(example.englishText, example.chineseText, word, [], workbookDetails[word].definitionCn);
    assert.ok(masked.english.includes("______"));
    assert.ok(masked.chinese.length > 10);
    if (word === "abominable") assert.equal(masked.chinese, example.chineseText);
    else assert.equal(masked.chinese, "希尔德加德是本笃会的一位天主教______。");
  }
});

test("Excel bilingual examples mask concise Chinese synonyms and provide the English definition", () => {
  const example = workbookExamples.afraid;
  const details = workbookDetails.afraid;
  const masked = maskStudyExample(example.englishText, example.chineseText, "afraid", [], details.definitionCn);

  assert.equal(masked.english, "Don't be ______ to make mistakes when learning a new language.");
  assert.equal(masked.chinese, "学新语言时不要______犯错。");
  assert.deepEqual(details.englishDefinitions, ["feeling fear; frightened because you think that you might be hurt or suffer"]);
});

test("non-workbook examples take priority, then shorter bilingual examples", () => {
  const workbook = { english: "A somewhat longer workbook sentence.", chinese: "Excel 翻译。", sourceType: "workbook" };
  const shorterFallback = { english: "A book.", chinese: "一本书。", sourceType: "listening" };
  const longerFallback = { english: "A much longer fallback sentence.", chinese: "更长的翻译。", sourceType: "manual" };
  assert.ok(compareStudyExamples(shorterFallback, workbook) < 0);
  assert.ok(compareStudyExamples(shorterFallback, longerFallback) < 0);
});

test("imported workbook examples are bilingual and available for vocabulary lookup", () => {
  assert.ok(Object.keys(workbookExamples).length > 18000);
  assert.deepEqual(workbookExamples.apple, {
    englishText: "I eat an apple every day.",
    chineseText: "我每天吃一个苹果。",
  });
  assert.ok(Object.values(workbookExamples).every((example) => example.englishText.trim() && example.chineseText.trim()));
});

test("definition options retain two main parts of speech and one meaning per part", () => {
  assert.equal(getDefinitionOptionText("n. 拉链；拉锁 / v. 拉上或拉开拉链 / vi. 拉上拉链 / vt. 用拉链扣上 / adj. 活泼的"), "n. 拉链\nv. 拉上或拉开拉链");
  assert.equal(getDefinitionOptionText("vt. 运行；经营 / vi. 跑；奔跑 / n. 运行；奔跑 / adj. 运行的"), "v. 运行\nn. 运行");
  assert.equal(getDefinitionOptionText("art. 一；任一"), "art. 一");
  assert.equal(getDefinitionOptionText("adj. （食物）难消化的，易饱的\n乏味的\nn. 物品"), "adj. （食物）难消化的，易饱的；乏味的\nn. 物品");
});

test("the word list selects the configured accent's phonetic without swapping accents", () => {
  const word = { usPhonetic: " /US/ ", ukPhonetic: " /UK/ ", phonetic: " /fallback/ " };
  assert.equal(getStudyPhonetic(word, "us"), "/US/");
  assert.equal(getStudyPhonetic(word, "uk"), "/UK/");
  assert.equal(getStudyPhonetic({ phonetic: "/legacy/" }, "uk"), "/legacy/");
  assert.equal(getStudyPhonetic({}, "us"), "");
});

test("study vocabulary details hide the morphology row and center word and IPA on separate rows", () => {
  const learning = readFileSync(new URL("../src/components/vocabulary-learning.tsx", import.meta.url), "utf8");
  const heading = readFileSync(new URL("../src/components/vocabulary-detail-heading.tsx", import.meta.url), "utf8");
  const styles = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");
  assert.match(learning, /showMorphology=\{false\}\s+studyCentered/);
  assert.match(learning, /showActions=\{false\}/);
  assert.match(heading, /showMorphology\s*&&\s*parts\.length/);
  assert.match(heading, /showActions\s*\?\s*<div className="vocabulary-detail-heading-actions"/);
  assert.match(styles, /vocabulary-detail-heading-study-centered[\s\S]*?flex-direction:\s*column/);
  assert.match(styles, /vocabulary-detail-heading-study-centered[\s\S]*?justify-content:\s*center/);
  assert.match(styles, /vocabulary-detail-heading-study-centered \.vocabulary-detail-heading-frequency\s*\{\s*display:\s*none/s);
});

test("story word pronunciations use generated vocabulary audio rather than browser speech synthesis", () => {
  const story = readFileSync(new URL("../src/components/senior-high-vocabulary-story-preview.tsx", import.meta.url), "utf8");
  assert.match(story, /playVocabularyPronunciation\(\{ accent, word \}\)/);
  assert.doesNotMatch(story, /SpeechSynthesisUtterance|speechSynthesis\.speak/);
});
