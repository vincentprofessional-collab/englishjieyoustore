import test from "node:test";
import assert from "node:assert/strict";
import {
  ensureCet4ExamMenu,
  ensureCet6ExamMenu,
  ensureJuniorHighExamLink,
  ensureJuniorHighExamMenu,
  orderLanguageExamMenu,
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

test("published nav repairs a CET-4 placeholder that reused the CET-4 id", () => {
  const source = [{
    id: "exams",
    label: "语言考试",
    children: [
      { id: "other-exams", label: "其他考试正在开发中", href: "", children: [] },
      { id: "cet4", label: "其他考试正在开发中", href: "", children: [] },
    ],
  }];
  const exams = { id: "exams", label: "语言考试", children: [] };
  const cet4 = {
    id: "cet4",
    label: "大学英语四级",
    href: "/cet4",
    children: [],
  };

  const merged = ensureCet4ExamMenu(source, exams, cet4);

  assert.deepEqual(merged[0].children.map((item) => item.id), ["cet4"]);
  assert.equal(merged[0].children[0].label, "大学英语四级");
  assert.equal(merged[0].children[0].href, "/cet4");
});

test("published nav adds CET-6 beside CET-4 and removes the stale placeholder", () => {
  const source = [{
    id: "exams",
    label: "语言考试",
    children: [
      { id: "cet4", label: "大学英语四级", href: "/cet4", children: [] },
      { id: "other-exams", label: "其他考试正在开发中", href: "", children: [] },
    ],
  }];
  const exams = { id: "exams", label: "语言考试", children: [] };
  const cet6 = { id: "cet6", label: "大学英语六级", href: "/cet6", children: [] };

  const merged = ensureCet6ExamMenu(source, exams, cet6);

  assert.deepEqual(merged[0].children.map((item) => item.id), ["cet4", "cet6"]);
  assert.equal(merged[0].children[1].href, "/cet6");
});

test("published language-exam menu follows the requested order", () => {
  const source = [
    {
      id: "exams",
      label: "语言考试",
      children: [
        { id: "sat-reading-writing", label: "SAT Reading and Writing", children: [] },
        { id: "ielts", label: "雅思", children: [] },
        { id: "cet6", label: "大学英语六级", children: [] },
        { id: "junior-high-english", label: "中考英语", children: [] },
        { id: "cet4", label: "大学英语四级", children: [] },
        { id: "senior-high-english", label: "高考英语", children: [] },
      ],
    },
  ];

  const ordered = orderLanguageExamMenu(source);

  assert.deepEqual(ordered[0].children.map((item) => item.id), [
    "junior-high-english",
    "senior-high-english",
    "cet4",
    "cet6",
    "ielts",
    "sat-reading-writing",
  ]);
});
