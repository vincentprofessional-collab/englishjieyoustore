import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { DEFAULT_LANGUAGE_EXAM_NAVIGATION, normalizeLanguageExamContent } from "../src/lib/language-exam-content.ts";

const content = JSON.parse(readFileSync(new URL("../data/jiufen/listening-content.json", import.meta.url), "utf8"));
const sections = content.books.flatMap((book) => book.tests.flatMap((exam) => exam.parts));
const questions = sections.flatMap((section) => section.questions ?? []);

test("九分达人 1–8 册的 192 个部分和 1,920 道题均已核实", () => {
  assert.equal(content.books.length, 8);
  assert.equal(sections.length, 192);
  assert.equal(questions.length, 1920);
  assert.ok(sections.every((section) => section.contentStatus === "source_verified"));
  assert.ok(questions.every((question) => question.answerStatus === "source_verified"));
  assert.equal(content.summary.reviewRequiredQuestions, 0);
});

test("九分达人图表题引用的图片资源都存在", () => {
  const imagePaths = new Set(sections.flatMap((section) => section.questionImagePaths ?? []));
  assert.ok(imagePaths.size > 0);
  for (const imagePath of imagePaths) {
    assert.ok(existsSync(new URL(`../public${imagePath}`, import.meta.url)), `missing image: ${imagePath}`);
  }
});

test("保存的考试导航配置会保留并补入九分达人入口", () => {
  const legacyNavigation = JSON.parse(JSON.stringify(DEFAULT_LANGUAGE_EXAM_NAVIGATION));
  const legacyListening = legacyNavigation.find((group) => group.id === "ielts").children.find((node) => node.id === "ielts-listening");
  legacyListening.children = legacyListening.children.filter((node) => node.id !== "ielts-listening-jiufen");
  const existingNavigation = normalizeLanguageExamContent({ navigation: legacyNavigation }).navigation;
  const ielts = existingNavigation.find((group) => group.id === "ielts");
  const listening = ielts?.children.find((node) => node.id === "ielts-listening");
  assert.ok(listening?.children.some((node) => node.id === "ielts-listening-jiufen" && node.href === "/listening/jiufen"));

  const configured = JSON.parse(JSON.stringify(existingNavigation));
  const normalizedAgain = normalizeLanguageExamContent({ navigation: configured }).navigation;
  const normalizedListening = normalizedAgain.find((group) => group.id === "ielts")?.children.find((node) => node.id === "ielts-listening");
  assert.equal(normalizedListening?.children.filter((node) => node.id === "ielts-listening-jiufen").length, 1);
});
