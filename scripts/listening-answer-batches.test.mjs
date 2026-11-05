import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getFullRecordingWordStartMs, getListeningAnswerBatchRange, getNumberAudioClipNumbers, LISTENING_ANSWER_AUDIO_WORDS_PER_CLIP, LISTENING_ANSWER_WORDS_PER_GROUP } from "../src/lib/vocabulary/listening-answer-batches.ts";

const data = JSON.parse(readFileSync(new URL("../src/data/vocabulary/ielts-listening-answer-words.json", import.meta.url), "utf8"));
const expected = { core346: [346, 18], answers683: [662, 34], numbers208: [208, 11] };

test("listening spelling batches cover each deck in ordered groups of twenty", () => {
  for (const deck of data.decks) {
    const [wordCount, groupCount] = expected[deck.id];
    assert.equal(deck.words.length, wordCount, `${deck.id} word count`);
    assert.equal(Math.ceil(deck.words.length / LISTENING_ANSWER_WORDS_PER_GROUP), groupCount, `${deck.id} group count`);

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
      const expectedStart = groupIndex * LISTENING_ANSWER_WORDS_PER_GROUP;
      const expectedSize = Math.min(LISTENING_ANSWER_WORDS_PER_GROUP, deck.words.length - expectedStart);
      assert.ok(batch, `${deck.id} group ${groupIndex + 1} exists`);
      assert.equal(batch.startWordIndex, expectedStart);
      assert.equal(batch.words.length, expectedSize);
      assert.ok(batch.endMs > batch.startMs);
      assert.ok(batch.startMs >= previousBatchEnd, `${deck.id} group ${groupIndex + 1} follows the previous group`);
      previousBatchEnd = batch.endMs;

      if (deck.id === "numbers208") {
        const firstClip = Math.floor(expectedStart / LISTENING_ANSWER_AUDIO_WORDS_PER_CLIP) + 1;
        const lastClip = Math.floor((expectedStart + expectedSize - 1) / LISTENING_ANSWER_AUDIO_WORDS_PER_CLIP) + 1;
        assert.deepEqual(getNumberAudioClipNumbers(batch), Array.from({ length: lastClip - firstClip + 1 }, (_, index) => firstClip + index));
      }
    }

    assert.equal(getListeningAnswerBatchRange(deck.id, deck.words, groupCount), null);
  }
});
