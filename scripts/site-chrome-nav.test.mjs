import test from "node:test";
import assert from "node:assert/strict";
import {
  ensureCompleteExamMenu,
  ensureJuniorHighExamLink,
  ensureJuniorHighExamMenu,
} from "../src/lib/content/site-chrome-nav.ts";

test("published exam menu keeps the junior-high link when an older config omits it", () => {
  const source = [
    { id: "ielts", label: "雅思", children: [] },
    { id: "other-exams", label: "其他考试正在开发中", children: [] },
  ];
  const juniorHigh = { id: "junior-high-english", label: "中考英语", href: "/junior-high", children: [] };

  const merged = ensureJuniorHighExamLink(source, juniorHigh);

  assert.deepEqual(merged.map((item) => item.id), ["ielts", "other-exams", "junior-high-english"]);
  assert.equal(merged.at(-1)?.href, "/junior-high");
});

test("published nav restores the language-exam menu when an older config omits it", () => {
  const source = [{ id: "ielts", label: "雅思", children: [] }];
  const juniorHigh = {
    id: "junior-high-english",
    label: "中考英语",
    href: "/junior-high",
    children: [],
  };
  const exams = {
    id: "exams",
    label: "语言考试",
    children: [],
  };

  const merged = ensureJuniorHighExamMenu(source, exams, juniorHigh);

  assert.equal(merged.at(-1)?.id, "exams");
  assert.equal(merged.at(-1)?.label, "语言考试");
  assert.equal(merged.at(-1)?.children.at(-1)?.href, "/junior-high");
});

test("published nav normalizes an older exam label while preserving its children", () => {
  const source = [{
    id: "exams",
    label: "英语考试",
    children: [{ id: "ielts", label: "雅思", children: [] }],
  }];
  const exams = { id: "exams", label: "语言考试", children: [] };
  const juniorHigh = { id: "junior-high-english", label: "中考英语", href: "/junior-high", children: [] };

  const merged = ensureJuniorHighExamMenu(source, exams, juniorHigh);

  assert.equal(merged[0].label, "语言考试");
  assert.deepEqual(merged[0].children.map((item) => item.id), ["ielts", "junior-high-english"]);
});

test("published language-exam menu restores every missing exam group", () => {
  const source = [{
    id: "exams",
    label: "英语考试",
    enabled: false,
    children: [{ id: "ielts", label: "雅思", enabled: true, children: [] }],
  }];
  const exams = {
    id: "exams",
    label: "语言考试",
    enabled: true,
    children: [
      { id: "ielts", label: "雅思", enabled: true, children: [] },
      { id: "junior-high-english", label: "中考英语", enabled: true, children: [] },
      { id: "senior-high-english", label: "高考英语", enabled: true, children: [] },
      { id: "sat-reading-writing", label: "SAT Reading and Writing", enabled: true, children: [] },
    ],
  };

  const merged = ensureCompleteExamMenu(source, exams);

  assert.equal(merged[0].enabled, true);
  assert.equal(merged[0].label, "语言考试");
  assert.deepEqual(
    merged[0].children.map((item) => item.id),
    ["ielts", "junior-high-english", "senior-high-english", "sat-reading-writing"],
  );
});
