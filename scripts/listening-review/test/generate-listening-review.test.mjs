import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { writeReviewOutput } from "../../generate-listening-review.mjs";

test("writeReviewOutput copies review audio beside the HTML and uses relative audio paths", () => {
  const fixtureRoot = mkdtempSync(path.join(tmpdir(), "review-output-"));
  const sourceAudioPath = path.join(fixtureRoot, "001.mp3");
  const outputDir = path.join(fixtureRoot, "out");
  writeFileSync(sourceAudioPath, "fake audio");

  const result = writeReviewOutput(
    {
      title: "Fixture Review",
      summary: {
        answerCueCount: 1,
        changedEnglishCount: 0,
        cueCount: 1,
        missingSmallAudioCount: 0,
        smallAudioCount: 1,
      },
      items: [
        {
          answerQuestionNos: [1],
          changedFromSrt: false,
          cueNo: 1,
          reviewEnglishText: "One.",
          smallAudio: {
            durationDeltaSeconds: 0,
            exists: true,
            path: sourceAudioPath,
          },
          srtEnglishText: "One.",
          time: {
            end: "00:01.000",
            start: "00:00.000",
          },
        },
      ],
    },
    outputDir,
  );

  const html = readFileSync(result.htmlPath, "utf8");
  assert.match(html, /src="audio\/001\.mp3"/);
  assert.equal(existsSync(path.join(outputDir, "audio", "001.mp3")), true);
});
