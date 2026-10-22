import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { assertCet4PublicFile, assertCet4PublicationClean, validateReviewedCet4Set } from "./lib/cet4-publication.mjs";

const library = JSON.parse(await readFile(new URL("../src/data/cet4/library.json", import.meta.url), "utf8"));
const index = JSON.parse(await readFile(new URL("../public/cet4/index.json", import.meta.url), "utf8"));
const sets = await Promise.all(index.entries.map(async (summary) => ({ summary, set: JSON.parse(await readFile(new URL(`../public/cet4/${summary.kind === "paper" ? "papers" : "practice"}/${summary.id}.json`, import.meta.url), "utf8")) })));
const practice = sets.filter(({ set }) => set.kind === "practice");
const papers = sets.filter(({ set }) => set.kind === "paper");

test("CET-4 exposes 46 modern paper entries and nine legacy question families", () => {
  assert.equal(papers.length, 46);
  assert.equal(practice.length, 9);
  assert.equal(new Set(index.entries.map((entry) => entry.id)).size, index.entries.length);
  assert.ok(papers.every(({ set }) => /^cet4-paper-20(?:20|21|22|23|24|25|26)/.test(set.id)));
  assert.deepEqual(new Set(practice.map(({ set }) => set.title.replace(/^大学英语四级|训练$/gu, ""))), new Set(["听力理解", "听写填空", "选词填空", "长篇阅读", "仔细阅读", "完形填空", "词汇与语法", "翻译", "写作"]));
  const years = new Set(practice.flatMap(({ set }) => set.sections.map((section) => section.sourceYear)));
  for (let year = 1990; year <= 2019; year++) assert.ok(years.has(String(year)), `missing legacy year ${year}`);
});

test("raw source bodies, promotional documents and knowledge entries are not published", () => {
  assert.equal(library.entries.length, 46);
  for (const entry of library.entries) {
    assert.equal(entry.section, "试卷");
    assert.equal(entry.body, "");
    assert.equal(entry.answers, "");
    assert.ok(entry.sourceFiles.length);
    assert.match(entry.sourceHash, /^[a-f0-9]{64}$/);
  }
  assertCet4PublicationClean(library);
  assert.doesNotMatch(JSON.stringify(library), /六级真题|knowledge-/u);
});

test("all published questions are answered, traceable and use the shared group contract", () => {
  for (const { summary, set } of sets) {
    validateReviewedCet4Set(set);
    const questions = set.sections.flatMap((section) => section.groups.flatMap((group) => group.questions));
    assert.equal(set.schemaVersion, 2, set.id);
    assert.equal(questions.length, summary.questionCount, set.id);
    assert.equal(summary.answeredCount, questions.length, set.id);
    for (const q of questions) for (const ref of q.sourceRefs) assert.match(ref.sha256, /^[a-f0-9]{64}$/);
    if (set.kind === "paper") assert.equal(set.submissionMode, "whole-paper");
    else assert.ok(set.sections.every((section) => section.sourceYear));
  }
});

test("partial and reconstructed sources state their actual exercise coverage", () => {
  const july = papers.find(({ set }) => set.id === "cet4-paper-2020071");
  assert.equal(july.summary.questionCount, 2);
  assert.match(july.set.coverageNote, /拼接/u);
  for (const { summary, set } of papers) {
    assert.ok([2, 32, 57].includes(summary.questionCount), set.id);
    assert.equal(set.timeLimit, { 2: 60, 32: 100, 57: 125 }[summary.questionCount]);
    if (summary.questionCount < 57) assert.ok(set.coverageNote, set.id);
  }
  for (const id of ["cet4-paper-2022092", "cet4-paper-2022093"]) {
    const { set, summary } = papers.find((entry) => entry.set.id === id);
    assert.equal(summary.questionCount, 57);
    assert.ok(set.assetRefs.find((asset) => asset.kind === "audio")?.url.endsWith("cet4-paper-2022091.mp3"));
  }
});

test("answers and explanations stay out of question surfaces", () => {
  for (const { set } of sets) for (const section of set.sections) for (const group of section.groups) {
    const surface = JSON.stringify({ instructions: group.instructions, stimulusBlocks: group.stimulusBlocks, questions: group.questions.map(({ promptBlocks, options }) => ({ promptBlocks, options })) });
    assert.doesNotMatch(surface, /【(?:答案|精析|解析)】|答案解析|答案详解|语法判断|词义判断|HYPERLINK|PAGEREF/u, group.id);
  }
});

test("word selection, paragraph matching and dictation retain distinct response formats", () => {
  const matchingSet = practice.find(({ set }) => set.id === "practice-cet4-matching").set;
  for (const [questionId, label] of [["cet4-paper-2017062-q-39", "J"], ["cet4-paper-2015063-q-41", "Q"]]) {
    const group = matchingSet.sections.flatMap((section) => section.groups).find((group) => group.questions.some((q) => q.id === questionId));
    assert.ok(group.sharedOptions.some((option) => option.id === label), questionId);
  }
  for (const { set } of practice) for (const section of set.sections) for (const group of section.groups) {
    for (const q of group.questions) {
      assert.ok(q.sourceQuestionNumber !== undefined || ["essay", "translation"].includes(q.type), q.id);
      if (q.typeLabel === "选词填空") {
        assert.equal(q.type, "shared_option_matching");
        assert.equal(group.sharedOptions.length, 15);
        assert.ok(!group.sharedOptionsReusable);
      }
      if (q.typeLabel === "完形填空") {
        assert.equal(q.type, "single_choice");
        assert.equal(q.options.length, 4);
      }
      if (q.typeLabel === "听写填空") assert.ok(["per_blank", "reference"].includes(q.answerSpec.kind));
      if (q.typeLabel === "长篇阅读" && q.type === "shared_option_matching") assert.equal(group.sharedOptionsReusable, true);
    }
  }
});

test("old writing instructions use their actual outline topic", () => {
  const writing = practice.find(({ set }) => set.id === "practice-cet4-writing").set;
  for (const q of writing.sections.flatMap((section) => section.groups.flatMap((group) => group.questions))) {
    if (/cet4-legacy-200(?:612|906)-/.test(q.id)) {
      assert.doesNotMatch(JSON.stringify(q.promptBlocks), /students selecting their lectures|given bellow/);
      assert.equal(q.sourceQuestionNumber, undefined);
    }
  }
});

test("published source images and audio match their reviewed content hashes", async () => {
  const media = new Map(sets.flatMap(({ set }) => set.assetRefs.map((asset) => [asset.url, asset])));
  for (const [url, asset] of media) {
    assert.match(url, /^\/cet4\/(?:evidence|audio)\//u);
    assert.match(asset.sha256, /^[a-f0-9]{64}$/);
    const bytes = await readFile(new URL(`../public${url}`, import.meta.url));
    assert.equal(createHash("sha256").update(bytes).digest("hex"), asset.sha256, url);
  }
});

test("publication rejects advertising and corrupt OCR while preserving assessed mentions", () => {
  for (const text of ["关注公众号领取资料", "淘宝店铺：https://shop.example.cn", "配套译文联系VX:KZRZ2019", "练习方式：添加微信", "bro\ufffdken", "wrong\ue123glyph"]) assert.throws(() => assertCet4PublicationClean(text));
  assert.doesNotThrow(() => assertCet4PublicationClean("The passage cites Lynda.com and careerbuilder.com. 对店铺体验进行评分；通过扫描二维码获得信息。"));
});

test("raw documents, subtitles and unrelated files cannot enter the public CET-4 directory", () => {
  for (const file of ["source.pdf", "papers/original.docx", "audio/original.srt", "practice/raw.txt", "evidence/source.tif", "../raw.pdf", "extra.html"]) assert.throws(() => assertCet4PublicFile(file));
  for (const file of ["index.json", "papers/cet4-paper-2026061.json", "practice/practice-cet4-reading.json", "audio/cet4-paper-2026061.mp3", `evidence/${"a".repeat(24)}.webp`]) assert.doesNotThrow(() => assertCet4PublicFile(file));
});

test("publication rejects a wrong option key, missing dictation answer and unreviewed image", () => {
  const candidate = structuredClone(papers.find(({ summary }) => summary.questionCount === 57).set);
  const group = candidate.sections.flatMap((section) => section.groups).find((group) => group.questions[0].answerSpec.kind === "choice");
  group.questions[0].answerSpec.acceptedAnswers = ["Z"];
  assert.throws(() => validateReviewedCet4Set(candidate), /option range/);
  const dictation = structuredClone(practice.find(({ set }) => set.id === "practice-cet4-dictation").set);
  const q = dictation.sections.flatMap((section) => section.groups.flatMap((group) => group.questions)).find((q) => q.answerSpec.kind === "per_blank");
  q.answerSpec.perBlankAnswers = {};
  assert.throws(() => validateReviewedCet4Set(dictation), /dictation answer/);
  q.answerSpec.perBlankAnswers = Object.fromEntries(q.blanks.map((blank) => [blank.blankId, [" "]]));
  assert.throws(() => validateReviewedCet4Set(dictation), /dictation answer/);
  q.answerSpec.perBlankAnswers = Object.fromEntries(q.blanks.map((blank) => [blank.blankId, ["A"]]));
  assert.throws(() => validateReviewedCet4Set(dictation), /ambiguous dictation letter/);
  const typed = structuredClone(practice.find(({ set }) => set.id === "practice-cet4-grammar").set);
  typed.sections[0].groups[0].questions[0].options[0].blocks = [];
  assert.throws(() => validateReviewedCet4Set(typed), /missing option text/);
  const embedded = structuredClone(papers.find(({ set }) => set.id === "cet4-paper-2020092").set);
  embedded.sections.flatMap((section) => section.groups.flatMap((group) => group.questions)).find((q) => q.sourceQuestionNumber === 46).sourceQuestionNumber = 999;
  assert.throws(() => validateReviewedCet4Set(embedded), /missing option text/);
  const image = structuredClone(papers[0].set);
  image.assetRefs.find((asset) => asset.kind === "image").sha256 = "changed";
  assert.throws(() => validateReviewedCet4Set(image), /evidence image/);
});

test("actual CET-4 writing images, matching selectors and dictation inputs render", async () => {
  const require = createRequire(import.meta.url);
  const gradingModule = { exports: {} };
  const grading = ts.transpileModule(await readFile(new URL("../src/lib/senior-high/v2-grading.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(grading, { exports: gradingModule.exports, module: gradingModule, require: () => ({}) });
  const runnerSource = await readFile(new URL("../src/components/senior-high/senior-high-runner.tsx", import.meta.url), "utf8");
  const compiled = ts.transpileModule(`${runnerSource}\nexport { QuestionCard, BlockRenderer };`, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  const runnerModule = { exports: {} };
  vm.runInNewContext(compiled, { exports: runnerModule.exports, module: runnerModule, require: (id) => id.endsWith(".css") ? {} : id.endsWith("/v2-grading") ? gradingModule.exports : id.endsWith("/inline-navigation") ? {} : require(id) });
  const { QuestionCard, BlockRenderer } = runnerModule.exports;
  const paper = papers.find(({ summary }) => summary.questionCount === 57).set;
  const essay = paper.sections.flatMap((s) => s.groups.flatMap((g) => g.questions)).find((q) => q.type === "essay");
  const common = { answers: {}, bindings: new Map(), kind: "practice", onAnswer: () => {}, submitted: false };
  const writing = renderToStaticMarkup(createElement(QuestionCard, { ...common, assets: new Map(paper.assetRefs.map((a) => [a.assetId, a])), question: essay }));
  assert.match(writing, /<img /);
  assert.match(writing, /<textarea /);
  const selfReview = renderToStaticMarkup(createElement(QuestionCard, { ...common, submitted: true, answers: { [essay.id]: "My draft answer." }, assets: new Map(paper.assetRefs.map((a) => [a.assetId, a])), question: essay }));
  assert.match(selfReview, /自行评阅/);
  const bank = practice.find(({ set }) => set.id === "practice-cet4-word-bank").set;
  const bankGroup = bank.sections[0].groups[0];
  const matching = bankGroup.questions[0];
  const selector = renderToStaticMarkup(createElement(QuestionCard, { ...common, assets: new Map(), bindings: new Map(matching.blanks.map((b) => [b.blankId, { options: bankGroup.sharedOptions, question: matching }])), question: matching }));
  assert.match(selector, /<select /);
  assert.equal((selector.match(/<option /g) || []).length, 16);
  const dictation = practice.find(({ set }) => set.id === "practice-cet4-dictation").set;
  const dictationGroup = dictation.sections.find((s) => s.groups[0].questions.some((q) => q.answerSpec.kind === "per_blank")).groups[0];
  const bindings = new Map(dictationGroup.questions.flatMap((q) => q.blanks.map((b) => [b.blankId, { options: [], question: q }])));
  const inputs = renderToStaticMarkup(createElement(BlockRenderer, { ...common, assets: new Map(), bindings, blocks: dictationGroup.stimulusBlocks }));
  assert.match(inputs, /<input /);
});
