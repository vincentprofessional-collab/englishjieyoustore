import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  applyEnglishCorrections,
  buildSectionAudioTranscriptReview,
  parseSrt,
} from "../listening-review-lib.mjs";

test("parseSrt returns numbered cues with millisecond timings", () => {
  const cues = parseSrt(`
1
00:02:33,000 --> 00:02:37,500
Good afternoon, Dreamtime Travel.

2
00:02:37,500 --> 00:02:40,000
How can I help you?
`);

  assert.deepEqual(cues, [
    {
      cueNo: 1,
      englishText: "Good afternoon, Dreamtime Travel.",
      startMs: 153000,
      endMs: 157500,
    },
    {
      cueNo: 2,
      englishText: "How can I help you?",
      startMs: 157500,
      endMs: 160000,
    },
  ]);
});

test("applyEnglishCorrections marks changed cues and answer links", () => {
  const rows = applyEnglishCorrections(
    [
      { cueNo: 1, englishText: "Was it Wales?", startMs: 0, endMs: 1000 },
      { cueNo: 2, englishText: "Actually, it's by minibass.", startMs: 1000, endMs: 2000 },
    ],
    {
      1: "Was it whales?",
      2: "Actually, it's by minibus.",
    },
    {
      2: [1],
    },
  );

  assert.equal(rows[0].reviewEnglishText, "Was it whales?");
  assert.equal(rows[0].changedFromSrt, true);
  assert.equal(rows[1].answerQuestionNos.join(","), "1");
  assert.equal(rows[1].needsHumanReview, false);
});

test("buildSectionAudioTranscriptReview reports missing small audio files", () => {
  const fixtureRoot = mkdtempSync(path.join(tmpdir(), "listening-review-"));
  const smallAudioDir = path.join(fixtureRoot, "small-audio");
  const srtPath = path.join(fixtureRoot, "section.srt");

  writeFileSync(
    srtPath,
    `1
00:00:00,000 --> 00:00:01,000
One.

2
00:00:01,000 --> 00:00:02,000
Two.
`,
  );

  const review = buildSectionAudioTranscriptReview({
    answerCueMap: {},
    corrections: {},
    fullAudioPath: path.join(fixtureRoot, "full.mp3"),
    smallAudioDir,
    srtPath,
    title: "Fixture",
  });

  assert.equal(review.summary.cueCount, 2);
  assert.equal(review.summary.smallAudioCount, 0);
  assert.equal(review.summary.missingSmallAudioCount, 2);
  assert.equal(review.items[0].smallAudio.exists, false);
});
