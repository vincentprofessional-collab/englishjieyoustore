import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getFullRecordingWordStartMs, getListeningAnswerBatchRange } from "../src/lib/vocabulary/listening-answer-batches.ts";

const data = JSON.parse(readFileSync(new URL("../src/data/vocabulary/ielts-listening-answer-words.json", import.meta.url), "utf8"));
const expected = { core346: [346, 35], answers683: [662, 67], numbers208: [208, 21] };

test("listening spelling batches cover each deck in ordered groups of ten", () => {
  for (const deck of data.decks) {
    const [wordCount, groupCount] = expected[deck.id];
    assert.equal(deck.words.length, wordCount, `${deck.id} word count`);
    assert.equal(Math.ceil(deck.words.length / 10), groupCount, `${deck.id} group count`);

    let previousWordEnd = 0;
    for (const word of deck.words) {
      const start = getFullRecordingWordStartMs(deck.id, word);
      const end = start + word.audioEndMs - word.audioStartMs;
      assert.ok(Number.isFinite(start) && end > start, `${deck.id}:${word.id} has a valid time range`);
      assert.ok(start >= previousWordEnd, `${deck.id}:${word.id} follows the previous word`);
      previousWordEnd = end;
    }

    let previousBatchEnd = 0;
    for (let groupIndex = 0; groupIndex < groupCount; groupIndex += 1) {
      const batch = getListeningAnswerBatchRange(deck.id, deck.words, groupIndex);
      const expectedStart = groupIndex * 10;
      const expectedSize = Math.min(10, deck.words.length - expectedStart);
      assert.ok(batch, `${deck.id} group ${groupIndex + 1} exists`);
      assert.equal(batch.startWordIndex, expectedStart);
      assert.equal(batch.words.length, expectedSize);
      assert.ok(batch.endMs > batch.startMs);
      assert.ok(batch.startMs >= previousBatchEnd, `${deck.id} group ${groupIndex + 1} follows the previous group`);
      previousBatchEnd = batch.endMs;
    }

    assert.equal(getListeningAnswerBatchRange(deck.id, deck.words, groupCount), null);
  }
});
