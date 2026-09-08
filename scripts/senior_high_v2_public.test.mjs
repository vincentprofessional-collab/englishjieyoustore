import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { validateSeniorHighV2Publishability, validateSeniorHighV2Set } from "./senior_high_v2_schema.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const PUBLIC_ROOT = path.join(ROOT, "public", "senior-high");
const index = JSON.parse(fs.readFileSync(path.join(PUBLIC_ROOT, "index.json"), "utf8"));
const publishReport = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "senior-high", "v2", "publish-report.json"), "utf8"));

function payload(entry) {
  const group = entry.kind === "paper" ? "papers" : "practice";
  return JSON.parse(fs.readFileSync(path.join(PUBLIC_ROOT, group, `${entry.id}.json`), "utf8"));
}

test("public index is metadata-only and every linked v2 set passes the public quality gate", () => {
  assert.equal(index.schemaVersion, 2);
  assert.equal(index.entries.length, publishReport.totals.sets);
  assert.ok(index.entries.length >= 16);
  const paperEntries = index.entries.filter((entry) => entry.kind === "paper");
  assert.equal(paperEntries.length, 10);
  assert.deepEqual([...new Set(paperEntries.map((entry) => entry.year))].sort(), ["2024", "2025"]);
  assert.ok(fs.statSync(path.join(PUBLIC_ROOT, "index.json")).size < 500_000);
  assert.equal(new Set(index.entries.map((entry) => entry.id)).size, index.entries.length);
  for (const entry of index.entries) {
    assert.equal("sections" in entry, false);
    const set = payload(entry);
    const result = validateSeniorHighV2Set(set, { publicData: true });
    assert.equal(result.ok, true, `${entry.id}: ${result.errors.join("\n")}`);
    assert.equal(validateSeniorHighV2Publishability(set).ok, true, `${entry.id}: not publishable`);
    if (entry.kind === "paper") assert.equal(set.submissionMode, "whole-paper");
    assert.equal(result.questionCount, entry.questionCount);
    assert.ok(set.sections.flatMap((section) => section.groups.flatMap((group) => group.questions)).every((question) => question.reviewStatus === "approved"));
  }
});

test("incomplete legacy and answerless sets are excluded from the public index", () => {
  assert.equal(index.entries.some((entry) => entry.id === "paper-2007-beijing-legacy"), false);
  assert.equal(index.entries.some((entry) => entry.id === "paper-2013-guangdong-02f567c00ac2"), false);
  assert.equal(index.entries.some((entry) => entry.id === "paper-2013-jiangxi-aaddb47fa25c"), false);
  assert.equal(index.entries.some((entry) => entry.id === "practice-guangdong-speaking-test-c"), false);
  assert.ok(publishReport.rejected.some((entry) => entry.id === "paper-2007-beijing-legacy"));
  assert.ok(publishReport.rejected.some((entry) => entry.id === "paper-2013-guangdong-02f567c00ac2"));
  assert.ok(publishReport.rejected.some((entry) => entry.id === "paper-2013-jiangxi-aaddb47fa25c"));
  assert.ok(publishReport.rejected.some((entry) => entry.id === "practice-guangdong-speaking-test-c"));
});

test("legacy mixed listening groups without audio are excluded instead of showing orphan directions", () => {
  for (const id of [
    "paper-2010-fujian-a41de770a267",
    "paper-2007-guangdong-1e7257f7e436",
    "paper-2022-zhejiang-55819fa15bda",
  ]) {
    assert.equal(index.entries.some((entry) => entry.id === id), false, `${id}: unsafe mixed group was published`);
    assert.ok(publishReport.rejected.some((entry) => entry.id === id), `${id}: rejection was not recorded`);
  }
});

test("2024 legacy papers publish only their complete question/option/answer subset", () => {
  for (const id of [
    "paper-2024-national-eaf467d6a8f1",
    "paper-2024-tianjin-27a290d25555",
    "paper-2024-zhejiang-bb3fb00e8526",
  ]) {
    assert.ok(index.entries.some((entry) => entry.id === id), `${id}: missing from public index`);
  }
  const national = payload(index.entries.find((entry) => entry.id === "paper-2024-national-eaf467d6a8f1"));
  const zhejiang = payload(index.entries.find((entry) => entry.id === "paper-2024-zhejiang-bb3fb00e8526"));
  assert.equal(national.sections[0].groups[0].stimulusBlocks.filter((block) => block.type === "audio").length, 1);
  assert.equal(zhejiang.sections[0].groups[0].stimulusBlocks.filter((block) => block.type === "audio").length, 1);
  assert.ok(national.sections.flatMap((section) => section.groups.flatMap((group) => group.questions)).every((question) => question.promptBlocks.length > 0 && question.answerSpec.availability === "answered"));
});

test("top instructions do not repeat the structured article or source image", () => {
  const set = payload(index.entries.find((entry) => entry.id === "paper-2024-beijing"));
  const top = JSON.stringify(set.instructions);
  const lower = JSON.stringify(set.sections);
  assert.doesNotMatch(top, /I’d just arrived at school/);
  assert.doesNotMatch(top, /source image/);
  assert.match(lower, /I’d just arrived at school/);
});

test("2025 Beijing writing article is separated from question 39 explanation", () => {
  const set = payload(index.entries.find((entry) => entry.id === "paper-2025-beijing"));
  const question39 = set.sections.find((section) => section.id === "section-reading").groups.find((group) => group.id === "group-beijing-seven").questions.find((question) => question.displayNumber === 39);
  assert.doesNotMatch(JSON.stringify(question39.explanationBlocks), /There’s something magical about the way imagination works/);
  assert.doesNotMatch(JSON.stringify(question39.explanationBlocks), /第三部分 书面表达/);
  const writing = set.sections.find((section) => section.id === "section-writing");
  const shortAnswerGroup = writing.groups.find((group) => group.id === "group-beijing-short-answer");
  const essayGroup = writing.groups.find((group) => group.id === "group-beijing-essay");
  assert.ok(shortAnswerGroup);
  assert.match(JSON.stringify(shortAnswerGroup.stimulusBlocks), /There’s something magical about the way imagination works/);
  assert.deepEqual(shortAnswerGroup.questions.map((question) => question.displayNumber), [40, 41, 42, 43]);
  assert.ok(shortAnswerGroup.questions.every((question) => question.answerSpec.kind === "reference"));
  assert.match(shortAnswerGroup.questions.find((question) => question.displayNumber === 42).correctionStatement, /With encouragement from his friends and parents/);
  assert.ok(essayGroup);
  assert.equal(essayGroup.stimulusBlocks.length, 0);
  assert.deepEqual(essayGroup.questions.map((question) => question.displayNumber), [44]);
});

test("2024 Beijing short-answer passage is present and other 2024 short-answer groups are not empty", () => {
  const ids = [
    "paper-2024-beijing",
    "paper-2024-new-gaokao-i",
    "paper-2024-new-gaokao-ii",
    "paper-2024-national-eaf467d6a8f1",
    "paper-2024-tianjin-27a290d25555",
    "paper-2024-zhejiang-bb3fb00e8526",
  ];
  for (const id of ids) {
    const set = payload(index.entries.find((entry) => entry.id === id));
    for (const group of set.sections.flatMap((section) => section.groups)) {
      if (group.questions.some((question) => question.type === "short_answer")) assert.ok(group.stimulusBlocks.length > 0, `${id}/${group.id}: short-answer passage missing`);
    }
  }
  const beijing = payload(index.entries.find((entry) => entry.id === "paper-2024-beijing"));
  const writing = beijing.sections.find((section) => section.id === "section-writing");
  const shortAnswer = writing.groups.find((group) => group.id === "group-beijing-short-answer");
  assert.match(JSON.stringify(shortAnswer.stimulusBlocks), /Growing up, I idealised independence/);
  assert.ok(shortAnswer.questions.every((question) => question.answerSpec.kind === "reference"));
});

test("2025 Beijing section two keeps its article out of the previous explanation", () => {
  const set = payload(index.entries.find((entry) => entry.id === "paper-2025-beijing"));
  const firstSection = set.sections.find((section) => section.id === "section-knowledge");
  const question10 = firstSection.groups.find((group) => group.id === "group-1-10-1").questions.find((question) => question.displayNumber === 10);
  const grammarGroups = firstSection.groups.filter((group) => /^group-beijing-grammar-[abc]$/.test(group.id));
  assert.doesNotMatch(JSON.stringify(question10.explanationBlocks), /第二节|Most days after school/);
  assert.deepEqual(grammarGroups.map((group) => group.questions.map((question) => question.displayNumber)), [[11, 12, 13], [14, 15, 16], [17, 18, 19, 20]]);
  assert.ok(grammarGroups.every((group) => group.presentation === "inline"));
  assert.ok(grammarGroups.every((group) => !/【答案】|【解析】|【导语】|题详解/.test(JSON.stringify(group.stimulusBlocks))));
  assert.match(JSON.stringify(grammarGroups[0].stimulusBlocks), /Most days after school/);
  assert.match(JSON.stringify(grammarGroups[2].stimulusBlocks), /q-beijing-grammar-b17/);
});

test("grammar-fill groups without side options use the inline presentation", () => {
  for (const id of ["paper-2024-beijing", "paper-2024-new-gaokao-i", "paper-2024-new-gaokao-ii", "paper-2025-beijing"]) {
    const set = payload(index.entries.find((entry) => entry.id === id));
    for (const group of set.sections.flatMap((section) => section.groups)) {
      if (group.questions.some((question) => question.type === "inline_fill") && group.sharedOptions.length === 0 && group.questions.every((question) => question.promptBlocks.length === 0 && question.options.length === 0)) {
        assert.equal(group.presentation, "inline", `${id}/${group.id}`);
      }
    }
  }
});

test("2025 article and writing groups carry the intended page layout", () => {
  for (const id of ["paper-2025-beijing", "paper-2025-new-gaokao-i", "paper-2025-new-gaokao-ii", "paper-2025-zhejiang-january"]) {
    const set = payload(index.entries.find((entry) => entry.id === id));
    for (const group of set.sections.flatMap((section) => section.groups)) {
      if (group.sharedOptions.length > 0 || group.questions.some((question) => question.options.length > 0)) assert.equal(group.presentation, "reading", `${id}/${group.id}`);
      if (group.questions.some((question) => question.type === "inline_fill")) assert.equal(group.presentation, "inline", `${id}/${group.id}`);
      if (group.questions.some((question) => question.type === "essay")) assert.equal(group.presentation, "writing", `${id}/${group.id}`);
    }
  }
});

test("2025 explanations do not contain the next A/B/C/D article or section", () => {
  for (const id of ["paper-2024-beijing", "paper-2024-new-gaokao-i", "paper-2024-new-gaokao-ii", "paper-2025-beijing", "paper-2025-new-gaokao-i", "paper-2025-new-gaokao-ii", "paper-2025-zhejiang-january"]) {
    const set = payload(index.entries.find((entry) => entry.id === id));
    for (const question of set.sections.flatMap((section) => section.groups.flatMap((group) => group.questions))) {
      const blocks = question.explanationBlocks || [];
      for (const block of blocks.slice(1)) {
        const text = block.type === "paragraph" || block.type === "richText" ? block.runs.filter((run) => run.type === "text").map((run) => run.text).join("").trim() : block.text?.trim() || "";
        assert.doesNotMatch(text, /^(?:[A-D]$|第二节[（(]|第三部分|第[一二三四]部分)/, `${id}/${question.id}: ${text}`);
      }
    }
  }
});

test("2025 papers keep section hierarchy and directions only once", () => {
  const ids = ["paper-2024-beijing", "paper-2024-new-gaokao-i", "paper-2024-new-gaokao-ii", "paper-2025-beijing", "paper-2025-new-gaokao-i", "paper-2025-new-gaokao-ii", "paper-2025-zhejiang-january"];
  for (const id of ids) {
    const set = payload(index.entries.find((entry) => entry.id === id));
    const reading = set.sections.find((section) => section.id === "section-reading");
    assert.deepEqual(reading.groups.slice(0, 5).map((group) => group.title), ["第一节 · A", "B", "C", "D", "第二节 七选五"], id);
    assert.equal(reading.groups[0].instructions.length, 1, `${id}: first reading directions`);
    assert.ok(reading.groups.slice(1, 4).every((group) => group.instructions.length === 0), `${id}: repeated reading directions`);
    assert.equal(reading.groups[4].instructions.length, 1, `${id}: seven-choice directions`);
    for (const group of set.sections.flatMap((section) => section.groups)) {
      assert.doesNotMatch(JSON.stringify(group.stimulusBlocks), /(?:第一节|第二节|第三部分).*答题卡指定区域|答题卡指定区域.*(?:第一节|第二节|第三部分)/, `${id}/${group.id}`);
    }
  }

  const beijing = payload(index.entries.find((entry) => entry.id === "paper-2025-beijing"));
  const shortAnswer = beijing.sections.find((section) => section.id === "section-writing").groups.find((group) => group.id === "group-beijing-short-answer");
  const shortAnswerSource = JSON.stringify(shortAnswer.stimulusBlocks);
  assert.doesNotMatch(shortAnswerSource, /第三部分\s*书面表达|第一节\s*[（(]共\s*4\s*小题|答题卡指定区域/);
  assert.match(shortAnswerSource, /There’s something magical about the way imagination works/);

  for (const id of ["paper-2024-new-gaokao-i", "paper-2024-new-gaokao-ii", "paper-2025-new-gaokao-i", "paper-2025-new-gaokao-ii", "paper-2025-zhejiang-january"]) {
    const set = payload(index.entries.find((entry) => entry.id === id));
    const language = set.sections.find((section) => section.id === "section-language");
    const writing = set.sections.find((section) => section.id === "section-writing");
    assert.deepEqual(language.groups.map((group) => group.title), ["第一节 完形填空", "第二节 语法填空"], `${id}: language hierarchy`);
    assert.deepEqual(writing.groups.map((group) => group.title), ["第一节 应用文写作", "第二节 读后续写"], `${id}: writing hierarchy`);
  }
});

test("2025 cloze passage blanks bind to the ordered right-side question numbers", () => {
  for (const id of ["paper-2024-beijing", "paper-2024-new-gaokao-i", "paper-2024-new-gaokao-ii", "paper-2025-beijing", "paper-2025-new-gaokao-i", "paper-2025-new-gaokao-ii", "paper-2025-zhejiang-january"]) {
    const set = payload(index.entries.find((entry) => entry.id === id));
    const groups = set.sections.flatMap((section) => section.groups).filter((group) => typeof group.title === "string" && group.title.endsWith("完形填空"));
    for (const group of groups) {
      const blankRuns = group.stimulusBlocks.flatMap((block) => block.runs || []).filter((run) => run.type === "blank");
      assert.equal(blankRuns.length, group.questions.length, `${id}/${group.id}: blank count`);
      assert.deepEqual(blankRuns.map((run) => run.blankId), group.questions.map((question) => question.blanks[0]?.blankId), `${id}/${group.id}: blank order`);
      assert.doesNotMatch(JSON.stringify(group.stimulusBlocks), /_+\s*\d{1,3}\s*_+/, `${id}/${group.id}: literal source number remains`);
    }
  }

  const nationalTwo = payload(index.entries.find((entry) => entry.id === "paper-2025-new-gaokao-ii"));
  const cloze = nationalTwo.sections.find((section) => section.id === "section-language").groups.find((group) => group.title === "第一节 完形填空");
  assert.deepEqual(cloze.questions.map((question) => question.displayNumber), Array.from({ length: 15 }, (_, index) => index + 21));
});

test("listening sections are published only with a usable audio asset", () => {
  for (const entry of index.entries) {
    const set = payload(entry);
    for (const section of set.sections.filter((item) => item.id.toLowerCase().includes("listening") || item.title.includes("听力"))) {
      const audioAssets = new Set(set.assetRefs.filter((asset) => asset.kind === "audio").map((asset) => asset.assetId));
      const audioBlocks = section.groups.flatMap((group) => group.stimulusBlocks.filter((block) => block.type === "audio"));
      assert.ok(audioBlocks.some((block) => audioAssets.has(block.assetId)), `${entry.id}: listening section has no usable audio`);
    }
  }
  for (const id of ["paper-2025-new-gaokao-i", "paper-2025-new-gaokao-ii", "paper-2025-zhejiang-january"]) {
    const set = payload(index.entries.find((entry) => entry.id === id));
    assert.equal(set.sections.some((section) => section.id.includes("listening")), false, `${id}: missing audio should remove listening section`);
  }
});

test("public assets never expose local source URLs and every local asset exists", () => {
  for (const entry of index.entries) {
    for (const asset of payload(entry).assetRefs) {
      assert.equal(asset.url.startsWith("source://"), false, `${entry.id}: ${asset.assetId}`);
      assert.equal(asset.url.endsWith(".wmf"), false, `${entry.id}: unsupported browser image ${asset.assetId}`);
      if (asset.url.startsWith("/")) {
        const assetPath = path.join(ROOT, "public", asset.url);
        assert.equal(fs.existsSync(assetPath), true, asset.url);
        assert.ok(fs.statSync(assetPath).size > 0, `${entry.id}: empty public asset ${asset.assetId}`);
      }
    }
  }
});

test("published blocks never point at missing media assets", () => {
  const walk = (blocks, setId, currentSet) => {
    for (const block of blocks || []) {
      if (["image", "audio", "video"].includes(block.type)) {
        const asset = currentSet.assetRefs.find((item) => item.assetId === block.assetId);
        assert.ok(asset, `${setId}: ${block.assetId} is not published`);
        assert.equal(asset.url.startsWith("/"), true, `${setId}: ${asset.url}`);
        assert.equal(fs.existsSync(path.join(ROOT, "public", asset.url)), true, `${setId}: ${asset.url}`);
      }
      if (block.type === "table") {
        walk(block.headers, setId, currentSet);
        for (const row of block.rows || []) for (const cell of row.cells || []) walk(cell, setId, currentSet);
      }
      if (block.type === "dialogue") for (const turn of block.turns || []) walk(turn.blocks, setId, currentSet);
    }
  };
  for (const entry of index.entries) {
    const currentSet = payload(entry);
    walk(currentSet.instructions, entry.id, currentSet);
    for (const section of currentSet.sections) {
      walk(section.instructions, entry.id, currentSet);
      for (const group of section.groups) {
        walk(group.instructions, entry.id, currentSet);
        walk(group.stimulusBlocks, entry.id, currentSet);
        for (const option of group.sharedOptions) walk(option.blocks, entry.id, currentSet);
        for (const question of group.questions) {
          walk(question.promptBlocks, entry.id, currentSet);
          walk(question.explanationBlocks, entry.id, currentSet);
          for (const option of question.options) walk(option.blocks, entry.id, currentSet);
        }
      }
    }
  }
});

test("knowledge payload is isolated from paper and practice data", () => {
  const knowledge = JSON.parse(fs.readFileSync(path.join(PUBLIC_ROOT, "knowledge.json"), "utf8"));
  assert.equal(Array.isArray(knowledge.knowledge), true);
  assert.equal(knowledge.knowledge.length, 349);
  assert.equal("practice" in knowledge, false);
  assert.equal("papers" in knowledge, false);
});

test("published practice numbering is continuous and answer coverage remains measurable", () => {
  let questionCount = 0;
  let answeredCount = 0;
  for (const entry of index.entries) {
    const set = payload(entry);
    const questions = set.sections.flatMap((section) => section.groups.flatMap((group) => group.questions)).filter((question) => question.type !== "instruction_only");
    questionCount += questions.length;
    answeredCount += questions.filter((question) => question.answerSpec.availability === "answered").length;
    assert.deepEqual(questions.map((question) => question.displayNumber), questions.map((_, index) => index + 1));
  }
  assert.equal(questionCount, publishReport.totals.questions);
  assert.equal(answeredCount, index.entries.reduce((sum, item) => sum + item.answeredCount, 0));
  assert.ok(questionCount >= 1088);
  assert.ok(answeredCount >= 968);
});

test("published senior-high text does not contain the broken apostrophe glyph", () => {
  for (const entry of index.entries) {
    assert.doesNotMatch(JSON.stringify(payload(entry)), /\u{1001b3}/u, `${entry.id}: broken apostrophe glyph`);
  }
});

test("grammar blanks do not consume passage numbers, years, percentages or other ordinary numerals", () => {
  const entry = index.entries.find((item) => item.id === "practice-5-3-grammar-fill");
  assert.ok(entry);
  const set = payload(entry);
  const groups = set.sections[0].groups;
  assert.deepEqual(groups[0].questions.map((question) => question.sourceQuestionNumber), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.match(groups[1].title, /Passage 2/);
  assert.doesNotMatch(JSON.stringify(groups[1].stimulusBlocks[0]), /Passage 2/);
  const allText = JSON.stringify(set.sections.flatMap((section) => section.groups.flatMap((group) => group.stimulusBlocks)));
  assert.match(allText, /30 years/);
  assert.match(allText, /90 percent/);
});

test("paper questions never use numbered directions or synthetic option placeholders", () => {
  for (const entry of index.entries.filter((item) => item.kind === "paper")) {
    const set = payload(entry);
    const questions = set.sections.flatMap((section) => section.groups.flatMap((group) => group.questions));
    for (const question of questions.filter((item) => item.type === "single_choice")) {
      assert.doesNotMatch(JSON.stringify(question.promptBlocks), /答题前|答卷前/);
      assert.doesNotMatch(JSON.stringify(question.options), /Source option unavailable/);
    }
  }
  const nationalOne = payload(index.entries.find((item) => item.id === "paper-2025-new-gaokao-i"));
  const firstQuestion = nationalOne.sections[0].groups[0].questions[0];
  assert.equal(firstQuestion.sourceQuestionNumber, 21);
  assert.match(JSON.stringify(firstQuestion.promptBlocks), /What percentage of global transport emissions/);
  const nationalTwo = payload(index.entries.find((item) => item.id === "paper-2025-new-gaokao-ii"));
  assert.deepEqual(nationalTwo.sections[0].groups[0].questions[1].options.map((option) => option.label), ["A", "B", "C", "D"]);
  assert.deepEqual(nationalTwo.sections.find((section) => section.id === "section-language").groups.flatMap((group) => group.questions.map((question) => question.sourceQuestionNumber)), Array.from({ length: 25 }, (_, index) => index + 21));
  const reading = nationalOne.sections.find((section) => section.id === "section-reading");
  assert.deepEqual(reading.groups.slice(0, 4).map((group) => group.title), ["第一节 · A", "B", "C", "D"]);
  assert.deepEqual(reading.groups.slice(0, 4).map((group) => group.questions.map((question) => question.sourceQuestionNumber)), [[21, 22, 23], [24, 25, 26, 27], [28, 29, 30, 31], [32, 33, 34, 35]]);
  assert.ok(reading.groups.slice(0, 4).every((group) => group.stimulusBlocks.length > 0));
});
