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

test("modern CET-4 papers publish PDF content as text without embedded scans or generic notice cards", () => {
  for (const { set } of papers) {
    assert.equal(set.assetRefs.some((asset) => asset.kind === "image"), false, set.id);
    assert.doesNotMatch(JSON.stringify(set.sections), /"type":"image"/u, set.id);
    assert.equal(set.instructions.some((block) => block.type === "notice"), false, set.id);
    for (const section of set.sections) for (const group of section.groups) {
      if (["-reading-a", "-reading-b", "-reading-c"].some((suffix) => section.id.endsWith(suffix))) {
        assert.ok(group.stimulusBlocks.length, `${set.id}/${section.id}: passage missing`);
      }
      for (const question of group.questions) {
        if (["essay", "translation"].includes(question.type)) assert.ok(question.promptBlocks.length, question.id);
        if (question.type === "single_choice") {
          assert.equal(question.options.length, 4, question.id);
          assert.ok(question.options.every((option) => option.blocks.length), `${question.id}: option text missing`);
        }
      }
    }
  }
});

test("all CET-4 papers and practice questions publish editable text without image blocks", () => {
  for (const { set } of sets) {
    assert.equal(set.assetRefs.some((asset) => asset.kind === "image"), false, `${set.id}: image asset remains`);
    assert.doesNotMatch(JSON.stringify(set.sections), /"type":"image"/u, `${set.id}: image block remains`);
  }
});

test("modern CET-4 passages do not repeat their section directions", () => {
  const blockText = (blocks) => blocks.map((block) => [block.text || "", ...(block.runs || []).filter((run) => run.type === "text").map((run) => run.text)].join(" ")).join(" ");
  const normalize = (text) => text.replace(/\s+/gu, " ").trim().toLocaleLowerCase();
  for (const { set } of papers) for (const section of set.sections) {
    const directions = normalize(blockText(section.instructions));
    if (directions.length < 30) continue;
    for (const group of section.groups) for (const block of group.stimulusBlocks) {
      const passageBlock = normalize(blockText([block]));
      if (passageBlock.length > 35) assert.equal(directions.includes(passageBlock), false, `${set.id}/${group.id}: duplicated section directions`);
    }
  }
});

test("modern CET-4 instructions are not polluted with repeated passages or damaged OCR glosses", () => {
  const damagedGloss = /\([^)]{0,18}(?:[#*]{1,}|AX\s*\d+|©|®|€|₺|É\s*\*|\b[0-9]{1,2}\s*[#*])[^)]{0,18}\)/u;
  for (const { set } of papers) {
    for (const section of set.sections) {
      const instructions = section.instructions.flatMap((block) => [block.text || "", ...(block.runs || []).filter((run) => run.type === "text").map((run) => run.text)]).join(" ");
      assert.ok(instructions.length <= 500, `${set.id}/${section.id}: OCR appended passage text to the directions`);
    }
    assert.doesNotMatch(JSON.stringify(set.sections), damagedGloss, `${set.id}: damaged vocabulary gloss`);
    assert.doesNotMatch(JSON.stringify(set.sections), /\uFFFD/u, `${set.id}: replacement character from OCR`);
  }
});

test("June 2026 careful-reading passages keep the source's Passage Two boundary", () => {
  for (const { set } of papers.filter(({ set }) => set.id.startsWith("cet4-paper-202606"))) {
    const section = set.sections.find((item) => item.id.endsWith("-reading-c"));
    const group = section.groups[0];
    assert.equal(group.questions.length, 10, set.id);
    assert.ok(group.stimulusBlocks.some((block) => block.type === "heading" && block.text === "Passage One"), set.id);
    assert.ok(group.stimulusBlocks.some((block) => block.type === "heading" && block.text === "Passage Two"), set.id);
  }
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

test("publication rejects a wrong option key, missing dictation answer and unreviewed image block", () => {
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
  typed.sections[0].groups[0].stimulusBlocks = [];
  assert.throws(() => validateReviewedCet4Set(typed), /missing option text/);
  const embedded = structuredClone(papers.find(({ set }) => set.id === "cet4-paper-2020092").set);
  const embeddedQuestion = embedded.sections.flatMap((section) => section.groups.flatMap((group) => group.questions)).find((q) => q.sourceQuestionNumber === 46);
  embeddedQuestion.sourceQuestionNumber = 999;
  embeddedQuestion.options.forEach((option) => { option.blocks = []; });
  assert.throws(() => validateReviewedCet4Set(embedded), /missing option text/);
  const image = structuredClone(papers[0].set);
  image.assetRefs.push({ assetId: "unreviewed-image", kind: "image", url: `/cet4/evidence/${"a".repeat(24)}.webp`, sha256: "changed" });
  image.sections[0].groups[0].stimulusBlocks.push({ type: "image", assetId: "unreviewed-image", alt: "unreviewed source" });
  assert.throws(() => validateReviewedCet4Set(image), /evidence image/);
});

test("CET-4 writing and dictation render; word-bank blanks drag and long-reading blanks use paragraph-letter menus", async () => {
  const require = createRequire(import.meta.url);
  const gradingModule = { exports: {} };
  const grading = ts.transpileModule(await readFile(new URL("../src/lib/senior-high/v2-grading.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(grading, { exports: gradingModule.exports, module: gradingModule, require: () => ({}) });
  const cleanupModule = { exports: {} };
  const cleanup = ts.transpileModule(await readFile(new URL("../src/lib/senior-high/v2-content-cleanup.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(cleanup, { exports: cleanupModule.exports, module: cleanupModule, require: () => ({}) });
  const runnerSource = await readFile(new URL("../src/components/senior-high/senior-high-runner.tsx", import.meta.url), "utf8");
  const compiled = ts.transpileModule(`${runnerSource}\nexport { QuestionCard, BlockRenderer };`, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  const runnerModule = { exports: {} };
  vm.runInNewContext(compiled, { exports: runnerModule.exports, module: runnerModule, require: (id) => id.endsWith(".css") ? {} : id === "@/lib/exam-content/overrides" ? { getExamContentOverride: async () => ({ override: null, error: null }), listExamContentOverrides: async () => ({ overrides: [], error: null }) } : id.endsWith("/v2-grading") ? gradingModule.exports : id === "@/lib/senior-high/v2-content-cleanup" ? cleanupModule.exports : id.endsWith("/inline-navigation") ? {} : id === "@/components/cet4/cet4-set-admin-editor" ? { Cet4SetAdminEditor: () => null } : id === "@/lib/cet4/content-overrides" ? { getCet4AdminUserId: async () => "", loadCet4ContentOverrides: async () => ({}) } : id === "@/components/vocabulary-mobile-back-link" ? { VocabularyMobileBackLink: ({ ariaLabel, className, desktopLabel, href }) => createElement("a", { "aria-label": ariaLabel, className: `vocabulary-mobile-back-link ${className}`, href }, createElement("span", { className: "vocabulary-back-link-desktop-label" }, desktopLabel), createElement("span", { "aria-hidden": "true", className: "vocabulary-back-link-mobile-arrow" }, "‹")) } : require(id) });
  const { QuestionCard, BlockRenderer } = runnerModule.exports;
  const paper = papers.find(({ summary }) => summary.questionCount === 57).set;
  const essay = paper.sections.flatMap((s) => s.groups.flatMap((g) => g.questions)).find((q) => q.type === "essay");
  const common = { answers: {}, bindings: new Map(), kind: "practice", onAnswer: () => {}, submitted: false };
  const writing = renderToStaticMarkup(createElement(QuestionCard, { ...common, hideMeta: true, assets: new Map(paper.assetRefs.map((a) => [a.assetId, a])), question: essay }));
  assert.doesNotMatch(writing, /<img /);
  assert.doesNotMatch(writing, /senior-high-question-meta/);
  assert.match(writing, /Directions:/);
  assert.match(writing, /<textarea /);
  const selfReview = renderToStaticMarkup(createElement(QuestionCard, { ...common, submitted: true, answers: { [essay.id]: "My draft answer." }, assets: new Map(paper.assetRefs.map((a) => [a.assetId, a])), question: essay }));
  assert.match(selfReview, /自行评阅/);
  const bank = practice.find(({ set }) => set.id === "practice-cet4-word-bank").set;
  const bankGroup = bank.sections[0].groups[0];
  assert.equal(bankGroup.stimulusBlocks.flatMap((block) => block.runs || []).filter((run) => run.type === "blank").length, 10);
  assert.equal(bankGroup.sharedOptions.length, 15);
  assert.ok(bankGroup.sharedOptions.every((option) => option.blocks.some((block) => block.type === "paragraph" && block.runs.some((run) => run.type === "text" && run.text.trim()))));
  const matching = bankGroup.questions[0];
  const matchingBindings = new Map(matching.blanks.map((b) => [b.blankId, { options: bankGroup.sharedOptions, question: matching }]));
  const blank = renderToStaticMarkup(createElement(QuestionCard, { ...common, assets: new Map(), bindings: matchingBindings, question: matching }));
  assert.doesNotMatch(blank, /<select /);
  assert.match(blank, /data-senior-high-drop-target="true"/);
  assert.match(blank, /draggable="false"/);
  const assignedBlank = renderToStaticMarkup(createElement(QuestionCard, { ...common, answers: { [matching.id]: "A" }, assets: new Map(), bindings: matchingBindings, question: matching }));
  assert.match(assignedBlank, /draggable="true"/);
  assert.match(runnerSource, /className="senior-high-v2-shared-options"[\s\S]*?onDrop=/);
  assert.match(runnerSource, /className=\{`senior-high-v2-shared-option/);
  assert.match(runnerSource, /cet4WordBankQuestionIds = new Set\(isCetExam\(basePath \|\| ""\) && group\.sharedOptions\.length > 0/);
  assert.match(runnerSource, /const standaloneQuestions = group\.questions\.filter\(\(question\) => !cet4WordBankQuestionIds\.has\(question\.id\)/);
  assert.match(runnerSource, /const inlineQuestions = group\.questions\.filter\(\(question\) => !cet4WordBankQuestionIds\.has\(question\.id\)/);
  const paperWordBank = papers.find(({ set }) => set.id === "cet4-paper-2026061").set;
  const paperWordBankGroup = paperWordBank.sections.flatMap((section) => section.groups).find((group) => group.questions.some((question) => question.typeLabel === "选词填空"));
  const paperWordBankBindings = new Map(paperWordBankGroup.questions.flatMap((question) => question.blanks.map((blank) => [blank.blankId, { options: paperWordBankGroup.sharedOptions, question }])));
  const paperWordBankQuestions = new Map(paperWordBankGroup.questions.map((question) => [question.sourceQuestionNumber, question]));
  const paperPassage = renderToStaticMarkup(createElement(BlockRenderer, { ...common, basePath: "/cet4", onOptionDrop: () => {}, assets: new Map(), bindings: paperWordBankBindings, blocks: paperWordBankGroup.stimulusBlocks, wordBankQuestions: paperWordBankQuestions }));
  assert.match(paperPassage, /<b>26<\/b><button[^>]*data-senior-high-drop-target="true"/);
  assert.doesNotMatch(paperPassage, /_{2,}26_{2,}/);
  assert.match(runnerSource, /group\.sharedOptions\.filter\(\(option\) => isCetExam\(basePath \|\| ""\) \|\| group\.sharedOptionsReusable/);
  const longReading = practice.find(({ set }) => set.id === "practice-cet4-matching").set;
  const longReadingGroups = longReading.sections.flatMap((section) => section.groups).filter((group) => group.questions.some((question) => question.typeLabel === "长篇阅读"));
  assert.equal(longReadingGroups.length, 30);
  for (const group of longReadingGroups) {
    const questions = group.questions.filter((question) => question.typeLabel === "长篇阅读");
    assert.equal(questions.length, 10, group.id);
    for (const question of questions) {
      const runs = question.promptBlocks.flatMap((block) => block.runs || []);
      assert.ok(runs.some((run) => run.type === "text" && run.text.trim().length > 25), question.id);
      assert.equal(runs.filter((run) => run.type === "blank").length, 1, question.id);
    }
  }
  const longReadingGroup = longReadingGroups[0];
  const paragraphQuestion = longReadingGroup.questions.find((question) => question.typeLabel === "长篇阅读");
  assert.ok(longReadingGroup.stimulusBlocks.length > 1 && longReadingGroup.stimulusBlocks.every((block) => block.type !== "image"));
  assert.ok(longReadingGroup.questions.every((question) => question.promptBlocks.some((block) => block.type === "paragraph" && block.runs.some((run) => run.type === "text"))));
  const paragraphBindings = new Map(paragraphQuestion.blanks.map((blank) => [blank.blankId, { options: longReadingGroup.sharedOptions, question: paragraphQuestion }]));
  const paragraphMenu = renderToStaticMarkup(createElement(QuestionCard, { ...common, basePath: "/cet4", assets: new Map(), bindings: paragraphBindings, question: paragraphQuestion }));
  assert.match(paragraphMenu, /class="senior-high-v2-inline-select"/);
  assert.match(paragraphMenu, /class="senior-high-v2-inline-select-value"/);
  assert.match(paragraphMenu, /<option value="A">A<\/option>/);
  assert.doesNotMatch(paragraphMenu, /A 段/);
  const restoredGroup = longReadingGroups.find((group) => group.id === "cet4-paper-2019062-reading-b-group");
  const restoredQuestion = restoredGroup.questions.find((question) => question.typeLabel === "长篇阅读");
  const restoredBindings = new Map(restoredQuestion.blanks.map((blank) => [blank.blankId, { options: restoredGroup.sharedOptions, question: restoredQuestion }]));
  const restoredCard = renderToStaticMarkup(createElement(QuestionCard, { ...common, basePath: "/cet4", assets: new Map(), bindings: restoredBindings, question: restoredQuestion }));
  assert.match(restoredCard, /Unemployed young men are more likely to live with their parents than the employed\./);
  assert.match(restoredCard, /class="senior-high-v2-inline-select"/);
  const examStyles = await readFile(new URL("../src/app/globals.css", import.meta.url), "utf8");
  const paperStyles = await readFile(new URL("../src/components/senior-high/senior-high-paper.css", import.meta.url), "utf8");
  assert.match(runnerSource, /VocabularyMobileBackLink ariaLabel="返回上一页" className="senior-high-back" desktopLabel="‹"/);
  assert.match(runnerSource, /className="senior-high-v2-progress"><strong>\{answeredCount\}\/\{questions\.length\}<\/strong><\/div>/);
  assert.match(paperStyles, /grid-template-areas: "back title progress"/);
  assert.match(paperStyles, /\.senior-high-v2-progress \{[^}]*text-align: right/);
  assert.match(paperStyles, /\.senior-high-page\.senior-high-v2-runner\[data-paper-font-size\] :is\(\.senior-high-v2-sections, \.senior-high-v2-question-nav, \.senior-high-v2-instructions, \.senior-high-paper-review, \.senior-high-paper-finish\) \{ margin-inline: 0; \}/);
  assert.match(examStyles, /\.senior-high-v2-inline-select::after[^}]*color: #111[^}]*font-size: 18px/);
  assert.match(examStyles, /\.senior-high-v2-inline-select select \{[^}]*width: 30px[^}]*opacity: 0/);
  assert.match(paperStyles, /\.senior-high-page\.senior-high-v2-runner\[data-paper-font-size\] \{ width: 100%; max-width: none; padding-inline: 0; \}/);
  assert.match(runnerSource, /group\.sharedOptions\.length > 0 && !\(isCetExam\(basePath \|\| ""\) && group\.questions\.some\(\(question\) => question\.typeLabel === "长篇阅读"\)\)/);
  const dictation = practice.find(({ set }) => set.id === "practice-cet4-dictation").set;
  const dictationGroup = dictation.sections.find((s) => s.groups[0].questions.some((q) => q.answerSpec.kind === "per_blank")).groups[0];
  const bindings = new Map(dictationGroup.questions.flatMap((q) => q.blanks.map((b) => [b.blankId, { options: [], question: q }])));
  const inputs = renderToStaticMarkup(createElement(BlockRenderer, { ...common, assets: new Map(), bindings, blocks: dictationGroup.stimulusBlocks }));
  assert.match(inputs, /<input /);
  const loadPractice = async (name) => JSON.parse(await readFile(new URL(`../public/cet4/practice/${name}`, import.meta.url), "utf8"));
  const [translationData, writingData, readingData, listeningData] = await Promise.all([
    loadPractice("practice-cet4-translation.json"),
    loadPractice("practice-cet4-writing.json"),
    loadPractice("practice-cet4-reading.json"),
    loadPractice("practice-cet4-listening.json"),
  ]);
  const translationQuestion = translationData.sections.find((section) => section.id === "cet4-paper-2018062-translation").groups[0].questions[0];
  assert.ok(translationQuestion.promptBlocks.every((block) => block.type !== "image"));
  assert.match(translationQuestion.promptBlocks.flatMap((block) => block.runs || []).map((run) => run.text || "").join(" "), /公交车曾是中国人出行的主要交通工具/);
  assert.ok(translationQuestion.answerSpec.referenceAnswer.every((block) => block.type !== "image"));
  const writingQuestion = writingData.sections.find((section) => section.id === "cet4-paper-2019063-writing").groups[0].questions[0];
  assert.ok(writingQuestion.promptBlocks.every((block) => block.type !== "image"));
  const carefulReading = readingData.sections.find((section) => section.id === "cet4-paper-2018062-reading-c").groups[0];
  assert.ok(carefulReading.stimulusBlocks.every((block) => block.type !== "image"));
  assert.ok(carefulReading.questions.every((question) => question.promptBlocks.length && question.options.every((option) => option.blocks.length)));
  const listeningSections = listeningData.sections.filter((section) => /^cet4-paper-2018062-listening-[abc]$/.test(section.id));
  assert.equal(listeningSections.length, 3);
  assert.ok(listeningSections.every((section) => section.instructions.some((block) => block.type === "audio") && section.groups.every((group) => group.stimulusBlocks.every((block) => block.type !== "image") && group.questions.every((question) => question.options.every((option) => option.blocks.length)))));
  for (const name of ["matching", "reading", "translation", "word-bank", "writing"]) {
    const payload = await loadPractice(`practice-cet4-${name}.json`);
    assert.doesNotMatch(JSON.stringify(payload), /原资料未提供听力题目/);
  }
  const cleaned = cleanupModule.exports.cleanExamSetNotice({ schemaVersion: 2, instructions: [{ type: "notice", text: "原资料未提供听力题目" }], sections: [] });
  assert.equal(cleaned.instructions.length, 0);
});
