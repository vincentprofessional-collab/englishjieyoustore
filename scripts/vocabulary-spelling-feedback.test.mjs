import assert from "node:assert/strict";
import test from "node:test";
import { getSpellingCharacterFeedback } from "../src/lib/vocabulary/spelling-feedback.ts";

test("拼写逐位比较；多出的字母全部标红，不会移动后续匹配", () => {
  const feedback = getSpellingCharacterFeedback("abcdefxyz", "abcdef");
  assert.deepEqual(feedback.map(({ correct }) => correct), [true, true, true, true, true, true, false, false, false]);
});

test("首位错误只标红该位置，后续位置仍按各自下标比较", () => {
  const feedback = getSpellingCharacterFeedback("xbcdef", "abcdef");
  assert.deepEqual(feedback.map(({ correct }) => correct), [false, true, true, true, true, true]);
});

test("提交后将未输入的正确词尾部显示为红色", () => {
  const feedback = getSpellingCharacterFeedback("abc", "abcdef", true);
  assert.deepEqual(feedback.map(({ letter, correct }) => [letter, correct]), [
    ["a", true], ["b", true], ["c", true], ["d", false], ["e", false], ["f", false],
  ]);
});
