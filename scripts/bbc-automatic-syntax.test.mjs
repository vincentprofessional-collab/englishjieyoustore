import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { parsePastedBbcSyntaxBlock, applyPastedBbcSyntax, retainReviewedBbcSyntax } from "../src/lib/articles/bbc-pasted-syntax.ts";
import { normalizeBbcSyntaxSentenceEdits } from "../src/lib/bbc-syntax-annotation-edits.ts";
import { serializeBbcArticlePaste } from "../src/lib/articles/bbc-paste-markup.ts";
import referenceData from "../src/data/bbc/2026-syntax.json" with { type: "json" };
import { buildAutomaticBbcSyntax } from "../src/lib/articles/bbc-automatic-syntax.ts";

function spans(data, level) {
  return data[`level${level}`].map(({ label, start, end }) => ({
    label,
    text: data.tokens.slice(start, end).map((token) => token.text).join(" "),
  }));
}

test("keeps all reviewed annotations from the three July BBC articles unchanged", () => {
  let checked = 0;
  for (const id of ["260713", "260720", "260727"]) {
    for (const reference of referenceData[id]) {
      assert.deepEqual(buildAutomaticBbcSyntax(reference.text), reference, `${id}: ${reference.text}`);
      checked += 1;
    }
  }
  assert.equal(checked, 64);
});

test("labels inverted questions and embedded wh clauses", () => {
  const result = buildAutomaticBbcSyntax("Could you tell me where the station is?");
  assert.equal(result.status, "draft");
  assert.deepEqual(spans(result, 1), [
    { label: "谓语", text: "Could" },
    { label: "主语", text: "you" },
    { label: "谓语", text: "tell" },
    { label: "宾语", text: "me" },
    { label: "地点状语从句", text: "where the station is" },
  ]);
  assert.deepEqual(spans(result, 2), [
    { label: "主语", text: "the station" },
    { label: "谓语", text: "is" },
  ]);
});

test("handles restrictive and parenthetical relative clauses", () => {
  const restrictive = buildAutomaticBbcSyntax("The book that I bought yesterday is expensive.");
  assert.deepEqual(spans(restrictive, 1), [
    { label: "主语", text: "The book that I bought yesterday" },
    { label: "谓语", text: "is" },
    { label: "表语", text: "expensive" },
  ]);
  assert.deepEqual(spans(restrictive, 2), [{ label: "定语从句", text: "that I bought yesterday" }]);
  assert.deepEqual(spans(restrictive, 3), [
    { label: "主语", text: "I" },
    { label: "谓语", text: "bought" },
    { label: "状语", text: "yesterday" },
  ]);

  const parenthetical = buildAutomaticBbcSyntax("The museum, which opened last year, attracts many visitors.");
  assert.deepEqual(spans(parenthetical, 1), [
    { label: "主语", text: "The museum , which opened last year" },
    { label: "谓语", text: "attracts" },
    { label: "宾语", text: "many visitors" },
  ]);
  assert.deepEqual(spans(parenthetical, 2), [{ label: "定语从句", text: "which opened last year" }]);
  assert.deepEqual(spans(parenthetical, 3), [
    { label: "主语", text: "which" },
    { label: "谓语", text: "opened" },
    { label: "状语", text: "last year" },
  ]);

  const progressive = buildAutomaticBbcSyntax("I saw the man who was carrying a bag.");
  assert.deepEqual(spans(progressive, 3), [
    { label: "主语", text: "who" },
    { label: "谓语", text: "was carrying" },
    { label: "宾语", text: "a bag" },
  ]);
});

test("does not mistake a wh question for a subordinate clause", () => {
  const result = buildAutomaticBbcSyntax("Where does the tour start?");
  assert.deepEqual(spans(result, 1), [
    { label: "状语", text: "Where" },
    { label: "谓语", text: "does" },
    { label: "主语", text: "the tour" },
    { label: "谓语", text: "start" },
  ]);
});

test("keeps generated token offsets aligned to the original text", () => {
  const result = buildAutomaticBbcSyntax("There is a bus that leaves every hour.");
  for (const token of result.tokens) assert.equal(result.text.slice(token.start, token.end), token.text);
  assert.equal(result.status, "draft");
  assert.deepEqual(spans(result, 2), [{ label: "定语从句", text: "that leaves every hour" }]);
});

const numberedSource = readFileSync(new URL("./fixtures/bbc-numbered-syntax-260810.txt", import.meta.url), "utf8");
const numberedAnnotations = parsePastedBbcSyntaxBlock(numberedSource).sentences;
const numberedAutomatic = numberedAnnotations.map((annotation) => buildAutomaticBbcSyntax(annotation.text));
const numberedReviewed = numberedAutomatic.map((sentence, index) => applyPastedBbcSyntax(sentence, numberedAnnotations, index + 1));

test("Markdown sentence headings import all 23 supplied POS and component annotations", () => {
  const input = readFileSync(new URL("./fixtures/bbc-paste-260817.txt", import.meta.url), "utf8");
  const parsed = parsePastedBbcSyntaxBlock(input);
  assert.equal(parsed.sentences.length, 23);
  assert.ok(!parsed.articleText.includes("句子成分："));
  for (const annotation of parsed.sentences) {
    const result = applyPastedBbcSyntax(buildAutomaticBbcSyntax(annotation.text), parsed.sentences, annotation.sentenceNo);
    assert.equal(result.status, "reviewed");
    assert.ok(result.sourceAnnotation.startsWith(`## ${annotation.sentenceNo}.`));
    assert.ok(result.tokens.every((token) => token.pos === "PUNCT" || token.posLabel));
    assert.ok(result.level1.length > 0);
  }
});

test("all 21 teacher-authored numbered BBC sentences retain POS, clauses, contractions and explicit omissions", () => {
  assert.equal(numberedReviewed.length, 21);
  for (const [index, sentence] of numberedReviewed.entries()) {
    assert.equal(sentence.status, "reviewed");
    assert.ok(sentence.sourceAnnotation.startsWith(`${index + 1}.`));
    assert.ok(sentence.tokens.every((token) => token.pos === "PUNCT" || token.posLabel));
  }
  assert.equal(numberedReviewed[1].tokens.find((token) => token.text === "releasing").posLabel, "动名词");
  assert.equal(numberedReviewed[2].tokens.find((token) => token.text === "Latin").pos, "ADJ");
  assert.equal(numberedReviewed[7].tokens.find((token) => token.text === "only").pos, "ADJ");
  assert.ok(numberedReviewed[9].notes.includes("省略主语：they"));
  assert.deepEqual(numberedReviewed[20].level1, []);
  assert.deepEqual(numberedReviewed[20].notes, ["省略主语：I"]);
  assert.ok(normalizeBbcSyntaxSentenceEdits(numberedReviewed, numberedAutomatic), "all nested spans must be valid and contained by their authored parent");
  assert.ok(spans(numberedReviewed[11], 1).some((span) => span.label === "主语" && span.text === "you"));
  assert.ok(spans(numberedReviewed[15], 3).some((span) => span.label === "主语" && span.text === "predators"));
});

test("BBC edit clipboard round-trips every authored sentence and vocabulary-only edits retain reviewed annotations", () => {
  const text = serializeBbcArticlePaste({ id: "260810", title: "The art of farts", body: [numberedAutomatic[0].text], chineseParagraphs: ["测试翻译。"], syntaxSentences: numberedReviewed, vocabulary: [] });
  const parsed = parsePastedBbcSyntaxBlock(text);
  assert.equal(parsed.sentences.length, 21);
  assert.ok(!parsed.articleText.includes("主干"));
  assert.deepEqual(parsed.sentences.map((item) => item.items), numberedAnnotations.map((item) => item.items));
  assert.deepEqual(retainReviewedBbcSyntax(numberedAutomatic, numberedReviewed), numberedReviewed);
  const changed = { ...numberedAutomatic[0], text: "Different source sentence." };
  assert.equal(retainReviewedBbcSyntax([changed], numberedReviewed)[0], changed);
  const explicit = { ...numberedReviewed[0], level1: [] };
  assert.equal(retainReviewedBbcSyntax([explicit], numberedReviewed)[0], explicit);
});

test("numbered BBC annotations reject mismatched or missing words rather than silently publishing automatic syntax", () => {
  const mismatched = { ...numberedAnnotations[0], items: [{ term: "missingword", description: "名词" }] };
  assert.throws(() => applyPastedBbcSyntax(numberedAutomatic[0], [mismatched], 1), /无法匹配原句/);
  const incomplete = { ...numberedAnnotations[0], items: numberedAnnotations[0].items.slice(0, -1) };
  assert.throws(() => applyPastedBbcSyntax(numberedAutomatic[0], [incomplete], 1), /标注不完整/);
});
