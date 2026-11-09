import assert from "node:assert/strict";
import test from "node:test";
import { parseBbcSubtitleCues, alignBbcSubtitleSentences } from "../src/lib/articles/bbc-subtitle-alignment.ts";

test("bilingual LRC assigns complete English lines, keeps repeated cues in order, and never joins cues", () => {
  const duration = 15;
  const cues = parseBbcSubtitleCues(`[00:02.00]WHY DON’T I LIKE ROLLERCOASTERS ANYMORE? 为什么我不再喜欢坐过山车了？
[00:05.00]仅中文
[00:06.00]Hello.
[00:08.00]Hello.
[00:10.00]I will
[00:12.00]not match.`, duration);
  const sentences = ["Why don't I like rollercoasters anymore?", "Hello.", "Hello.", "I will not match."].map((english, index) => ({ english, sentenceNo: index + 1 }));
  const result = alignBbcSubtitleSentences(sentences, cues, duration);
  assert.deepEqual(result.timings, [
    { sentenceNo: 1, startMs: 2000, endMs: 5000 },
    { sentenceNo: 2, startMs: 6000, endMs: 8000 },
    { sentenceNo: 3, startMs: 8000, endMs: 10000 },
  ]);
  assert.deepEqual(result.reviewSentenceNos, [4]);
});

test("SRT explicit end timestamps preserve a gap between clips", () => {
  const cues = parseBbcSubtitleCues(`1
00:00:01,250 --> 00:00:02,400
A complete sentence.
一个完整句子。

2
00:00:04,000 --> 00:00:05,750
Another sentence.
另一个句子。`);
  const { timings } = alignBbcSubtitleSentences([{ sentenceNo: 1, english: "A complete sentence." }, { sentenceNo: 2, english: "Another sentence." }], cues, 6);
  assert.deepEqual(timings, [{ sentenceNo: 1, startMs: 1250, endMs: 2400 }, { sentenceNo: 2, startMs: 4000, endMs: 5750 }]);
});
