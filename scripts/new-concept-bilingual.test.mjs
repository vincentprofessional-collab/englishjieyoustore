import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { alignNewConceptParagraph } from "../src/lib/new-concept-bilingual.ts";

const bookTwo = JSON.parse(fs.readFileSync(new URL("../src/data/new-concept/level-2.json", import.meta.url), "utf8"));

test("New Concept 2 Lesson 66 aligns Chinese sentence endings to English sentences", () => {
  const lesson = bookTwo.lessons.find((item) => item.lessonNo === 66);
  assert.ok(lesson);

  const aligned = alignNewConceptParagraph(lesson.english, lesson.fullChineseTranslation, lesson.lessonNo);
  assert.equal(aligned.length, lesson.english.length);
  assert.match(aligned[0], /距离群岛还有很长一段距离。$/);
  assert.match(aligned[1], /^飞机损坏的程度并不严重/);
  assert.match(aligned.at(-1), /蜂蜡将它完好地保存了下来。$/);
  assert.equal(aligned.join(""), lesson.fullChineseTranslation);
});
