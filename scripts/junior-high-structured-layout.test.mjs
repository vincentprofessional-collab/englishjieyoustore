import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { isExamInstructionTitle, isSectionHeading, normalizeStructuredGroups } from "../src/lib/junior-high/structured-layout.ts";

const paper = JSON.parse(fs.readFileSync(new URL("../src/lib/junior-high/2024-hubei-wuhan-hubei-wuhan.json", import.meta.url), "utf8"));

test("structured paper groups hide duplicate instruction-only blocks and keep section titles with questions", () => {
  const groups = paper.parts[2].groups;
  const renderGroups = normalizeStructuredGroups(groups);

  assert.deepEqual(renderGroups.map((group) => group.title), [
    "二、选择填空（共15小题，每小题1分，满分15分）",
    "三、完形填空（共15小题，每小题1分，满分15分）",
    "四、阅读理解（共15小题，每小题2分，满分30分）",
    "五、词与短语填空（共5小题，每小题2分，满分10分）",
    "六、综合填空（共10小题，每小题1分，满分10分）",
  ]);
  assert.ok(renderGroups.every((group) => group.questionIds.length > 0));
  const cloze = renderGroups.find((group) => group.title.startsWith("三、完形填空"));
  assert.equal(cloze?.questionIds.length, 15);
  assert.ok((cloze?.blocks.length ?? 0) > 0);
});

test("structured titles distinguish section headings from question instructions", () => {
  assert.equal(isSectionHeading("C. 听短文（本题共5小题）"), true);
  assert.equal(isSectionHeading("请通读下面短文，掌握其大意"), false);
  assert.equal(isExamInstructionTitle("在你答题前，请认真阅读下面的注意事项。"), true);
});
