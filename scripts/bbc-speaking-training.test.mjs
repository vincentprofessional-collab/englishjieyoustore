import assert from "node:assert/strict";
import test from "node:test";

import {
  getActiveWordIndex,
  getNextSentenceNo,
  getSpeakingPracticeDelayMs,
  getWordCount,
} from "../src/lib/articles/bbc-speaking-training.mjs";

test("三种口语训练按小音频时长计算练习间隔", () => {
  assert.equal(getSpeakingPracticeDelayMs("imitation", 4.2), 4_200);
  assert.equal(getSpeakingPracticeDelayMs("sight-translation", 4.2), 6_300);
  assert.equal(getSpeakingPracticeDelayMs("shadowing", 4.2), 3_000);
  assert.equal(getSpeakingPracticeDelayMs("none", 4.2), 0);
});

test("顺序播放进入下一句，单句循环重播当前句", () => {
  const sentenceNos = [1, 2, 3];

  assert.equal(getNextSentenceNo(sentenceNos, 2, "sequential"), 3);
  assert.equal(getNextSentenceNo(sentenceNos, 2, "sentence-loop"), 2);
  assert.equal(getNextSentenceNo(sentenceNos, 3, "sequential"), null);
});

test("播放进度按单词位置映射且不会越界", () => {
  const text = "Hello, brave new world!";

  assert.equal(getWordCount(text), 4);
  assert.equal(getActiveWordIndex(text, 0, 4), 0);
  assert.equal(getActiveWordIndex(text, 1.1, 4), 1);
  assert.equal(getActiveWordIndex(text, 3.9, 4), 3);
  assert.equal(getActiveWordIndex(text, 8, 4), 3);
  assert.equal(getWordCount("don't stop—well-known ideas"), 4);
});
