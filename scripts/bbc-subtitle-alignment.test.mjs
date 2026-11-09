import assert from "node:assert/strict";
import test from "node:test";
import { parseBbcSubtitleCues, createBbcSubtitleSentenceMatcher } from "../src/lib/articles/bbc-subtitle-alignment.ts";

test("bilingual LRC retains English lines and repeated cues", () => {
  const cues = parseBbcSubtitleCues(`[00:02.00]WHY DON’T I LIKE ROLLERCOASTERS ANYMORE? 为什么我不再喜欢坐过山车了？
[00:05.00]仅中文
[00:06.00]Hello.
[00:08.00]Hello.
[00:10.00]I will
[00:12.00]not match.`);
  assert.deepEqual(cues.map(({ text }) => text), [
    "WHY DON’T I LIKE ROLLERCOASTERS ANYMORE? 为什么我不再喜欢坐过山车了？",
    "Hello.", "Hello.", "I will", "not match.",
  ]);
});

test("SRT cues provide English text for matching written sentences", () => {
  const cues = parseBbcSubtitleCues(`1
00:00:01,250 --> 00:00:02,400
A complete sentence.
一个完整句子。

2
00:00:04,000 --> 00:00:05,750
Another sentence.
另一个句子。`);
  const paragraph = "A complete sentence. Another sentence.";
  const match = createBbcSubtitleSentenceMatcher(cues.map(({ text }) => text));
  assert.deepEqual(match(paragraph).map(({ start, end }) => paragraph.slice(start, end).trim()), [
    "A complete sentence.", "Another sentence.",
  ]);
});

test("subtitle boundaries retain ellipses, dashes, wrapped lines and opening quotes", () => {
  const cues = parseBbcSubtitleCues(`1
00:00:01,250 --> 00:00:04,400
I thought...
it would stop — but it didn’t. 我以为它会停下，但没有。

2
00:00:05,000 --> 00:00:06,750
“Really?”
“真的吗？”`);
  const paragraph = "An unmatched introduction. I thought... it would stop — but it didn't. “Really?”";
  const match = createBbcSubtitleSentenceMatcher(cues.map(({ text }) => text));
  const english = match(paragraph).map(({ start, end }) => paragraph.slice(start, end).trim());
  assert.deepEqual(english, ["I thought... it would stop — but it didn't.", "“Really?”"]);
  assert.deepEqual(match("It would stop — but it didn't."), []);
});
