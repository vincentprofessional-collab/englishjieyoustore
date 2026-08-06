import test from "node:test";
import assert from "node:assert/strict";
import { ensureJuniorHighExamLink } from "../src/lib/content/site-chrome-nav.ts";

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
