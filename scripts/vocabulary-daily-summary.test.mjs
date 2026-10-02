import assert from "node:assert/strict";
import test from "node:test";
import { summarizeDailyStudy } from "../src/lib/vocabulary/daily-summary.ts";

test("daily summary counts unique words, latest mode outcomes, task goal, and overall completion", () => {
  const summary = summarizeDailyStudy({
    date: "2026-10-02",
    bookGoals: { CET4: 2 },
    events: [
      { at: 1, book: "CET4", category: "reading", wordId: "one", isReview: false, outcome: "familiar" },
      { at: 2, book: "CET4", category: "reading", wordId: "one", isReview: true, outcome: "vague" },
      { at: 3, book: "CET4", category: "listening", wordId: "one", isReview: true, outcome: "familiar" },
      { at: 4, book: "CET4", category: "writing", wordId: "two", isReview: false, outcome: "unfamiliar" },
    ],
  }, { one: { completed: true }, two: { completed: false } }, 100);

  assert.equal(summary.studiedWords, 2);
  assert.equal(summary.newWords, 2);
  assert.equal(summary.reviewedWords, 1);
  assert.equal(summary.dailyTaskComplete, true);
  assert.equal(summary.completedWords, 1);
  assert.deepEqual(summary.modes, { reading: 1, listening: 1, speaking: 0, writing: 1 });
  assert.deepEqual({ familiar: summary.familiar, vague: summary.vague, unfamiliar: summary.unfamiliar }, {
    familiar: 1, vague: 1, unfamiliar: 1,
  });
  assert.deepEqual(summary.modeOutcomes.reading, { familiar: 0, vague: 1, unfamiliar: 0 });
  assert.deepEqual(summary.modeOutcomes.writing, { familiar: 0, vague: 0, unfamiliar: 1 });
});
