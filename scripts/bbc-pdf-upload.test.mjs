import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";
import * as parser from "../src/lib/articles/bbc-pdf-quiz-parser.mjs";
const require = createRequire(import.meta.url);
function loadTs(path, dependencies) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(new URL(path, import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  vm.runInNewContext(code, { exports, require: (name) => name in dependencies ? dependencies[name] : require(name) });
  return exports;
}
const schema = loadTs("../src/lib/articles/bbc-quiz.ts", {});
const importer = loadTs("../src/lib/admin/bbc-pdf-import.ts", { "@/lib/articles/bbc-quiz": schema, "@/lib/articles/bbc-pdf-quiz-parser.mjs": parser });
const fixture = JSON.parse(fs.readFileSync(new URL("./fixtures/bbc-pdf-260727.json", import.meta.url)));
const catalog = JSON.parse(fs.readFileSync(new URL("../src/data/bbc/quiz-index.json", import.meta.url)));
function imported() { return importer.parseBbcPdfQuiz(fixture.pages, fixture.source, "260727", "How to cope with disappointment"); }

test("the actual 260824 PDF preserves all 11 source questions, including its summary choice", () => {
  const actual = JSON.parse(fs.readFileSync(new URL("./fixtures/bbc-pdf-260824.json", import.meta.url)));
  const quiz = importer.parseBbcPdfQuiz(actual.pages, actual.source, "260824", "How seasons affect our moods");
  assert.equal(quiz.status, "ready");
  assert.deepEqual([quiz.summary.length, quiz.matching.length, quiz.quiz.length, quiz.exercise.length], [1, 0, 5, 5]);
  assert.equal(quiz.summary[0].answer, "How we feel may change depending on the season.");
  assert.deepEqual([...quiz.quiz.map(q => q.answer)], ["autumn", "True", "dopamine", "they feel overwhelmed by spring and summer.", "True"]);
  assert.deepEqual([...quiz.exercise.map(q => q.answer)], ["fluctuate", "triggers", "boost", "cosy", "regulate"]);
  assert.deepEqual([...quiz.exercise[0].options], ["balmy", "boost", "cosy", "fluctuate", "recalibrates", "regulate", "triggers"]);
  assert.equal(typeof schema.normalizeBbcPdfQuiz(quiz, "260824", "How seasons affect our moods", 5), "object");
  quiz.summary[0].answer = "";
  assert.equal(typeof schema.normalizeBbcPdfQuiz(quiz, "260824", "title", 5), "string", "a missing summary answer blocks publication");
});

test("the original 260727 PDF yields the same 15 prompts and source answers as the reviewed catalog", () => {
  const quiz = imported(), expected = catalog.find(record => record.articleId === "260727");
  for (const kind of ["matching", "quiz", "exercise"]) {
    assert.equal(quiz[kind].length, expected[kind].length);
    for (let index = 0; index < expected[kind].length; index++) {
      assert.equal(quiz[kind][index].answer, expected[kind][index].answer, `${kind} answer ${index + 1}`);
      assert.equal(quiz[kind][index].prompt, expected[kind][index].prompt, `${kind} prompt ${index + 1}`);
      assert.deepEqual([...quiz[kind][index].options], expected[kind][index].options);
    }
  }
  assert.equal(quiz.source.questionPage, 2); assert.equal(quiz.source.answerPage, 5);
  assert.equal(quiz.source.pdfSha256, "6ff3b108811a508a569c51efc5a8044fcaebc285ddef28903e8b5c11f693b58d");
});

test("missing or out-of-range paragraph answers cannot be labelled ready by the client", () => {
  const quiz = imported(); quiz.status = "ready";
  const issues = schema.getBbcPdfQuizIssues(quiz, 4);
  assert.ok(issues.some(issue => issue.includes("缺少答案")));
  assert.ok(issues.some(issue => issue.includes("正文只有 4 段")));
  assert.equal(typeof schema.normalizeBbcPdfQuiz(quiz, "260727", "title", 4), "string");
  quiz.matching = quiz.matching.filter(question => question.number <= 4);
  const normalized = schema.normalizeBbcPdfQuiz(quiz, "260727", "title", 4);
  assert.equal(normalized.status, "ready"); assert.equal(normalized.matching.length, 4);
});

test("explicit letter keys work without bold fonts and regular answer words are never treated as letters", () => {
  const pages = JSON.parse(JSON.stringify(fixture.pages));
  for (const line of pages[4].lines) line.bold = "";
  const quiz = importer.parseBbcPdfQuiz(pages, fixture.source, "260727", "title");
  assert.deepEqual([...quiz.quiz.map(question => question.answer)], ["disappointment", "False", "True", "They create an imagined future that may never happen.", "Not given"]);
  assert.equal(parser.resolveChoiceAnswer({ options: ["boat", "baby"], prompt: "?", number: 1 }, "boat"), "boat");
});

test("PDF sections support a variable number of questions and keep wrapped answer explanations out of the key", () => {
  const lines = ["Quiz", "1. First question?", "a. Yes", "b. No", "2. Second question?", "a. True", "b. False", "Exercise", "1. A ________ day.", "sunny    cloudy    rainy    windy", "2. An ________ night.", "early    old    late    new"];
  const sequences = parser.findQuestionSequences(lines);
  assert.deepEqual(sequences.map(sequence => sequence.length), [2, 2]);
  const answers = parser.parseAnswerGroupsWithoutHeadings([{ full: "1. a. This is a detailed explanation.", bold: "a This is a detailed explanation" }, { full: "2. b. False, because it is the second choice.", bold: "b False" }], [parser.parseQuestionGroup(lines, sequences[0], false, 7)]);
  assert.deepEqual(answers[0].map(answer => answer.answer), ["a.", "b."]);
});

test("uploaded exercise validation rejects invalid source hashes, oversized payloads and stale answers", () => {
  const quiz = imported(); quiz.matching = quiz.matching.slice(0, 4);
  for (const mutate of [q => q.source.pdfSha256 = "bad", q => q.source.answerPage = 81, q => q.quiz[0].answer = "invented", q => q.quiz[0].options.push(q.quiz[0].options[0]), q => q.exercise[0].prompt = "no blank", q => q.quiz[0].prompt = "x".repeat(6001)]) {
    const changed = JSON.parse(JSON.stringify(quiz)); mutate(changed);
    assert.equal(typeof schema.normalizeBbcPdfQuiz(changed, "260727", "title", 4), "string");
  }
});

test("uploaded quizzes reuse the real frontend practice and paragraph gist components", () => {
  const jsx = (type, props) => ({ type, props });
  const component = loadTs("../src/components/bbc-article-quiz.tsx", {
    react: { useState: () => [] }, "react/jsx-runtime": { jsx, jsxs: jsx }, "@/data/bbc/quiz-index.json": catalog,
    "@/lib/bbc-quiz-favorites": {}, "@/lib/learning/site-progress": {}, "./bbc-article-quiz.module.css": {},
  });
  const quiz = imported(); quiz.matching = quiz.matching.slice(0, 4);
  const ready = schema.normalizeBbcPdfQuiz(quiz, "261001", "Uploaded title", 4);
  const gists = component.getBbcArticleMatchingParagraphGists("261001", ready);
  assert.equal(gists[1], "What is disappointment?"); assert.equal(gists[4], "Don't blame yourself or others");
  assert.ok(component.BbcArticleQuiz({ articleId: "261001", uploadedQuiz: ready }));
  assert.equal(component.BbcArticleQuiz({ articleId: "261002", uploadedQuiz: ready }), null, "a different article must not reuse these questions");
});

test("wrapped PDF options stay complete and missing option letters are flagged", () => {
  const lines = ["1. Why?", "a. First", "continued over a second line.", "b. Second", "2. When?", "a. Now", "c. Later"];
  const questions = parser.parseQuestionGroup(lines, parser.findQuestionSequences(lines)[0], false);
  assert.deepEqual(questions[0].options, ["First continued over a second line.", "Second"]);
  assert.deepEqual(questions[1].options, ["Now", "", "Later"]);
  const issues = schema.getBbcPdfQuizIssues({ matching: [], exercise: [], quiz: questions.map(question => ({ ...question, answer: question.options[0] })), status: "ready", articleId: "1", articleTitle: "test" });
  assert.ok(issues.some(issue => issue.includes("选项缺漏")));
});

test("the real admin save boundary preserves, replaces and explicitly removes a PDF quiz", async () => {
  const route = ts.createSourceFile("route.ts", fs.readFileSync(new URL("../src/app/api/admin/bbc-articles/route.ts", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
  const put = route.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "PUT");
  const post = route.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "POST");
  assert.ok(put && post);
  const code = ts.transpileModule([put, post].map(node => node.getText(route).replace(/^export\s+/, "")).join("\n"), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const parsed = imported(); parsed.matching = parsed.matching.slice(0, 4);
  const previous = schema.normalizeBbcPdfQuiz(parsed, "261001", "previous", 4);
  for (const action of ["preserve", "replace", "remove", "invalid"]) {
    const saved = [];
    const replacement = JSON.parse(JSON.stringify(parsed));
    if (action === "invalid") replacement.quiz[0].answer = "";
    const article = { id: "261001", year: 2026, title: "title", body: ["one", "two", "three", "four"], sentences: [1, 2].map(sentenceNo => ({ sentenceNo })), syntaxSentences: [] };
    const database = {
      from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { article: { ...article, quiz: previous }, published: false, created_at: "2026-10-01" } }) }) }),
        upsert: async record => { saved.push(record); return {}; } }),
    };
    const context = vm.createContext({
      createServiceClient: () => database, requireAdmin: async () => ({ user: { id: "fixture-admin" } }),
      parseBbcArticleDateFromTitle: () => ({ id: "261001", year: 2026, month: 10 }), getBbcArticleById: () => null,
      buildArticle: () => structuredClone(article), hasR2Object: async () => true, retainReviewedBbcSyntax: sentences => sentences,
      normalizeBbcPdfQuiz: schema.normalizeBbcPdfQuiz, revalidatePath() {}, NextResponse: { json: (data, options) => ({ data, status: options?.status ?? 200 }) },
      parseBbcArticlePaste: () => ({ title: "261001-title", syntaxAnnotations: [] }),
    });
    vm.runInContext(code, context);
    const input = { title: "261001-title", objectPath: "bbc/2026/261001/full-0123456789abcdef.mp3", durationMs: 4000, timings: [1, 2].map(sentenceNo => ({ sentenceNo, startMs: (sentenceNo - 1) * 2000, endMs: sentenceNo * 2000 })) };
    if (action !== "preserve") input.quiz = action === "remove" ? null : replacement;
    const result = await context.PUT({ json: async () => input });
    assert.equal(result.status, action === "invalid" ? 400 : 200, action);
    assert.equal(saved.length, action === "invalid" ? 0 : 1, action);
    if (action === "preserve") assert.equal(saved[0].article.quiz.articleTitle, "title");
    if (action === "replace") assert.equal(saved[0].article.quiz.articleId, "261001");
    if (action === "remove") assert.equal(saved[0].article.quiz, undefined);
    const preparation = await context.POST({ json: async () => ({ action: "prepare", text: "261001-title", quiz: action === "remove" ? null : replacement }) });
    assert.equal(preparation.status, action === "invalid" ? 400 : 200, `prepare ${action}`);
    if (action === "replace") assert.equal(preparation.data.article.quiz.status, "ready");
  }
});
