import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import {
  EXAM_BY_LEVEL, extractDocumentExamQuestions, extractSatExamQuestions,
  indexExamQuestions, selectExamQuestions, examQuestionKeywords, extractIeltsReadingQuestions,
} from "../src/lib/vocabulary/exam-questions.ts";

const source = { exam: "cet4", title: "2020 四级真题", href: "/cet4/cet4-paper-2020091" };
test("word levels map to one matching exam, without cumulative-book leakage", () => {
  assert.equal(EXAM_BY_LEVEL.高中, "senior");
  assert.equal(EXAM_BY_LEVEL.四级, "cet4");
  assert.equal(EXAM_BY_LEVEL.托雅, "ielts");
  assert.equal(EXAM_BY_LEVEL.小学, undefined);
  assert.equal(EXAM_BY_LEVEL.地道表达, undefined);
});
test("reviewed real CET questions retain their source, word-bank choices and answers; other types stay excluded", () => {
  const paper = JSON.parse(fs.readFileSync(new URL("../public/cet4/papers/cet4-paper-2020091.json", import.meta.url), "utf8"));
  const questions = extractDocumentExamQuestions(paper, source);
  assert.ok(questions.length > 10);
  assert.ok(questions.every(question => ["choice", "fill"].includes(question.type)));
  assert.ok(questions.every(question => question.href === source.href && question.answers.length));
  const cloze = questions.find(question => question.number === "26");
  assert.ok(cloze && cloze.context && cloze.options.length >= 10);
  assert.equal(questions.some(question => question.number === "0"), false);
});
test("a target inside another word does not match; pagination is bounded and never mixes exams", () => {
  assert.equal(examQuestionKeywords("", ["urban"], []).includes("ban"), false);
  const sample = Array.from({ length: 12 }, (_, index) => ({ id: String(index), exam: "cet4", source: "test", href: "/cet4/test", number: String(index), type: "fill", instruction: "", context: "", prompt: "______", options: [], answers: ["ban"], explanation: "", keywords: ["ban"] }));
  const wrongExam = { ...sample[0], id: "wrong-exam", exam: "cet6" };
  const index = indexExamQuestions([...sample, wrongExam]);
  const page = selectExamQuestions(index, ["ban", "BAN"], "cet4", 2);
  assert.equal(page.total, 12);
  assert.equal(page.questions.length, 5);
  assert.equal(page.questions[0].id, "5");
  assert.ok(page.questions.every(question => question.exam === "cet4" && !("keywords" in question)));
  assert.equal(selectExamQuestions(index, ["urban"], "cet4", 1).total, 0);
});
test("pending questions and non-English SAT material are excluded; the quoted target is indexed", () => {
  const paper = JSON.parse(fs.readFileSync(new URL("../public/sat/papers/sat-2023-05-routing.json", import.meta.url), "utf8"));
  const questions = extractSatExamQuestions(paper, { exam: "sat", title: paper.title, href: `/sat/past-papers/${paper.id}` });
  assert.ok(questions.some(question => question.keywords.includes("registered")));
  const pending = structuredClone(paper); pending.questions.forEach(question => { question.reviewStatus = "review_required"; });
  assert.deepEqual(extractSatExamQuestions(pending, { exam: "sat", title: "pending", href: "/sat" }), []);
});
test("IELTS uses verified question text and passage context, excluding placeholders and judgement questions", () => {
  const make = (before, answer, number) => ({ number, before, answer: [answer] });
  const input = [{ id: "cambridge-4-test-1", title: "剑桥雅思4 Test 1", source: { verified: true, answers: {} }, parts: [{ id: "part-1", label: "Part 1", source: { textVerified: true }, sections: [{ paragraphs: ["The original passage discusses isolation."] }], questionBlocks: [{ id: "fill", type: "fill", instruction: "Complete the sentence.", questions: [make("The main concern is", "isolation", 1), make("Question 2", "economic", 2), make("A judgement statement", "FALSE", 3)] }] }] }];
  const rows = extractIeltsReadingQuestions(input);
  assert.equal(rows.length, 1);
  assert.ok(rows[0].context.includes("original passage"));
  assert.equal(rows[0].href, "/reading/practice/cambridge-4-test-1");
  input[0].parts[0].source.textVerified = false;
  assert.deepEqual(extractIeltsReadingQuestions(input), []);
});
